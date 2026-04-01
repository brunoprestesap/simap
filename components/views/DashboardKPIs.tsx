import { Suspense } from "react";
import { KPICard } from "@/components/common/KPICard";
import { calcTendencia } from "@/lib/dashboard-utils";
import {
  calcularTempoMedioRegistroSicam,
  contarPendentesSicam,
  contarPendentesConfirmacaoGeral,
} from "@/server/queries/dashboard";

function KPISkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm animate-pulse">
      <div className="h-4 w-24 rounded bg-muted" />
      <div className="mt-2 h-8 w-16 rounded bg-muted" />
      <div className="mt-2 h-3 w-32 rounded bg-muted" />
    </div>
  );
}

function formatTempoMedio(dias: number): string {
  if (dias === 0) return "—";
  return `${dias.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dias`;
}

async function TempoMedioKPI() {
  const { tempoMedioDias, tempoMedioPeriodoAnterior } =
    await calcularTempoMedioRegistroSicam();

  return (
    <KPICard
      label="Tempo médio de registro no SICAM"
      value={formatTempoMedio(tempoMedioDias)}
      color="text-foreground"
      tendencia={calcTendencia(tempoMedioDias, tempoMedioPeriodoAnterior)}
    />
  );
}

async function PendentesSicamKPI() {
  const count = await contarPendentesSicam();
  return (
    <KPICard
      label="Pendentes de registro no SICAM"
      value={count}
      color="text-jf-warning"
      borderColor="#D4A017"
      link={{ href: "/backlog?status=CONFIRMADA_ORIGEM", label: "Ver backlog" }}
    />
  );
}

async function PendentesConfirmacaoKPI() {
  const count = await contarPendentesConfirmacaoGeral();
  return (
    <KPICard
      label="Pendentes de confirmação"
      value={count}
      color="text-primary"
      borderColor="#003366"
    />
  );
}

export function DashboardKPIs() {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
      <Suspense fallback={<KPISkeleton />}>
        <TempoMedioKPI />
      </Suspense>
      <Suspense fallback={<KPISkeleton />}>
        <PendentesSicamKPI />
      </Suspense>
      <Suspense fallback={<KPISkeleton />}>
        <PendentesConfirmacaoKPI />
      </Suspense>
    </div>
  );
}
