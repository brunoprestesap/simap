"use server";

import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { agruparPorUnidade } from "@/lib/dashboard-utils";
import type { Agrupamento, UnidadeDistribuicao } from "@/lib/dashboard-utils";

// ─── Períodos de referência ────────────────────────────

function diasAtras(dias: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d;
}

function mesesAtras(meses: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - meses);
  return d;
}

const PERIODO_DIAS: Record<Agrupamento, () => Date> = {
  dia: () => diasAtras(30),
  semana: () => diasAtras(90),
  mes: () => mesesAtras(12),
};

const TRUNC_FN: Record<Agrupamento, string> = {
  dia: "day",
  semana: "week",
  mes: "month",
};

// ─── KPI: Tempo médio de registro no SICAM ─────────────

interface KPITempoMedio {
  tempoMedioDias: number;
  tempoMedioPeriodoAnterior: number | null;
}

export const calcularTempoMedioRegistroSicam = cache(async (): Promise<KPITempoMedio> => {
  const trintaDias = diasAtras(30);
  const sessentaDias = diasAtras(60);

  const result = await prisma.$queryRaw<
    { periodo: string; media_dias: number | null; total: bigint }[]
  >`
    SELECT
      CASE
        WHEN "createdAt" >= ${trintaDias} THEN 'atual'
        ELSE 'anterior'
      END as periodo,
      AVG(EXTRACT(EPOCH FROM ("dataRegistroSicam" - "createdAt")) / 86400) as media_dias,
      COUNT(*)::bigint as total
    FROM "Movimentacao"
    WHERE status = 'REGISTRADA_SICAM'
      AND "dataRegistroSicam" IS NOT NULL
      AND "createdAt" >= ${sessentaDias}
    GROUP BY periodo
  `;

  const atual = result.find((r) => r.periodo === "atual");
  const anterior = result.find((r) => r.periodo === "anterior");

  const round1 = (n: number) => Math.round(n * 10) / 10;

  return {
    tempoMedioDias: atual?.media_dias != null ? round1(atual.media_dias) : 0,
    tempoMedioPeriodoAnterior:
      anterior?.media_dias != null ? round1(anterior.media_dias) : null,
  };
});

// ─── KPI: Contadores ───────────────────────────────────

export const contarPendentesSicam = cache(async (): Promise<number> => {
  return prisma.movimentacao.count({
    where: { status: "CONFIRMADA_ORIGEM" },
  });
});

export const contarPendentesConfirmacaoGeral = cache(async (): Promise<number> => {
  return prisma.movimentacao.count({
    where: { status: "PENDENTE_CONFIRMACAO" },
  });
});

// ─── Gráfico: Movimentações por período ────────────────

interface MovimentacaoPorPeriodo {
  periodo: string;
  total: number;
}

export async function listarMovimentacoesPorPeriodo(
  agrupamento: Agrupamento = "mes",
): Promise<MovimentacaoPorPeriodo[]> {
  const dataInicio = PERIODO_DIAS[agrupamento]();
  const truncFn = TRUNC_FN[agrupamento];

  const result = await prisma.$queryRawUnsafe<
    { periodo: Date; total: bigint }[]
  >(
    `SELECT date_trunc($1, "createdAt") as periodo, COUNT(*)::bigint as total
     FROM "Movimentacao"
     WHERE "createdAt" >= $2
     GROUP BY periodo
     ORDER BY periodo ASC`,
    truncFn,
    dataInicio,
  );

  return result.map((row) => ({
    periodo: row.periodo.toISOString(),
    total: Number(row.total),
  }));
}

// ─── Gráfico: Distribuição por unidade ─────────────────

export async function listarDistribuicaoPorUnidade(): Promise<
  UnidadeDistribuicao[]
> {
  const movimentacoes = await prisma.movimentacao.groupBy({
    by: ["unidadeOrigemId", "status"],
    _count: { id: true },
  });

  const unidadeIds = [...new Set(movimentacoes.map((m) => m.unidadeOrigemId))];
  if (unidadeIds.length === 0) return [];

  const unidades = await prisma.unidade.findMany({
    where: { id: { in: unidadeIds } },
    select: { id: true, descricao: true },
  });

  const unidadeNomes = new Map(unidades.map((u) => [u.id, u.descricao]));

  return agruparPorUnidade(movimentacoes, unidadeNomes);
}
