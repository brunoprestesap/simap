"use client";

import { useEffect, useState, useTransition } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { listarMovimentacoesPorPeriodo } from "@/server/queries/dashboard";
import {
  formatPeriodoLabel,
  CHART_COLORS,
  CHART_TICK_STYLE,
  CHART_TOOLTIP_STYLE,
} from "@/lib/dashboard-utils";
import type { Agrupamento } from "@/lib/dashboard-utils";

interface ChartData {
  label: string;
  total: number;
}

const AGRUPAMENTO_OPTIONS: { value: Agrupamento; label: string }[] = [
  { value: "dia", label: "Dia" },
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mês" },
];

export function DashboardChart() {
  const [agrupamento, setAgrupamento] = useState<Agrupamento>("mes");
  const [data, setData] = useState<ChartData[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const result = await listarMovimentacoesPorPeriodo(agrupamento);
      setData(
        result.map((r) => ({
          label: formatPeriodoLabel(r.periodo, agrupamento),
          total: r.total,
        })),
      );
    });
  }, [agrupamento]);

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">
          Movimentações por período
        </h3>
        <SegmentedControl
          value={agrupamento}
          onChange={setAgrupamento}
          options={AGRUPAMENTO_OPTIONS}
        />
      </div>

      {isPending ? (
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      ) : data.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          Sem dados para o período selecionado
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={256}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.grid} />
            <XAxis dataKey="label" tick={CHART_TICK_STYLE} tickLine={false} axisLine={false} />
            <YAxis tick={CHART_TICK_STYLE} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLE}
              labelFormatter={(label) => `Período: ${label}`}
              formatter={(value) => [String(value), "Movimentações"]}
            />
            <Bar dataKey="total" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
