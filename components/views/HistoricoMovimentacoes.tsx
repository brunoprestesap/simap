"use client";

import { useEffect, useState, useTransition } from "react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { ListSkeleton } from "@/components/common/ListSkeleton";
import { Pagination } from "@/components/common/Pagination";
import { FormSelect, FormInput } from "@/components/common/FormInput";
import { Button } from "@/components/ui/button";
import { useUrlParams } from "@/lib/hooks/use-url-params";
import { formatDateBR } from "@/lib/format";
import { listarHistoricoMovimentacoes } from "@/server/queries/movimentacao";
import { listarUnidadesAtivas } from "@/server/queries/unidade";
import { Filter, X } from "lucide-react";
import Link from "next/link";
import type { StatusMovimentacao } from "@/lib/generated/prisma/client";

type MovItem = Awaited<ReturnType<typeof listarHistoricoMovimentacoes>>["movimentacoes"][number];

export function HistoricoMovimentacoes() {
  const { searchParams, updateParams, clearAll } = useUrlParams("/movimentacao/historico");
  const [isPending, startTransition] = useTransition();
  const [movimentacoes, setMovimentacoes] = useState<MovItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [unidades, setUnidades] = useState<{ id: string; codigo: string; descricao: string }[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const status = (searchParams.get("status") as StatusMovimentacao | "TODAS") || "";
  const periodoInicio = searchParams.get("inicio") || "";
  const periodoFim = searchParams.get("fim") || "";
  const unidadeId = searchParams.get("unidade") || "";
  const responsavel = searchParams.get("responsavel") || "";
  const pagina = Number(searchParams.get("pagina")) || 1;

  const hasFilters = !!(status || periodoInicio || periodoFim || unidadeId || responsavel);

  useEffect(() => {
    listarUnidadesAtivas().then(setUnidades);
  }, []);

  useEffect(() => {
    startTransition(async () => {
      const result = await listarHistoricoMovimentacoes({
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
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="h-4 w-4" data-icon="inline-start" />
          Filtros
        </Button>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearAll}>
            <X className="h-4 w-4" data-icon="inline-start" />
            Limpar
          </Button>
        )}
        <span className="ml-auto text-sm text-muted-foreground">
          {total} resultado{total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5">
          <FilterField label="Status">
            <FormSelect value={status} onChange={(e) => updateParams({ status: e.target.value })}>
              <option value="">Todas</option>
              <option value="PENDENTE_CONFIRMACAO">Pendente</option>
              <option value="CONFIRMADA_ORIGEM">Confirmada</option>
              <option value="REGISTRADA_SICAM">Registrada SICAM</option>
              <option value="NAO_CONFIRMADA">Não Confirmada</option>
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
          <FilterField label="Responsável">
            <FormInput value={responsavel} onChange={(e) => updateParams({ responsavel: e.target.value })} placeholder="Nome do técnico..." className="h-8" />
          </FilterField>
        </div>
      )}

      {/* Table */}
      {isPending ? (
        <ListSkeleton count={3} height="h-16" />
      ) : movimentacoes.length === 0 ? (
        <EmptyState titulo="Sem resultados" mensagem="Nenhuma movimentação encontrada com os filtros aplicados." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Código</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Data</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Origem → Destino</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Tombos</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Técnico</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {movimentacoes.map((mov) => (
                <tr key={mov.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">#{mov.codigo.slice(-6).toUpperCase()}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateBR(mov.createdAt)}</td>
                  <td className="px-4 py-3">{mov.unidadeOrigem.descricao} → {mov.unidadeDestino.descricao}</td>
                  <td className="px-4 py-3 text-center">{mov._count.itens}</td>
                  <td className="px-4 py-3 text-muted-foreground">{mov.tecnico.nome}</td>
                  <td className="px-4 py-3"><StatusBadge status={mov.status} /></td>
                  <td className="px-4 py-3">
                    <Link href={`/movimentacao/${mov.id}`} className="text-xs font-medium text-primary hover:underline">Detalhe</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        pagina={pagina}
        totalPaginas={totalPaginas}
        onPageChange={(p) => updateParams({ pagina: String(p) })}
      />
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
