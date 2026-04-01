"use server";

import { prisma } from "@/lib/prisma";
import { buildDateRangeFilter } from "@/lib/query-builders";
import type { StatusMovimentacao } from "@/lib/generated/prisma/client";

interface BacklogFilters {
  status?: StatusMovimentacao | "TODAS";
  periodoInicio?: string;
  periodoFim?: string;
  unidadeId?: string;
  ordenacao?: "recente" | "antiga" | "unidade" | "status";
  pagina?: number;
  porPagina?: number;
}

export async function listarBacklog(filters: BacklogFilters = {}) {
  const {
    status,
    periodoInicio,
    periodoFim,
    unidadeId,
    ordenacao = "recente",
    pagina = 1,
    porPagina = 20,
  } = filters;

  const where: Record<string, unknown> = {};

  // Filter by status
  if (status && status !== "TODAS") {
    where.status = status;
  } else if (!status) {
    // Default: show only actionable items (PENDENTE or CONFIRMADA)
    where.status = { in: ["PENDENTE_CONFIRMACAO", "CONFIRMADA_ORIGEM"] };
  }

  // Filter by date range
  const dateRange = buildDateRangeFilter(periodoInicio, periodoFim);
  if (dateRange) {
    where.createdAt = dateRange;
  }

  // Filter by unit (origin or destination)
  if (unidadeId) {
    where.OR = [
      { unidadeOrigemId: unidadeId },
      { unidadeDestinoId: unidadeId },
    ];
  }

  // Order by
  let orderBy: Record<string, string>;
  switch (ordenacao) {
    case "antiga":
      orderBy = { createdAt: "asc" };
      break;
    case "unidade":
      orderBy = { unidadeOrigem: "asc" };
      break;
    case "status":
      orderBy = { status: "asc" };
      break;
    default:
      orderBy = { createdAt: "desc" };
  }

  const skip = (pagina - 1) * porPagina;

  const [movimentacoes, total] = await Promise.all([
    prisma.movimentacao.findMany({
      where,
      orderBy,
      skip,
      take: porPagina,
      include: {
        unidadeOrigem: { select: { id: true, descricao: true } },
        unidadeDestino: { select: { id: true, descricao: true } },
        tecnico: { select: { id: true, nome: true } },
        _count: { select: { itens: true } },
      },
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
