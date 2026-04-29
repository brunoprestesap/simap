import NextAuth from "next-auth";
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
export { getHomeByPerfil } from "@/lib/profile-home";

const LOGIN_RATE_LIMIT = {
  windowMs: 60_000,
  maxAttempts: 5,
  lockoutMs: 10 * 60_000,
} as const;

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

// Intervalo entre re-validações do usuário no banco (ativo / perfil) durante a vida do JWT.
// Curto o suficiente para que desativação/troca de perfil tenha efeito sem aguardar expiração
// completa do token; longo o suficiente para não bombardear o DB a cada request autenticado.
const JWT_REVALIDATE_MS = 5 * 60_000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    // Sobrescreve o jwt do authConfig (que é edge-compatible, sem Prisma) para revalidar
    // ativo/perfil no DB periodicamente. Roda apenas em runtime Node — o middleware continua
    // usando authConfig.jwt sem essa checagem (ok: invalidação ocorre no próximo hit server-side).
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id!;
        token.matricula = (user as unknown as { matricula: string }).matricula;
        token.nome = (user as unknown as { nome: string }).nome;
        token.perfil = (user as unknown as { perfil: string }).perfil;
        token.lastValidatedAt = Date.now();
        return token;
      }

      const now = Date.now();
      const since = token.lastValidatedAt ?? 0;
      if (trigger !== "update" && now - since < JWT_REVALIDATE_MS) {
        return token;
      }

      const u = await prisma.usuario.findUnique({
        where: { id: token.id },
        select: { ativo: true, perfil: true, nome: true },
      });

      if (!u || !u.ativo) {
        authLogger.info(
          { matricula: token.matricula },
          "sessão invalidada: usuário inativo ou removido",
        );
        return null;
      }

      token.perfil = u.perfil;
      token.nome = u.nome;
      token.lastValidatedAt = now;
      return token;
    },
  },
  providers: [
    Credentials({
      name: "LDAP",
      credentials: {
        matricula: { label: "Matrícula", type: "text" },
        senha: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        try {
          const rawMatricula = credentials?.matricula as string | undefined;
          const senha = credentials?.senha as string | undefined;

          if (!rawMatricula || !senha) {
            authLogger.debug("authorize: matricula ou senha vazios");
            return null;
          }

          warnDevIfLdapDisabled();

          const matricula = rawMatricula.trim().toUpperCase();

          const rl = consumeAttempt(`login:${matricula}`, LOGIN_RATE_LIMIT);
          if (!rl.allowed) {
            authLogger.warn(
              { matricula, retryAfterMs: rl.retryAfterMs },
              "login bloqueado por rate limit",
            );
            return null;
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

            try {
              usuario = await prisma.usuario.create({
                data: {
                  matricula,
                  nome,
                  perfil,
                  ativo: true,
                },
              });
              authLogger.info(
                { matricula, perfil },
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
