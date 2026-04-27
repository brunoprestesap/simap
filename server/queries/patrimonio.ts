"use server";

import {
  MOVIMENTACAO_STATUS_EM_ANDAMENTO,
  TOMBO_EM_MOVIMENTACAO_WHERE,
} from "@/lib/movimentacao-status";
import { prisma } from "@/lib/prisma";

interface PatrimonioFilters {
  unidadeId: string;
  busca?: string;
  filtroStatus?: "todos" | "presentes" | "em_movimentacao";
  pagina?: number;
  porPagina?: number;
}

export async function listarPatrimonios(filters: PatrimonioFilters) {
  const {
    unidadeId,
    busca,
    filtroStatus = "todos",
    pagina = 1,
    porPagina = 20,
  } = filters;

  const where: Record<string, unknown> = {
    unidadeId,
    ativo: true,
  };

  // Search by numero or descricao
  if (busca) {
    where.OR = [
      { numero: { contains: busca, mode: "insensitive" } },
      { descricaoMaterial: { contains: busca, mode: "insensitive" } },
    ];
  }

  // Filter by movement status
  if (filtroStatus === "em_movimentacao") {
    where.itensMovimentacao = TOMBO_EM_MOVIMENTACAO_WHERE;
  } else if (filtroStatus === "presentes") {
    where.itensMovimentacao = {
      none: {
        movimentacao: {
          status: { in: [...MOVIMENTACAO_STATUS_EM_ANDAMENTO] },
        },
      },
    };
  }

  const skip = (pagina - 1) * porPagina;

  const [tombos, total] = await Promise.all([
    prisma.tombo.findMany({
      where,
      orderBy: { numero: "asc" },
      skip,
      take: porPagina,
      include: {
        setor: { select: { id: true, nome: true } },
        usuarioResponsavel: { select: { id: true, nome: true } },
        itensMovimentacao: {
          where: {
            movimentacao: {
              status: { in: [...MOVIMENTACAO_STATUS_EM_ANDAMENTO] },
            },
          },
          take: 1,
          include: {
            movimentacao: { select: { id: true, status: true } },
          },
        },
      },
    }),
    prisma.tombo.count({ where }),
  ]);

  return {
    tombos,
    total,
    totalPaginas: Math.ceil(total / porPagina),
    paginaAtual: pagina,
  };
}

export async function contarPendentesConfirmacao(unidadeId: string) {
  return prisma.movimentacao.count({
    where: {
      unidadeDestinoId: unidadeId,
      status: "PENDENTE_CONFIRMACAO",
    },
  });
}
