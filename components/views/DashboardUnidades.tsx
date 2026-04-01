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
  Legend,
} from "recharts";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { listarDistribuicaoPorUnidade } from "@/server/queries/dashboard";
import {
  CHART_COLORS,
  CHART_TICK_STYLE,
  CHART_TOOLTIP_STYLE,
} from "@/lib/dashboard-utils";
import type { UnidadeDistribuicao } from "@/lib/dashboard-utils";

const MAX_LABEL_LENGTH = 25;

type ViewMode = "chart" | "table";

const VIEW_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: "chart", label: "Gráfico" },
  { value: "table", label: "Tabela" },
];

function truncateLabel(text: string): string {
  return text.length > MAX_LABEL_LENGTH
    ? text.slice(0, MAX_LABEL_LENGTH) + "…"
    : text;
}

function UnidadesChart({ data }: { data: UnidadeDistribuicao[] }) {
  const chartData = data.map((r) => ({
    ...r,
    unidadeDescricao: truncateLabel(r.unidadeDescricao),
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 48)}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART_COLORS.grid} />
        <XAxis type="number" tick={CHART_TICK_STYLE} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis type="category" dataKey="unidadeDescricao" tick={CHART_TICK_STYLE} tickLine={false} axisLine={false} width={160} />
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="registradas" name="Registradas" stackId="a" fill={CHART_COLORS.secondary} radius={0} />
        <Bar dataKey="confirmadas" name="Confirmadas" stackId="a" fill={CHART_COLORS.primary} radius={0} />
        <Bar dataKey="pendentes" name="Pendentes" stackId="a" fill={CHART_COLORS.warning} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function UnidadesTable({ data }: { data: UnidadeDistribuicao[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Unidade</th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">Total</th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">Pendentes</th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">Confirmadas</th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">Registradas</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.unidadeId} className="border-b border-border last:border-0">
              <td className="px-3 py-2">{truncateLabel(row.unidadeDescricao)}</td>
              <td className="px-3 py-2 text-right font-medium">{row.total}</td>
              <td className="px-3 py-2 text-right text-jf-warning">{row.pendentes}</td>
              <td className="px-3 py-2 text-right text-primary">{row.confirmadas}</td>
              <td className="px-3 py-2 text-right text-secondary">{row.registradas}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DashboardUnidades() {
  const [data, setData] = useState<UnidadeDistribuicao[]>([]);
  const [isPending, startTransition] = useTransition();
  const [view, setView] = useState<ViewMode>("chart");

  useEffect(() => {
    startTransition(async () => {
      setData(await listarDistribuicaoPorUnidade());
    });
  }, []);

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">
          Distribuição por unidade
        </h3>
        <SegmentedControl value={view} onChange={setView} options={VIEW_OPTIONS} />
      </div>

      {isPending ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
          Sem dados disponíveis
        </div>
      ) : view === "chart" ? (
        <UnidadesChart data={data} />
      ) : (
        <UnidadesTable data={data} />
      )}
    </div>
  );
}
