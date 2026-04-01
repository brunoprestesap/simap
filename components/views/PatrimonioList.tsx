"use client";

import { useEffect, useState, useTransition } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import { ListSkeleton } from "@/components/common/ListSkeleton";
import { Pagination } from "@/components/common/Pagination";
import { useUrlParams } from "@/lib/hooks/use-url-params";
import { useDebouncedCallback } from "@/lib/hooks/use-debounced-callback";
import { listarPatrimonios } from "@/server/queries/patrimonio";
import { Package, Search } from "lucide-react";
import Link from "next/link";

type TomboItem = Awaited<ReturnType<typeof listarPatrimonios>>["tombos"][number];

interface PatrimonioListProps {
  unidadeId: string;
  unidadeNome: string;
  pendentesConfirmacao: number;
}

const FILTER_CHIPS = [
  { key: "todos", label: "Todos" },
  { key: "presentes", label: "Presentes" },
  { key: "em_movimentacao", label: "Em movimentação" },
] as const;

export function PatrimonioList({ unidadeId, unidadeNome, pendentesConfirmacao }: PatrimonioListProps) {
  const { searchParams, updateParams } = useUrlParams("/patrimonio");
  const [isPending, startTransition] = useTransition();
  const [tombos, setTombos] = useState<TomboItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);

  const busca = searchParams.get("busca") || "";
  const filtroStatus = (searchParams.get("filtro") as "todos" | "presentes" | "em_movimentacao") || "todos";
  const pagina = Number(searchParams.get("pagina")) || 1;

  const handleBuscaDebounced = useDebouncedCallback((valor: unknown) => {
    updateParams({ busca: valor as string });
  }, 300);

  useEffect(() => {
    startTransition(async () => {
      const result = await listarPatrimonios({
        unidadeId,
        busca: busca || undefined,
        filtroStatus,
        pagina,
      });
      setTombos(result.tombos);
      setTotal(result.total);
      setTotalPaginas(result.totalPaginas);
    });
  }, [unidadeId, busca, filtroStatus, pagina]);

  return (
    <div className="space-y-4">
      {/* Unit header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Package className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{unidadeNome}</h3>
          <p className="text-xs text-muted-foreground">{total} patrimônios</p>
        </div>
      </div>

      {/* Pending alert */}
      {pendentesConfirmacao > 0 && (
        <Link href="/home" className="block rounded-lg border border-jf-warning/30 bg-jf-warning/10 p-3">
          <p className="text-sm font-medium text-jf-warning">
            {pendentesConfirmacao} movimentaç{pendentesConfirmacao === 1 ? "ão" : "ões"} pendente{pendentesConfirmacao === 1 ? "" : "s"} de confirmação
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Toque para ver detalhes</p>
        </Link>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          defaultValue={busca}
          onChange={(e) => handleBuscaDebounced(e.target.value)}
          placeholder="Buscar por nº tombo ou descrição..."
          className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2">
        {FILTER_CHIPS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => updateParams({ filtro: key === "todos" ? "" : key })}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filtroStatus === key
                ? "bg-primary text-white"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isPending ? (
        <ListSkeleton />
      ) : tombos.length === 0 ? (
        <EmptyState titulo="Nenhum patrimônio encontrado" mensagem="Nenhum patrimônio vinculado à sua unidade." />
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="space-y-3 md:hidden">
            {tombos.map((tombo) => (
              <TomboCard key={tombo.id} tombo={tombo} />
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 font-medium text-muted-foreground">Nº Tombo</th>
                  <th className="pb-2 font-medium text-muted-foreground">Descrição</th>
                  <th className="pb-2 font-medium text-muted-foreground">Setor</th>
                  <th className="pb-2 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {tombos.map((tombo) => (
                  <TomboRow key={tombo.id} tombo={tombo} />
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
      />
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────

function MovimentacaoBadge({ emMovimentacao }: { emMovimentacao: boolean }) {
  return emMovimentacao ? (
    <span className="rounded-full bg-jf-warning/15 px-2 py-0.5 text-xs font-semibold text-jf-warning">
      Em movimentação
    </span>
  ) : (
    <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-semibold text-secondary">
      Presente
    </span>
  );
}

function TomboCard({ tombo }: { tombo: TomboItem }) {
  const emMovimentacao = tombo.itensMovimentacao.length > 0;
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground font-mono">{tombo.numero}</p>
          <p className="mt-0.5 text-sm text-foreground">{tombo.descricaoMaterial}</p>
          {tombo.setor && <p className="mt-0.5 text-xs text-muted-foreground">Setor: {tombo.setor.nome}</p>}
        </div>
        {emMovimentacao && <MovimentacaoBadge emMovimentacao />}
      </div>
    </div>
  );
}

function TomboRow({ tombo }: { tombo: TomboItem }) {
  const emMovimentacao = tombo.itensMovimentacao.length > 0;
  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-3 font-mono">{tombo.numero}</td>
      <td className="py-3">{tombo.descricaoMaterial}</td>
      <td className="py-3 text-muted-foreground">{tombo.setor?.nome || "—"}</td>
      <td className="py-3"><MovimentacaoBadge emMovimentacao={emMovimentacao} /></td>
    </tr>
  );
}
