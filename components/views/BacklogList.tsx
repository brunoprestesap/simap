"use client";

import { useEffect, useState, useTransition } from "react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { ListSkeleton } from "@/components/common/ListSkeleton";
import { Pagination } from "@/components/common/Pagination";
import { FormSelect } from "@/components/common/FormInput";
import { Button } from "@/components/ui/button";
import { useUrlParams } from "@/lib/hooks/use-url-params";
import { formatDateBR } from "@/lib/format";
import { listarBacklog } from "@/server/queries/backlog";
import { listarUnidadesAtivas } from "@/server/queries/unidade";
import { ArrowUpDown, Filter, X } from "lucide-react";
import type { StatusMovimentacao } from "@/lib/generated/prisma/client";

type BacklogItem = Awaited<ReturnType<typeof listarBacklog>>["movimentacoes"][number];

interface BacklogListProps {
  onRegistrar: (movimentacao: BacklogItem) => void;
}

export function BacklogList({ onRegistrar }: BacklogListProps) {
  const { searchParams, updateParams, clearAll } = useUrlParams("/backlog");
  const [isPending, startTransition] = useTransition();
  const [movimentacoes, setMovimentacoes] = useState<BacklogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [unidades, setUnidades] = useState<{ id: string; codigo: string; descricao: string }[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const status = (searchParams.get("status") as StatusMovimentacao | "TODAS") || "";
  const periodoInicio = searchParams.get("inicio") || "";
  const periodoFim = searchParams.get("fim") || "";
  const unidadeId = searchParams.get("unidade") || "";
  const ordenacao = (searchParams.get("ordem") as "recente" | "antiga" | "status") || "recente";
  const pagina = Number(searchParams.get("pagina")) || 1;

  const hasFilters = !!(status || periodoInicio || periodoFim || unidadeId);

  useEffect(() => {
    listarUnidadesAtivas().then(setUnidades);
  }, []);

  useEffect(() => {
    startTransition(async () => {
      const result = await listarBacklog({
        status: status || undefined,
        periodoInicio: periodoInicio || undefined,
        periodoFim: periodoFim || undefined,
        unidadeId: unidadeId || undefined,
        ordenacao,
        pagina,
      });
      setMovimentacoes(result.movimentacoes);
      setTotal(result.total);
      setTotalPaginas(result.totalPaginas);
    });
  }, [status, periodoInicio, periodoFim, unidadeId, ordenacao, pagina]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4" data-icon="inline-start" />
            Filtros
            {hasFilters && (
              <span className="ml-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white px-1">!</span>
            )}
          </Button>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearAll}>
              <X className="h-4 w-4" data-icon="inline-start" />
              Limpar filtros
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <FormSelect
            value={ordenacao}
            onChange={(e) => updateParams({ ordem: e.target.value })}
            aria-label="Ordenação"
            className="h-7 w-auto"
          >
            <option value="recente">Mais recente</option>
            <option value="antiga">Mais antiga</option>
            <option value="status">Status</option>
          </FormSelect>
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
          <FilterField label="Status">
            <FormSelect value={status} onChange={(e) => updateParams({ status: e.target.value })}>
              <option value="">Pendentes + Confirmadas</option>
              <option value="PENDENTE_CONFIRMACAO">Pendente</option>
              <option value="CONFIRMADA_ORIGEM">Confirmada</option>
              <option value="TODAS">Todas</option>
            </FormSelect>
          </FilterField>
          <FilterField label="Data início">
            <input type="date" value={periodoInicio} onChange={(e) => updateParams({ inicio: e.target.value })} className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm" />
          </FilterField>
          <FilterField label="Data fim">
            <input type="date" value={periodoFim} onChange={(e) => updateParams({ fim: e.target.value })} className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm" />
          </FilterField>
          <FilterField label="Unidade">
            <FormSelect value={unidadeId} onChange={(e) => updateParams({ unidade: e.target.value })}>
              <option value="">Todas</option>
              {unidades.map((u) => (<option key={u.id} value={u.id}>{u.descricao}</option>))}
            </FormSelect>
          </FilterField>
        </div>
      )}

      {/* Count */}
      <p className="text-sm text-muted-foreground">
        {total} movimentaç{total === 1 ? "ão" : "ões"} encontrada{total !== 1 ? "s" : ""}
      </p>

      {/* List */}
      {isPending ? (
        <ListSkeleton count={3} height="h-28" />
      ) : movimentacoes.length === 0 ? (
        <EmptyState titulo="Tudo em dia!" mensagem="Nenhuma movimentação pendente." />
      ) : (
        <div className="space-y-3">
          {movimentacoes.map((mov) => (
            <BacklogCard key={mov.id} mov={mov} onRegistrar={onRegistrar} />
          ))}
        </div>
      )}

      <Pagination
        pagina={pagina}
        totalPaginas={totalPaginas}
        onPageChange={(p) => updateParams({ pagina: String(p) })}
        mobileLoadMore
      />
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function BacklogCard({
  mov,
  onRegistrar,
}: {
  mov: BacklogItem;
  onRegistrar: (m: BacklogItem) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-muted-foreground">
              #{mov.codigo.slice(-6).toUpperCase()}
            </span>
            <span className="text-xs text-muted-foreground">{formatDateBR(mov.createdAt)}</span>
            <StatusBadge status={mov.status} />
          </div>
          <p className="mt-1 text-sm font-medium text-foreground">
            {mov.unidadeOrigem.descricao} → {mov.unidadeDestino.descricao}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {mov._count.itens} {mov._count.itens === 1 ? "tombo" : "tombos"} • Técnico: {mov.tecnico.nome}
          </p>
        </div>
        <div className="shrink-0">
          {mov.status === "CONFIRMADA_ORIGEM" ? (
            <Button size="sm" onClick={() => onRegistrar(mov)}>Registrar no SICAM</Button>
          ) : (
            <Button size="sm" variant="outline" disabled>Aguardando confirmação</Button>
          )}
        </div>
      </div>
    </div>
  );
}
