import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
import type { PerfilUsuario } from "@/lib/generated/prisma/client";
import { Prisma } from "@/lib/generated/prisma/client";
import {
  authenticateLdap,
  getLdapDefaultProvisionPerfil,
  isLdapConfigured,
  warnDevIfLdapDisabled,
} from "@/lib/ldap";
import { authLogger } from "@/lib/logger";
import { consumeAttempt, resetAttempts } from "@/lib/rate-limit";
import { revalidateJwtToken } from "@/lib/auth-jwt-callback";
import { buscarLotacaoAtualPorMatricula } from "@/server/queries/sarh";
export { getHomeByPerfil } from "@/lib/profile-home";

class RateLimitError extends CredentialsSignin {
  code = "rate_limit";
}

const LOGIN_RATE_LIMIT = {
  windowMs: 60_000,
  maxAttempts: 5,
  lockoutMs: 10 * 60_000,
} as const;

const IP_LOGIN_RATE_LIMIT = {
  windowMs: 15 * 60_000,
  maxAttempts: 10,
  lockoutMs: 15 * 60_000,
} as const;

// Bypass do rate limit de login apenas em ambiente de teste E2E: a suíte loga
// dezenas de vezes pelo mesmo IP (localhost) e estouraria o limiter por IP.
// Só tem efeito fora de produção e quando explicitamente sinalizado pelo
// webServer do Playwright (E2E_DISABLE_RATE_LIMIT=1). Nunca em prod.
const RATE_LIMIT_DISABLED =
  process.env.NODE_ENV !== "production" &&
  process.env.E2E_DISABLE_RATE_LIMIT === "1";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      matricula: string;
      nome: string;
      perfil: PerfilUsuario;
    };
  }

  interface User {
    matricula: string;
    nome: string;
    perfil: PerfilUsuario;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    matricula: string;
    nome: string;
    perfil: string;
    lastValidatedAt?: number;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    // Sobrescreve o jwt do authConfig (que é edge-compatible, sem Prisma) para revalidar
    // ativo/perfil no DB periodicamente. Roda apenas em runtime Node — o middleware continua
    // usando authConfig.jwt sem essa checagem (ok: invalidação ocorre no próximo hit server-side).
    jwt({ token, user, trigger }) {
      return revalidateJwtToken({
        token,
        user: user ?? undefined,
        trigger,
        revalidate: (id) =>
          prisma.usuario.findUnique({
            where: { id },
            select: { ativo: true, perfil: true, nome: true },
          }),
        onInvalidate: (matricula) =>
          authLogger.info(
            { matricula },
            "sessão invalidada: usuário inativo ou removido",
          ),
      });
    },
  },
  providers: [
    Credentials({
      name: "LDAP",
      credentials: {
        matricula: { label: "Matrícula", type: "text" },
        senha: { label: "Senha", type: "password" },
      },
      async authorize(credentials, request) {
        try {
          const rawMatricula = credentials?.matricula as string | undefined;
          const senha = credentials?.senha as string | undefined;

          if (!rawMatricula || !senha) {
            authLogger.debug("authorize: matricula ou senha vazios");
            return null;
          }

          warnDevIfLdapDisabled();

          const matricula = rawMatricula.trim().toUpperCase();

          const ip =
            request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
            request.headers.get("x-real-ip") ??
            "unknown";

          if (!RATE_LIMIT_DISABLED) {
            const rlIp = consumeAttempt(`login:ip:${ip}`, IP_LOGIN_RATE_LIMIT);
            if (!rlIp.allowed) {
              authLogger.warn(
                { ip, retryAfterMs: rlIp.retryAfterMs },
                "login bloqueado por rate limit de IP",
              );
              throw new RateLimitError();
            }

            const rl = consumeAttempt(`login:${matricula}`, LOGIN_RATE_LIMIT);
            if (!rl.allowed) {
              authLogger.warn(
                { matricula, retryAfterMs: rl.retryAfterMs },
                "login bloqueado por rate limit",
              );
              throw new RateLimitError();
            }
          }

          let ldapDisplayName: string | null = null;

          if (isLdapConfigured()) {
            const ldap = await authenticateLdap(matricula, senha);
            if (!ldap.ok) {
              return null;
            }
            ldapDisplayName = ldap.displayName;
          }

          let usuario = await prisma.usuario.findUnique({
            where: { matricula },
          });

          if (!usuario) {
            if (!isLdapConfigured()) {
              authLogger.warn(
                { matricula },
                "sem LDAP: usuário deve existir na base (seed ou cadastro manual)",
              );
              return null;
            }

            const nome = ldapDisplayName?.trim() || matricula;
            const perfil = getLdapDefaultProvisionPerfil();

            // Tenta obter a lotação atual do SARH para auto-atribuir a unidade.
            // Fire-and-forget para falhas de Oracle — nunca bloqueia o login.
            const lotacaoSarh = await buscarLotacaoAtualPorMatricula(matricula);
            let unidadeIdProvisao: string | undefined;
            if (lotacaoSarh) {
              const unidade = await prisma.unidade.findFirst({
                where: { codigo: String(lotacaoSarh.codLotacao), ativo: true },
                select: { id: true },
              });
              unidadeIdProvisao = unidade?.id;
            }

            try {
              usuario = await prisma.usuario.create({
                data: {
                  matricula,
                  nome,
                  perfil,
                  ativo: true,
                  ...(unidadeIdProvisao ? { unidadeId: unidadeIdProvisao } : {}),
                },
              });
              authLogger.info(
                { matricula, perfil, unidadeId: unidadeIdProvisao ?? null },
                "usuario provisionado no primeiro login",
              );
            } catch (e) {
              if (
                e instanceof Prisma.PrismaClientKnownRequestError &&
                e.code === "P2002"
              ) {
                usuario = await prisma.usuario.findUnique({
                  where: { matricula },
                });
              } else {
                authLogger.error({ err: e }, "erro ao provisionar usuario");
                return null;
              }
            }
          }

          if (!usuario) {
            return null;
          }

          if (!usuario.ativo) {
            authLogger.warn({ matricula }, "usuário existe mas está inativo");
            return null;
          }

          resetAttempts(`login:${matricula}`);

          return {
            id: usuario.id,
            email: `${usuario.matricula}@jfap.jus.br`,
            emailVerified: null,
            matricula: usuario.matricula,
            nome: usuario.nome,
            perfil: usuario.perfil,
          };
        } catch (error) {
          authLogger.error({ err: error }, "erro no authorize");
          return null;
        }
      },
    }),
  ],
});
