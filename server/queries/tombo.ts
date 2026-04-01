"use server";

import {
  MOVIMENTACAO_STATUS_EM_ANDAMENTO,
  TOMBO_EM_MOVIMENTACAO_WHERE,
} from "@/lib/movimentacao-status";
import type {
  BuscarTomboMovimentacaoResult,
  TomboSelecionado,
} from "@/lib/movimentacao-types";
import { prisma } from "@/lib/prisma";

interface TomboFilters {
  busca?: string;
  unidadeId?: string;
  setorId?: string;
  status?: "todos" | "ativos" | "inativos" | "em_movimentacao";
  pagina?: number;
  porPagina?: number;
}

function mapTomboSelecionado(tombo: {
  id: string;
  numero: string;
  descricaoMaterial: string;
  unidade: TomboSelecionado["unidade"];
  setor: TomboSelecionado["setor"];
  servidorResponsavel: TomboSelecionado["servidorResponsavel"];
}): TomboSelecionado {
  return {
    id: tombo.id,
    numero: tombo.numero,
    descricaoMaterial: tombo.descricaoMaterial,
    unidade: tombo.unidade,
    setor: tombo.setor,
    servidorResponsavel: tombo.servidorResponsavel,
  };
}

export async function listarTombos(filters: TomboFilters = {}) {
  const {
    busca,
    unidadeId,
    setorId,
    status = "todos",
    pagina = 1,
    porPagina = 20,
  } = filters;

  const where: Record<string, unknown> = {};

  // Search by numero or descricaoMaterial
  if (busca) {
    where.OR = [
      { numero: { contains: busca, mode: "insensitive" } },
      { descricaoMaterial: { contains: busca, mode: "insensitive" } },
    ];
  }

  // Filter by unidade
  if (unidadeId) {
    where.unidadeId = unidadeId;
  }

  // Filter by setor
  if (setorId) {
    where.setorId = setorId;
  }

  // Filter by status
  if (status === "ativos") {
    where.ativo = true;
  } else if (status === "inativos") {
    where.ativo = false;
  } else if (status === "em_movimentacao") {
    where.ativo = true;
    where.itensMovimentacao = TOMBO_EM_MOVIMENTACAO_WHERE;
  }

  const skip = (pagina - 1) * porPagina;

  const [tombos, total] = await Promise.all([
    prisma.tombo.findMany({
      where,
      orderBy: { numero: "asc" },
      skip,
      take: porPagina,
      include: {
        unidade: { select: { id: true, codigo: true, descricao: true } },
        setor: { select: { id: true, nome: true } },
        servidorResponsavel: {
          select: { id: true, nome: true, matricula: true },
        },
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

export async function listarSetoresPorUnidade(unidadeId: string) {
  return prisma.setor.findMany({
    where: { unidadeId, ativo: true },
    orderBy: { nome: "asc" },
    select: { id: true, codigo: true, nome: true },
  });
}

export async function buscarTomboParaMovimentacao(
  numero: string,
): Promise<BuscarTomboMovimentacaoResult> {
  const tombo = await prisma.tombo.findUnique({
    where: { numero },
    include: {
      unidade: { select: { id: true, codigo: true, descricao: true } },
      setor: { select: { id: true, codigo: true, nome: true } },
      servidorResponsavel: {
        select: { id: true, nome: true, matricula: true },
      },
      itensMovimentacao: {
        where: {
          movimentacao: {
            status: { in: [...MOVIMENTACAO_STATUS_EM_ANDAMENTO] },
          },
        },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!tombo) {
    return {
      status: "nao_encontrado",
      codigo: numero,
    };
  }

  if (tombo.itensMovimentacao.length > 0) {
    return {
      status: "em_movimentacao",
      codigo: numero,
    };
  }

  return {
    status: "disponivel",
    tombo: mapTomboSelecionado(tombo),
  };
}
