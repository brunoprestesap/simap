"use server";

import { prisma } from "@/lib/prisma";

export async function registrarAuditoria(
  acao: string,
  entidade: string,
  entidadeId: string,
  usuarioId: string | null,
  detalhes?: Record<string, unknown>,
) {
  await prisma.auditLog.create({
    data: {
      acao,
      entidade,
      entidadeId,
      usuarioId,
      detalhes: detalhes ? JSON.parse(JSON.stringify(detalhes)) : undefined,
    },
  });
}
