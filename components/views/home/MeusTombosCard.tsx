"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { BookUser, ChevronRight, Package } from "lucide-react";
import { ListSkeleton } from "@/components/common/ListSkeleton";
import { Pagination } from "@/components/common/Pagination";
import { fetchMeusTombosPage } from "@/server/actions/tombo";
import { HomeEmptyState } from "./shared";
import type { MeusTombosData } from "@/server/queries/tombo";

interface MeusTombosCardProps {
  initialData: MeusTombosData;
}

export function MeusTombosCard({ initialData }: MeusTombosCardProps) {
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();

  function handlePageChange(pagina: number) {
    startTransition(async () => {
      const result = await fetchMeusTombosPage(pagina);
      if (result.success) setData(result.data);
    });
  }

  return (
    <section className="rounded-xl border border-primary/25 bg-primary/5 p-4 md:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Package className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Meus tombos</h3>
            <p className="text-xs text-muted-foreground">Patrimônios sob sua custódia</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
            {data.total} {data.total === 1 ? "tombo" : "tombos"}
          </span>
          <Link
            href="/meus-tombos"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Ver todos
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {isPending ? (
        <ListSkeleton count={5} height="h-14" />
      ) : data.tombos.length === 0 ? (
        <HomeEmptyState
          title="Nenhum tombo sob sua responsabilidade"
          message="Os bens vinculados à sua matrícula aparecerão aqui."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border/60 bg-card">
          {data.tombos.map((tombo) => (
            <Link
              key={tombo.id}
              href={`/tombos/${tombo.id}`}
              aria-label={`Ver tombo #${tombo.numero} – ${tombo.descricaoMaterial}`}
              className="group flex items-start justify-between gap-3 border-b border-border/60 px-4 py-3 last:border-0 transition-colors hover:bg-primary/5"
            >
              <div className="min-w-0 flex-1">
                <p className="font-mono text-sm font-bold text-primary">
                  #{tombo.numero}
                </p>
                <p className="line-clamp-1 text-sm text-foreground">
                  {tombo.descricaoMaterial}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {tombo.unidade?.descricao ?? "—"}
                  {tombo.setor ? ` / ${tombo.setor.nome}` : ""}
                </p>
              </div>
              <BookUser
                className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
                aria-label="Tombo sob sua responsabilidade"
              />
            </Link>
          ))}
        </div>
      )}

      <Pagination
        pagina={data.paginaAtual}
        totalPaginas={data.totalPaginas}
        onPageChange={handlePageChange}
        mobileLoadMore
      />
    </section>
  );
}
