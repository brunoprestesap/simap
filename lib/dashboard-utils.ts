import type { StatusMovimentacao } from "@/lib/generated/prisma/client";

// ─── Constantes ────────────────────────────────────────

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export type Agrupamento = "dia" | "semana" | "mes";

export interface Tendencia {
  direcao: "up" | "down";
  label: string;
}

export interface UnidadeDistribuicao {
  unidadeId: string;
  unidadeDescricao: string;
  total: number;
  pendentes: number;
  confirmadas: number;
  registradas: number;
}

// ─── Cálculo de tempo médio (dias) ─────────────────────

export function calcMediaDias(
  items: { createdAt: Date; dataRegistroSicam: Date }[],
): number {
  if (items.length === 0) return 0;
  const totalDias = items.reduce((acc, item) => {
    const diff = item.dataRegistroSicam.getTime() - item.createdAt.getTime();
    return acc + diff / MS_PER_DAY;
  }, 0);
  return Math.round((totalDias / items.length) * 10) / 10;
}

// ─── Cálculo de tendência (período atual vs anterior) ──

export function calcTendencia(
  atual: number,
  anterior: number | null,
): Tendencia | null {
  if (anterior === null || anterior === 0) return null;
  const diff = atual - anterior;
  if (Math.abs(diff) < 0.1) return null;
  return {
    direcao: diff > 0 ? "up" : "down",
    label: `${Math.abs(diff).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dias vs. período anterior`,
  };
}

// ─── Formatação de label de período para gráficos ──────

export function formatPeriodoLabel(
  isoDate: string,
  agrupamento: Agrupamento,
): string {
  const date = new Date(isoDate);
  switch (agrupamento) {
    case "dia":
      return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    case "semana":
      return `Sem ${date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`;
    case "mes":
      return date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
  }
}

// ─── Agregação de movimentações por unidade/status ─────

const STATUS_PENDENTES: StatusMovimentacao[] = ["PENDENTE_CONFIRMACAO", "NAO_CONFIRMADA"];

interface MovimentacaoGroupItem {
  unidadeOrigemId: string;
  status: StatusMovimentacao;
  _count: { id: number };
}

export function agruparPorUnidade(
  movimentacoes: MovimentacaoGroupItem[],
  unidadeNomes: Map<string, string>,
): UnidadeDistribuicao[] {
  const agrupado = new Map<string, UnidadeDistribuicao>();

  for (const mov of movimentacoes) {
    const existing = agrupado.get(mov.unidadeOrigemId) ?? {
      unidadeId: mov.unidadeOrigemId,
      unidadeDescricao: unidadeNomes.get(mov.unidadeOrigemId) ?? "Desconhecida",
      total: 0,
      pendentes: 0,
      confirmadas: 0,
      registradas: 0,
    };

    const count = mov._count.id;
    existing.total += count;

    if (STATUS_PENDENTES.includes(mov.status)) {
      existing.pendentes += count;
    } else if (mov.status === "CONFIRMADA_ORIGEM") {
      existing.confirmadas += count;
    } else if (mov.status === "REGISTRADA_SICAM") {
      existing.registradas += count;
    }

    agrupado.set(mov.unidadeOrigemId, existing);
  }

  return Array.from(agrupado.values()).sort((a, b) => b.total - a.total);
}

// ─── Recharts design tokens ───────────────────────────

export const CHART_COLORS = {
  primary: "#003366",
  secondary: "#2D6E2D",
  warning: "#D4A017",
  grid: "#e5e7eb",
  text: "#666666",
} as const;

export const CHART_TICK_STYLE = {
  fontSize: 11,
  fill: CHART_COLORS.text,
} as const;

export const CHART_TOOLTIP_STYLE = {
  fontSize: 12,
  borderRadius: 8,
  border: `1px solid ${CHART_COLORS.grid}`,
} as const;
