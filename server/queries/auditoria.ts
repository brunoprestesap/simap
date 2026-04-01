"use server";

import { prisma } from "@/lib/prisma";
import { buildDateRangeFilter } from "@/lib/query-builders";
import type { Prisma, StatusMovimentacao } from "@/lib/generated/prisma/client";

interface AuditoriaFilters {
  periodoInicio?: string;
  periodoFim?: string;
  unidadeId?: string;
  responsavel?: string;
  status?: StatusMovimentacao | "TODAS";
  pagina?: number;
  porPagina?: number;
}

function buildAuditoriaWhere(
  filters: Omit<AuditoriaFilters, "pagina" | "porPagina">,
): Prisma.MovimentacaoWhereInput {
  const where: Prisma.MovimentacaoWhereInput = {};

  if (filters.status && filters.status !== "TODAS") {
    where.status = filters.status;
  }

  const dateRange = buildDateRangeFilter(filters.periodoInicio, filters.periodoFim);
  if (dateRange) {
    where.createdAt = dateRange;
  }

  if (filters.unidadeId) {
    where.OR = [
      { unidadeOrigemId: filters.unidadeId },
      { unidadeDestinoId: filters.unidadeId },
    ];
  }

  if (filters.responsavel) {
    where.tecnico = {
      nome: { contains: filters.responsavel, mode: "insensitive" },
    };
  }

  return where;
}

const AUDITORIA_INCLUDE = {
  unidadeOrigem: { select: { descricao: true } },
  unidadeDestino: { select: { descricao: true } },
  tecnico: { select: { nome: true } },
  registradoSicamPor: { select: { nome: true } },
} as const;

export async function listarRelatorioAuditoria(
  filters: AuditoriaFilters = {},
) {
  const { pagina = 1, porPagina = 20, ...filterParams } = filters;
  const where = buildAuditoriaWhere(filterParams);
  const skip = (pagina - 1) * porPagina;

  const [movimentacoes, total] = await Promise.all([
    prisma.movimentacao.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: porPagina,
      include: AUDITORIA_INCLUDE,
    }),
    prisma.movimentacao.count({ where }),
  ]);

  return {
    movimentacoes,
    total,
    totalPaginas: Math.ceil(total / porPagina),
    paginaAtual: pagina,
  };
}
