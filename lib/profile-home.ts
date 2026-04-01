import type { PerfilUsuario } from "@/lib/generated/prisma/client";

export const PROFILE_HOME: Record<PerfilUsuario, string> = {
  TECNICO_TI: "/home",
  SERVIDOR_RESPONSAVEL: "/home",
  SERVIDOR_SEMAP: "/home",
  GESTOR_ADMIN: "/home",
};

export function getHomeByPerfil(perfil: PerfilUsuario): string {
  return PROFILE_HOME[perfil];
}
