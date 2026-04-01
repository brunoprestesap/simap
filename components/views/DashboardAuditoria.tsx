"use client";

import { useEffect, useState, useTransition } from "react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { ListSkeleton } from "@/components/common/ListSkeleton";
import { Pagination } from "@/components/common/Pagination";
import { Button } from "@/components/ui/button";
import { useUrlParams } from "@/lib/hooks/use-url-params";
import { listarRelatorioAuditoria } from "@/server/queries/auditoria";
import { listarUnidadesAtivas } from "@/server/queries/unidade";
import { formatDateBR } from "@/lib/format";
import { Filter, X } from "lucide-react";
import type { StatusMovimentacao } from "@/lib/generated/prisma/client";

type AuditoriaItem = Awaited<
  ReturnType<typeof listarRelatorioAuditoria>
>["movimentacoes"][number];

type Unidade = { id: string; codigo: string; descricao: string };

// ─── Sub-components ────────────────────────────────────

function AuditoriaFilterPanel({
  status,
  periodoInicio,
  periodoFim,
  unidadeId,
  responsavel,
  unidades,
  onUpdate,
}: {
  status: string;
  periodoInicio: string;
  periodoFim: string;
  unidadeId: string;
  responsavel: string;
  unidades: Unidade[];
  onUpdate: (updates: Record<string, string>) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5">
      <FilterField label="Período início">
        <input type="date" value={periodoInicio} onChange={(e) => onUpdate({ inicio: e.target.value })} className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm" />
      </FilterField>
      <FilterField label="Período fim">
        <input type="date" value={periodoFim} onChange={(e) => onUpdate({ fim: e.target.value })} className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm" />
      </FilterField>
      <FilterField label="Unidade">
        <select value={unidadeId} onChange={(e) => onUpdate({ unidade: e.target.value })} className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm">
          <option value="">Todas</option>
          {unidades.map((u) => (<option key={u.id} value={u.id}>{u.descricao}</option>))}
        </select>
      </FilterField>
      <FilterField label="Responsável">
        <input type="text" value={responsavel} onChange={(e) => onUpdate({ responsavel: e.target.value })} placeholder="Nome do técnico..." className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm" />
      </FilterField>
      <FilterField label="Status">
        <select value={status} onChange={(e) => onUpdate({ status: e.target.value })} className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm">
          <option value="">Todos</option>
          <option value="PENDENTE_CONFIRMACAO">Pendente</option>
          <option value="CONFIRMADA_ORIGEM">Confirmada</option>
          <option value="REGISTRADA_SICAM">Registrada SICAM</option>
          <option value="NAO_CONFIRMADA">Não Confirmada</option>
        </select>
      </FilterField>
    </div>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function AuditoriaTable({
  movimentacoes,
}: {
  movimentacoes: AuditoriaItem[];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Data</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">N.o Mov</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Origem / Destino</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Técnico</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Confirmado por</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Protocolo SICAM</th>
          </tr>
        </thead>
        <tbody>
          {movimentacoes.map((mov) => (
            <tr
              key={mov.id}
              className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
            >
              <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                {formatDateBR(mov.createdAt)}
              </td>
              <td className="px-3 py-2 font-mono text-xs">
                #{mov.codigo.slice(-6).toUpperCase()}
              </td>
              <td className="px-3 py-2 text-xs">
                {mov.unidadeOrigem.descricao} → {mov.unidadeDestino.descricao}
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground">
                {mov.tecnico.nome}
              </td>
              <td className="px-3 py-2">
                <StatusBadge status={mov.status} />
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground">
                {mov.confirmadoPorNome ?? "—"}
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground">
                {mov.protocoloSicam ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────

export function DashboardAuditoria() {
  const { getParam, pagina, updateParams, clearAll } = useUrlParams("/dashboard", {
    prefix: "aud_",
  });

  const [isPending, startTransition] = useTransition();
  const [movimentacoes, setMovimentacoes] = useState<AuditoriaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [showFilters, setShowFilters] = useState(true);

  const status = getParam("status") as StatusMovimentacao | "TODAS" | "";
  const periodoInicio = getParam("inicio");
  const periodoFim = getParam("fim");
  const unidadeId = getParam("unidade");
  const responsavel = getParam("responsavel");

  const hasFilters = !!(status || periodoInicio || periodoFim || unidadeId || responsavel);

  useEffect(() => {
    listarUnidadesAtivas().then(setUnidades);
  }, []);

  useEffect(() => {
    startTransition(async () => {
      const result = await listarRelatorioAuditoria({
        status: status || undefined,
        periodoInicio: periodoInicio || undefined,
        periodoFim: periodoFim || undefined,
        unidadeId: unidadeId || undefined,
        responsavel: responsavel || undefined,
        pagina,
      });
      setMovimentacoes(result.movimentacoes);
      setTotal(result.total);
      setTotalPaginas(result.totalPaginas);
    });
  }, [status, periodoInicio, periodoFim, unidadeId, responsavel, pagina]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">
          Relatório de auditoria
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="ml-auto"
        >
          <Filter className="h-4 w-4" data-icon="inline-start" />
          Filtros
        </Button>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearAll}>
            <X className="h-4 w-4" data-icon="inline-start" />
            Limpar
          </Button>
        )}
        <span className="text-sm text-muted-foreground">
          {total} resultado{total !== 1 ? "s" : ""}
        </span>
      </div>

      {showFilters && (
        <AuditoriaFilterPanel
          status={status}
          periodoInicio={periodoInicio}
          periodoFim={periodoFim}
          unidadeId={unidadeId}
          responsavel={responsavel}
          unidades={unidades}
          onUpdate={updateParams}
        />
      )}

      {isPending ? (
        <ListSkeleton count={3} height="h-12" />
      ) : movimentacoes.length === 0 ? (
        <EmptyState
          titulo="Sem resultados"
          mensagem="Nenhuma movimentação encontrada com os filtros aplicados."
        />
      ) : (
        <AuditoriaTable movimentacoes={movimentacoes} />
      )}

      <Pagination
        pagina={pagina}
        totalPaginas={totalPaginas}
        onPageChange={(page) => updateParams({ pagina: String(page) })}
      />
    </div>
  );
}
