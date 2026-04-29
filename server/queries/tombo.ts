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

const usuarioResponsavelSelect = {
  select: { id: true, nome: true, matricula: true },
} as const;

function mapTomboSelecionado(tombo: {
  id: string;
  numero: string;
  descricaoMaterial: string;
  unidade: TomboSelecionado["unidade"];
  setor: TomboSelecionado["setor"];
  usuarioResponsavel: TomboSelecionado["usuarioResponsavel"];
  matriculaResponsavel: string | null;
  nomeResponsavel: string | null;
}): TomboSelecionado {
  return {
    id: tombo.id,
    numero: tombo.numero,
    descricaoMaterial: tombo.descricaoMaterial,
    unidade: tombo.unidade,
    setor: tombo.setor,
    usuarioResponsavel: tombo.usuarioResponsavel,
    matriculaResponsavel: tombo.matriculaResponsavel,
    nomeResponsavel: tombo.nomeResponsavel,
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
        usuarioResponsavel: usuarioResponsavelSelect,
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

const tomboMovimentacaoInclude = {
  unidade: { select: { id: true, codigo: true, descricao: true } },
  setor: { select: { id: true, codigo: true, nome: true } },
  usuarioResponsavel: usuarioResponsavelSelect,
  itensMovimentacao: {
    where: {
      movimentacao: {
        status: { in: [...MOVIMENTACAO_STATUS_EM_ANDAMENTO] },
      },
    },
    select: { id: true },
    take: 1,
  },
};

export async function buscarTomboParaMovimentacao(
  numero: string,
): Promise<BuscarTomboMovimentacaoResult> {
  const numeroSemZeros = numero.replace(/^0+/, "");
  const candidatos =
    numeroSemZeros.length > 0 && numeroSemZeros !== numero
      ? [numero, numeroSemZeros]
      : [numero];

  // Uma única query cobre o lookup direto e o fallback sem zeros à esquerda
  // (entrada típica do leitor de código de barras vs. cadastro com padding).
  const tombo = await prisma.tombo.findFirst({
    where: { numero: { in: candidatos } },
    include: tomboMovimentacaoInclude,
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

export async function buscarTomboDetalhe(id: string) {
  return prisma.tombo.findUnique({
    where: { id },
    include: {
      unidade: { select: { id: true, codigo: true, descricao: true } },
      setor: { select: { id: true, codigo: true, nome: true } },
      usuarioResponsavel: { select: { id: true, nome: true, matricula: true } },
      itensMovimentacao: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          movimentacao: {
            select: {
              id: true,
              status: true,
              createdAt: true,
              unidadeOrigem: { select: { codigo: true, descricao: true } },
              unidadeDestino: { select: { codigo: true, descricao: true } },
              tecnico: { select: { nome: true } },
            },
          },
        },
      },
    },
  });
}

export type TomboDetalhe = NonNullable<
  Awaited<ReturnType<typeof buscarTomboDetalhe>>
>;
