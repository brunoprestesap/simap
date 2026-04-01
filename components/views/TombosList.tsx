"use client";

import { useEffect, useState, useTransition } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import { ListSkeleton } from "@/components/common/ListSkeleton";
import { Pagination } from "@/components/common/Pagination";
import { Button } from "@/components/ui/button";
import { useUrlParams } from "@/lib/hooks/use-url-params";
import { useDebouncedCallback } from "@/lib/hooks/use-debounced-callback";
import { useColumnResize } from "@/lib/hooks/use-column-resize";
import {
  listarTombos,
  listarSetoresPorUnidade,
} from "@/server/queries/tombo";
import { listarUnidadesAtivas } from "@/server/queries/unidade";
import { Search, Filter, X } from "lucide-react";

type TomboItem = Awaited<ReturnType<typeof listarTombos>>["tombos"][number];

const STATUS_OPTIONS = [
  { value: "todos", label: "Todos" },
  { value: "ativos", label: "Ativos" },
  { value: "inativos", label: "Inativos" },
  { value: "em_movimentacao", label: "Em movimentação" },
] as const;

const COLUMNS = [
  { key: "numero", label: "Nº Tombo", defaultWidth: 120, minWidth: 80 },
  { key: "descricao", label: "Descrição", defaultWidth: 280, minWidth: 120 },
  { key: "unidade", label: "Unidade", defaultWidth: 160, minWidth: 80 },
  { key: "setor", label: "Setor", defaultWidth: 140, minWidth: 80 },
  { key: "responsavel", label: "Responsável", defaultWidth: 160, minWidth: 80 },
  { key: "status", label: "Status", defaultWidth: 130, minWidth: 90 },
] as const;

function TomboStatusBadge({ tombo }: { tombo: TomboItem }) {
  if (!tombo.ativo) {
    return (
      <span className="inline-flex items-center rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive">
        Inativo
      </span>
    );
  }
  if (tombo.itensMovimentacao.length > 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-jf-warning/15 px-2.5 py-0.5 text-xs font-semibold text-jf-warning">
        Em movimentação
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-secondary/10 px-2.5 py-0.5 text-xs font-semibold text-secondary">
      Ativo
    </span>
  );
}

