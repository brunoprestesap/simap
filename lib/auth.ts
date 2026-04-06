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
            if (process.env.NODE_ENV === "development") {
              console.warn("[AUTH] authorize: matricula ou senha vazios");
            }
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
              if (process.env.NODE_ENV === "development") {
                console.warn(
                  "[AUTH] sem LDAP: usuário deve existir na base (seed ou cadastro manual):",
                  matricula,
                );
              }
              return null;
            }

            const servidor = await prisma.servidor.findUnique({
              where: { matricula },
              select: { nome: true },
            });

            const nome =
              ldapDisplayName?.trim() || servidor?.nome || matricula;
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
              if (process.env.NODE_ENV === "development") {
                console.info(
                  "[AUTH] Usuario provisionado no primeiro login:",
                  matricula,
                  perfil,
                );
              }
            } catch (e) {
              if (
                e instanceof Prisma.PrismaClientKnownRequestError &&
                e.code === "P2002"
              ) {
                usuario = await prisma.usuario.findUnique({
                  where: { matricula },
                });
              } else {
                console.error("[AUTH] Erro ao provisionar usuario:", e);
                return null;
              }
            }
          }

          if (!usuario) {
            return null;
          }

          if (!usuario.ativo) {
            if (process.env.NODE_ENV === "development") {
              console.warn(
                "[AUTH] authorize: usuário existe mas está inativo:",
                matricula,
              );
            }
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
          console.error("[AUTH] Erro no authorize:", error);
          return null;
        }
      },
    }),
  ],
});
