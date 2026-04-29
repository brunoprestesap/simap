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
export { getHomeByPerfil } from "@/lib/profile-home";

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
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
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
