import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { PerfilUsuario } from "@/lib/generated/prisma/client";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user;
}

export async function requireRole(roles: PerfilUsuario[]) {
  const user = await requireAuth();
  if (!roles.includes(user.perfil)) redirect("/home");
  return user;
}

// For server actions (return error instead of redirect)
export async function requireAuthAction() {
  const session = await auth();
  if (!session?.user) {
    return { user: null, error: "Não autenticado" } as const;
  }
  return { user: session.user, error: null } as const;
}

export async function requireRoleAction(roles: PerfilUsuario[]) {
  const { user, error } = await requireAuthAction();
  if (error) return { user: null, error } as const;
  if (!roles.includes(user!.perfil)) {
    return { user: null, error: "Sem permissão" } as const;
  }
  return { user: user!, error: null } as const;
}
