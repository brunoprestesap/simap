"use server";

import { prisma } from "@/lib/prisma";
import { buildDateRangeFilter } from "@/lib/query-builders";
import type { StatusMovimentacao } from "@/lib/generated/prisma/client";

interface HistoricoFilters {
  periodoInicio?: string;
  periodoFim?: string;
  unidadeId?: string;
  responsavel?: string;
  status?: StatusMovimentacao | "TODAS";
  pagina?: number;
  porPagina?: number;
}

export async function listarHistoricoMovimentacoes(filters: HistoricoFilters = {}) {
  const {
    periodoInicio,
    periodoFim,
    unidadeId,
    responsavel,
    status,
    pagina = 1,
    porPagina = 20,
  } = filters;

  const where: Record<string, unknown> = {};

  if (status && status !== "TODAS") {
    where.status = status;
  }

  const dateRange = buildDateRangeFilter(periodoInicio, periodoFim);
  if (dateRange) {
    where.createdAt = dateRange;
  }

  if (unidadeId) {
    where.OR = [
      { unidadeOrigemId: unidadeId },
      { unidadeDestinoId: unidadeId },
    ];
  }

  if (responsavel) {
    where.tecnico = {
      nome: { contains: responsavel, mode: "insensitive" },
    };
  }

  const skip = (pagina - 1) * porPagina;

  const [movimentacoes, total] = await Promise.all([
    prisma.movimentacao.findMany({
      where,
      orderBy: { createdAt: "desc" },
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

export async function buscarMovimentacaoDetalhada(id: string) {
  return prisma.movimentacao.findUnique({
    where: { id },
    include: {
      unidadeOrigem: { select: { id: true, codigo: true, descricao: true } },
      unidadeDestino: { select: { id: true, codigo: true, descricao: true } },
      setorOrigem: { select: { id: true, nome: true } },
      setorDestino: { select: { id: true, nome: true } },
      tecnico: { select: { id: true, nome: true, matricula: true } },
      registradoSicamPor: { select: { id: true, nome: true, matricula: true } },
      itens: {
        select: {
          id: true,
          tombo: {
            select: {
              id: true,
              numero: true,
              descricaoMaterial: true,
              setor: { select: { id: true, nome: true } },
              usuarioResponsavel: { select: { id: true, nome: true } },
            },
          },
        },
      },
    },
  });
}
