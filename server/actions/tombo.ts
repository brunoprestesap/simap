"use server";

import { requireAuthAction } from "@/lib/auth-guard";
import { listarMeusTombos } from "@/server/queries/tombo";

export async function fetchMeusTombosPage(pagina: number) {
  const { user, error } = await requireAuthAction();
  if (error || !user) {
    return { success: false as const, error: error ?? "Não autenticado" };
  }

  const data = await listarMeusTombos(user.id, user.matricula, {
    pagina,
    porPagina: 5,
  });

  return { success: true as const, data };
}
