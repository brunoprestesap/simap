"use server";

import { prisma } from "@/lib/prisma";

export async function listarHistoricoImportacoes() {
  return prisma.importacaoCSV.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      importadoPor: { select: { nome: true } },
    },
  });
}
