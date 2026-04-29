"use server";

import type { Prisma } from "@/lib/generated/prisma/client";
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
      // detalhes é sempre serializável (callers passam objetos planos com strings/números/arrays).
      // Cast direto para InputJsonValue evita o JSON.parse(JSON.stringify) que existia antes.
      detalhes: (detalhes ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}
