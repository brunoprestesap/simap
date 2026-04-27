"use server";

import { prisma } from "@/lib/prisma";
import { buildSearchFilter } from "@/lib/query-builders";

export async function listarUnidadesAdmin(busca?: string) {
  return prisma.unidade.findMany({
    where: buildSearchFilter(busca, ["codigo", "descricao"]),
    orderBy: { descricao: "asc" },
    take: 200,
    include: {
      _count: { select: { setores: true, usuarios: true, tombos: true } },
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

/** Usuários com dados de lotação patrimonial (unidade/setor no cadastro SIMAP). */
export async function listarUsuariosLotacaoAdmin(busca?: string) {
  return prisma.usuario.findMany({
    where: buildSearchFilter(busca, ["matricula", "nome"]),
    orderBy: { nome: "asc" },
    take: 200,
    include: {
      unidade: { select: { id: true, descricao: true } },
      setor: { select: { id: true, nome: true } },
      _count: { select: { tombosComoResponsavel: true } },
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
