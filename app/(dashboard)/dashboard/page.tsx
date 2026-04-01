import { Suspense } from "react";
import { requireRole } from "@/lib/auth-guard";
import { DashboardKPIs } from "@/components/views/DashboardKPIs";
import { DashboardChart } from "@/components/views/DashboardChart";
import { DashboardUnidades } from "@/components/views/DashboardUnidades";
import { DashboardAuditoria } from "@/components/views/DashboardAuditoria";

export default async function DashboardPage() {
  await requireRole(["GESTOR_ADMIN"]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Dashboard gerencial
        </h2>
        <p className="text-sm text-muted-foreground">
          Visão geral das movimentações patrimoniais
        </p>
      </div>

      {/* KPIs */}
      <DashboardKPIs />

      {/* Charts row */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Suspense
          fallback={
            <div className="h-80 animate-pulse rounded-lg border border-border bg-card" />
          }
        >
          <DashboardChart />
        </Suspense>
        <Suspense
          fallback={
            <div className="h-80 animate-pulse rounded-lg border border-border bg-card" />
          }
        >
          <DashboardUnidades />
        </Suspense>
      </div>

      {/* Auditoria */}
      <Suspense
        fallback={
          <div className="h-64 animate-pulse rounded-lg border border-border bg-card" />
        }
      >
        <DashboardAuditoria />
      </Suspense>
    </div>
  );
}
