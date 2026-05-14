"use server";

import {
  MOVIMENTACAO_STATUS_EM_ANDAMENTO,
  TOMBO_EM_MOVIMENTACAO_WHERE,
} from "@/lib/movimentacao-status";
import type {
  BuscarTomboMovimentacaoResult,
  TomboSelecionado,
  TomboSicamSnapshot,
} from "@/lib/movimentacao-types";
import { prisma } from "@/lib/prisma";
import { buscarSnapshotSicam } from "@/server/queries/sicam";

// Timeout curto para o lookup de SICAM no fluxo de scan: queremos enriquecer
// a resposta com dados real-time, mas não bloquear o técnico se o Oracle estiver
// lento. Detalhe do tombo (não-scan) pode usar timeout maior.
const SCAN_SICAM_TIMEOUT_MS = 2000;

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

interface MeusTombosFilters {
  busca?: string;
  pagina?: number;
  porPagina?: number;
}

export async function listarMeusTombos(
  userId: string,
  matricula: string,
  filters: MeusTombosFilters = {},
) {
  const { busca, pagina = 1, porPagina = 20 } = filters;

  const responsabilidadeClause = {
    OR: [
      { usuarioResponsavelId: userId },
      { matriculaResponsavel: matricula, ativo: true },
    ],
  };

  // Quando há busca textual, envolve ambos os OR em AND para evitar que o
  // Prisma achate os arrays num único OR de nível superior, o que retornaria
  // tombos de outros responsáveis que batem apenas no texto.
  const where = busca
    ? {
        AND: [
          responsabilidadeClause,
          {
            OR: [
              { numero: { contains: busca, mode: "insensitive" as const } },
              {
                descricaoMaterial: {
                  contains: busca,
                  mode: "insensitive" as const,
                },
              },
            ],
          },
        ],
      }
    : responsabilidadeClause;

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

export type MeusTombosData = Awaited<ReturnType<typeof listarMeusTombos>>;

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

  // Local + SICAM em paralelo. Se SICAM ficar indisponível, a Promise resolve
  // com status "indisponivel" (não lança), então o resultado local não é
  // bloqueado pela degradação do Oracle.
  const [tombo, sicamSnapshot] = await Promise.all([
    prisma.tombo.findFirst({
      where: { numero: { in: candidatos } },
      include: tomboMovimentacaoInclude,
    }),
    buscarSnapshotSicam(numeroSemZeros.length > 0 ? numeroSemZeros : numero, {
      timeoutMs: SCAN_SICAM_TIMEOUT_MS,
    }),
  ]);

  if (!tombo) {
    return {
      status: "nao_encontrado",
      codigo: numero,
      sicamSnapshot: toUiSnapshot(sicamSnapshot),
    };
  }

  // Recalcula divergências comparando agora com os dados reais do tombo local —
  // a chamada paralela acima não conhecia o tombo local ainda.
  const enrichedSnapshot =
    sicamSnapshot.status === "ok" && sicamSnapshot.dados
      ? {
          ...sicamSnapshot,
          divergencias: computeDivergencias(tombo, sicamSnapshot.dados),
        }
      : sicamSnapshot;

  if (tombo.itensMovimentacao.length > 0) {
    return {
      status: "em_movimentacao",
      codigo: numero,
      sicamSnapshot: toUiSnapshot(enrichedSnapshot),
    };
  }

  return {
    status: "disponivel",
    tombo: mapTomboSelecionado(tombo),
    sicamSnapshot: toUiSnapshot(enrichedSnapshot),
  };
}

/**
 * Adapta o resultado do servidor (`SnapshotSicamResult`) para o formato
 * exposto à UI (`TomboSicamSnapshot`). Os tipos são compatíveis mas
 * declarados em módulos diferentes pra não vazar imports server-only.
 */
function toUiSnapshot(
  snapshot: Awaited<ReturnType<typeof buscarSnapshotSicam>>,
): TomboSicamSnapshot {
  return {
    status: snapshot.status,
    consultadoEm: snapshot.consultadoEm,
    errorMessage: snapshot.errorMessage,
    oraCode: snapshot.oraCode,
    dados: snapshot.dados,
    divergencias: snapshot.divergencias,
  };
}

function computeDivergencias(
  local: {
    descricaoMaterial: string;
    unidade?: { codigo: string } | null;
    setor?: { codigo?: string | null; nome?: string } | null;
    usuarioResponsavel?: { matricula: string } | null;
    matriculaResponsavel?: string | null;
  },
  sicam: {
    descricaoMaterial: string;
    codLotacao: number | null;
    codSetor: number | null;
    matriculaResponsavel: string | null;
  },
): Array<"unidade" | "setor" | "responsavel" | "descricao"> {
  const divergencias: Array<"unidade" | "setor" | "responsavel" | "descricao"> =
    [];

  if (sicam.codLotacao !== null && local.unidade) {
    if (String(sicam.codLotacao) !== local.unidade.codigo) {
      divergencias.push("unidade");
    }
  }
  if (sicam.codSetor !== null && local.setor?.codigo) {
    if (String(sicam.codSetor) !== local.setor.codigo) {
      divergencias.push("setor");
    }
  }
  if (sicam.matriculaResponsavel) {
    const localMat =
      local.usuarioResponsavel?.matricula ?? local.matriculaResponsavel ?? null;
    if (localMat && localMat !== sicam.matriculaResponsavel) {
      divergencias.push("responsavel");
    }
  }
  if (local.descricaoMaterial.trim() !== sicam.descricaoMaterial.trim()) {
    divergencias.push("descricao");
  }
  return divergencias;
}

async function _buscarTomboDetalheRaw(id: string) {
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
      historicosTermo: {
        orderBy: { dtTermo: "desc" },
        take: 20,
      },
    },
  });
}

export async function buscarTomboDetalhe(id: string) {
  const tombo = await _buscarTomboDetalheRaw(id);
  if (!tombo) return null;

  // Enriquece o histórico com as descrições de unidade já salvas no SIMAP
  // (populadas pelo sync via SARH.RH_LOTACAO) para evitar mostrar só o código.
  const codigosHistorico = [
    ...new Set(
      tombo.historicosTermo
        .map((h) => (h.codLotacao !== null ? String(h.codLotacao) : null))
        .filter((c): c is string => c !== null),
    ),
  ];

  const unidadesHistorico: Record<string, string> = {};
  if (codigosHistorico.length > 0) {
    const unidades = await prisma.unidade.findMany({
      where: { codigo: { in: codigosHistorico } },
      select: { codigo: true, descricao: true },
    });
    for (const u of unidades) {
      unidadesHistorico[u.codigo] = u.descricao;
    }
  }

  return { ...tombo, unidadesHistorico };
}

export type TomboDetalhe = NonNullable<
  Awaited<ReturnType<typeof buscarTomboDetalhe>>
>;
