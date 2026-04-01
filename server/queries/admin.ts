"use server";

import { prisma } from "@/lib/prisma";
import { buildSearchFilter } from "@/lib/query-builders";

export async function listarUnidadesAdmin(busca?: string) {
  return prisma.unidade.findMany({
    where: buildSearchFilter(busca, ["codigo", "descricao"]),
    orderBy: { descricao: "asc" },
    take: 200,
    include: {
      _count: { select: { setores: true, servidores: true, tombos: true } },
    },
  });
}

export async function listarSetoresAdmin(busca?: string) {
  return prisma.setor.findMany({
    where: buildSearchFilter(busca, ["codigo", "nome"]),
    orderBy: { nome: "asc" },
    take: 200,
    include: {
      unidade: { select: { id: true, descricao: true } },
      _count: { select: { tombos: true } },
    },
  });
}

export async function listarServidoresAdmin(busca?: string) {
  return prisma.servidor.findMany({
    where: buildSearchFilter(busca, ["matricula", "nome"]),
    orderBy: { nome: "asc" },
    take: 200,
    include: {
      unidade: { select: { id: true, descricao: true } },
      _count: { select: { tombosResponsavel: true } },
    },
  });
}

export async function listarUsuariosAdmin(busca?: string) {
  return prisma.usuario.findMany({
    where: buildSearchFilter(busca, ["matricula", "nome"]),
    orderBy: { nome: "asc" },
    take: 200,
  });
}
