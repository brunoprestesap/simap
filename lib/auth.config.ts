import type { NextAuthConfig } from "next-auth";

/**
 * Auth config Edge-compatible (sem Prisma).
 * Providers são definidos em auth.ts (Node.js runtime).
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.matricula = (user as unknown as { matricula: string }).matricula;
        token.nome = (user as unknown as { nome: string }).nome;
        token.perfil = (user as unknown as { perfil: string }).perfil;
      }
      return token;
    },
    session({ session, token }) {
      if (token) {
        const u = session.user as unknown as Record<string, unknown>;
        u.id = token.id;
        u.matricula = token.matricula;
        u.nome = token.nome;
        u.perfil = token.perfil;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const { pathname } = nextUrl;
      const isPublic =
        pathname.startsWith("/login") ||
        pathname.startsWith("/confirmar") ||
        pathname.startsWith("/api/auth");

      if (isPublic) return true;
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;
