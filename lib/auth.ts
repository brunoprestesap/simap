import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
import type { PerfilUsuario } from "@/lib/generated/prisma/client";
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

          if (!rawMatricula || !senha) return null;

          const matricula = rawMatricula.trim().toUpperCase();

          const usuario = await prisma.usuario.findFirst({
            where: { matricula, ativo: true },
          });

          if (!usuario) return null;

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