export function TombosList() {
  const { searchParams, updateParams, clearAll } = useUrlParams("/tombos");
  const [isPending, startTransition] = useTransition();
  const [tombos, setTombos] = useState<TomboItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [unidades, setUnidades] = useState<
    { id: string; codigo: string; descricao: string }[]
  >([]);
  const [setores, setSetores] = useState<
    { id: string; codigo: string; nome: string }[]
  >([]);
  const [showFilters, setShowFilters] = useState(false);

  const { widths, onPointerDown, onPointerMove, onPointerUp } =
    useColumnResize(COLUMNS);

  const handleBuscaChange = useDebouncedCallback((valor: string) => {
    updateParams({ busca: valor });
  });

  const busca = searchParams.get("busca") || "";
  const unidadeId = searchParams.get("unidade") || "";
  const setorId = searchParams.get("setor") || "";
  const status = searchParams.get("status") || "todos";
  const pagina = Number(searchParams.get("pagina")) || 1;

  useEffect(() => {
    listarUnidadesAtivas().then(setUnidades);
  }, []);

  useEffect(() => {
    if (unidadeId) {
      listarSetoresPorUnidade(unidadeId).then(setSetores);
    } else {
      setSetores([]);
    }
  }, [unidadeId]);

  useEffect(() => {
    startTransition(async () => {
      const result = await listarTombos({
        busca: busca || undefined,
        unidadeId: unidadeId || undefined,
        setorId: setorId || undefined,
        status: status as "todos" | "ativos" | "inativos" | "em_movimentacao",
        pagina,
      });
      setTombos(result.tombos);
      setTotal(result.total);
      setTotalPaginas(result.totalPaginas);
    });
  }, [busca, unidadeId, setorId, status, pagina]);

  const hasFilters = unidadeId || setorId;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4" data-icon="inline-start" />
            Filtros
            {hasFilters && (
              <span className="ml-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white px-1">
                !
              </span>
            )}
          </Button>
          {(hasFilters || busca || status !== "todos") && (
            <Button variant="ghost" size="sm" onClick={clearAll}>
              <X className="h-4 w-4" data-icon="inline-start" />
              Limpar
            </Button>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nº ou descrição..."
            defaultValue={busca}
            onChange={(e) => handleBuscaChange(e.target.value)}
            className="h-9 w-48 rounded-md border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none sm:w-64"
          />
        </div>
      </div>

      {/* Status chips */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() =>
              updateParams({ status: opt.value === "todos" ? "" : opt.value })
            }
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              status === opt.value || (opt.value === "todos" && status === "todos")
                ? "bg-primary text-white"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Collapsible filter panel */}
      {showFilters && (
        <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Unidade
            </label>
            <select
              value={unidadeId}
              onChange={(e) => {
                const params: Record<string, string> = { unidade: e.target.value };
                if (e.target.value !== unidadeId) params.setor = "";
                updateParams(params);
              }}
              className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
            >
              <option value="">Todas</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.descricao}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Setor
            </label>
            <select
              value={setorId}
              onChange={(e) => updateParams({ setor: e.target.value })}
              disabled={!unidadeId}
              className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm disabled:opacity-50"
            >
              <option value="">Todos</option>
              {setores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Total counter */}
      <p className="text-sm text-muted-foreground">
        {total} {total === 1 ? "tombo" : "tombos"} encontrado{total !== 1 ? "s" : ""}
      </p>

      {/* Content */}
      {isPending ? (
        <ListSkeleton />
      ) : tombos.length === 0 ? (
        <EmptyState
          titulo="Nenhum tombo encontrado"
          mensagem="Tente ajustar os filtros de busca."
        />
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="space-y-3 md:hidden">
            {tombos.map((tombo) => (
              <div
                key={tombo.id}
                className="rounded-lg border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold font-mono text-foreground">
                    {tombo.numero}
                  </span>
                  <TomboStatusBadge tombo={tombo} />
                </div>
                <p className="mt-1 text-sm text-foreground line-clamp-2">
                  {tombo.descricaoMaterial}
                </p>
                <div className="mt-2 space-y-0.5">
                  {tombo.unidade && (
                    <p className="text-xs text-muted-foreground">
                      {tombo.unidade.descricao}
                    </p>
                  )}
                  {tombo.setor && (
                    <p className="text-xs text-muted-foreground">
                      Setor: {tombo.setor.nome}
                    </p>
                  )}
                  {tombo.servidorResponsavel && (
                    <p className="text-xs text-muted-foreground">
                      Resp: {tombo.servidorResponsavel.nome}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table with resizable columns */}
          <div className="hidden md:block overflow-x-auto">
            <table
              className="text-sm"
              style={{ tableLayout: "fixed", width: widths.reduce((a, b) => a + b, 0) }}
            >
              <colgroup>
                {widths.map((w, i) => (
                  <col key={COLUMNS[i].key} style={{ width: w }} />
                ))}
              </colgroup>
              <thead>
                <tr className="border-b border-border text-left">
                  {COLUMNS.map((col, i) => (
                    <th
                      key={col.key}
                      className="relative select-none pb-2 pr-4 font-medium text-muted-foreground"
                    >
                      {col.label}
                      {i < COLUMNS.length - 1 && (
                        <div
                          role="separator"
                          aria-orientation="vertical"
                          onPointerDown={(e) => onPointerDown(e, i)}
                          onPointerMove={onPointerMove}
                          onPointerUp={onPointerUp}
                          className="absolute -right-0.5 top-0 h-full w-2 cursor-col-resize touch-none select-none group"
                        >
                          <div className="mx-auto h-full w-px bg-transparent transition-colors group-hover:bg-primary/40 group-active:bg-primary" />
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tombos.map((tombo) => (
                  <tr
                    key={tombo.id}
                    className="border-b border-border last:border-0 hover:bg-muted/50"
                  >
                    <td className="truncate py-3 pr-4 font-mono font-medium">
                      {tombo.numero}
                    </td>
                    <td className="truncate py-3 pr-4">
                      {tombo.descricaoMaterial}
                    </td>
                    <td className="truncate py-3 pr-4 text-muted-foreground">
                      {tombo.unidade?.descricao || "—"}
                    </td>
                    <td className="truncate py-3 pr-4 text-muted-foreground">
                      {tombo.setor?.nome || "—"}
                    </td>
                    <td className="truncate py-3 pr-4 text-muted-foreground">
                      {tombo.servidorResponsavel?.nome || "—"}
                    </td>
                    <td className="py-3">
                      <TomboStatusBadge tombo={tombo} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
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
