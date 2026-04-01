"use server";

import { requireAuthAction } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export async function marcarComoLida(notificacaoId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const { user, error } = await requireAuthAction();
  if (error) return { success: false, error };

  await prisma.notificacao.update({
    where: { id: notificacaoId, usuarioDestinoId: user!.id },
    data: { lida: true },
  });

  return { success: true };
}

export async function marcarTodasComoLidas(): Promise<{
  success: boolean;
  error?: string;
}> {
  const { user, error } = await requireAuthAction();
  if (error) return { success: false, error };

  await prisma.notificacao.updateMany({
    where: { usuarioDestinoId: user!.id, lida: false },
    data: { lida: true },
  });

  return { success: true };
}
