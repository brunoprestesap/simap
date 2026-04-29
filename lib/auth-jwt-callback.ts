import type { JWT } from "@auth/core/jwt";
import type { User } from "next-auth";
import type { PerfilUsuario } from "@/lib/generated/prisma/client";

// Intervalo entre re-validações do usuário no banco (ativo / perfil) durante a vida do JWT.
// Curto o suficiente para que desativação/troca de perfil tenha efeito sem aguardar expiração
// completa do token; longo o suficiente para não bombardear o DB a cada request autenticado.
export const JWT_REVALIDATE_MS = 5 * 60_000;

export interface UsuarioRevalidacao {
  ativo: boolean;
  perfil: PerfilUsuario;
  nome: string;
}

export interface RevalidateUsuarioFn {
  (id: string): Promise<UsuarioRevalidacao | null>;
}

interface RevalidateJwtArgs {
  token: JWT;
  user: User | undefined;
  trigger: "signIn" | "signUp" | "update" | undefined;
  revalidate: RevalidateUsuarioFn;
  now?: number;
  onInvalidate?: (matricula: string) => void;
}

// Função pura, testável sem subir NextAuth ou Prisma. Retorna o token atualizado
// ou `null` quando a sessão deve ser invalidada (usuário inativo / removido).
export async function revalidateJwtToken({
  token,
  user,
  trigger,
  revalidate,
  now = Date.now(),
  onInvalidate,
}: RevalidateJwtArgs): Promise<JWT | null> {
  if (user) {
    token.id = user.id!;
    token.matricula = (user as unknown as { matricula: string }).matricula;
    token.nome = (user as unknown as { nome: string }).nome;
    token.perfil = (user as unknown as { perfil: string }).perfil;
    token.lastValidatedAt = now;
    return token;
  }

  const since = token.lastValidatedAt ?? 0;
  if (trigger !== "update" && now - since < JWT_REVALIDATE_MS) {
    return token;
  }

  const u = await revalidate(token.id);

  if (!u || !u.ativo) {
    onInvalidate?.(token.matricula);
    return null;
  }

  token.perfil = u.perfil;
  token.nome = u.nome;
  token.lastValidatedAt = now;
  return token;
}
