"use server";

import { prisma } from "@/lib/prisma";

export async function listarUnidadesAtivas() {
  return prisma.unidade.findMany({
    where: { ativo: true },
    orderBy: { descricao: "asc" },
    select: { id: true, codigo: true, descricao: true },
  });
}
