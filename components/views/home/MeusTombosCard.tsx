"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { BookUser } from "lucide-react";
import { ListSkeleton } from "@/components/common/ListSkeleton";
import { Pagination } from "@/components/common/Pagination";
import { fetchMeusTombosPage } from "@/server/actions/tombo";
import { HomeEmptyState, HomePanel } from "./shared";
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
    <HomePanel
      title={`Meus tombos (${data.total} ${data.total === 1 ? "tombo" : "tombos"})`}
      action={{ href: "/meus-tombos", label: "Ver todos" }}
    >
      {isPending ? (
        <ListSkeleton count={5} height="h-14" />
      ) : data.tombos.length === 0 ? (
        <HomeEmptyState
          title="Nenhum tombo sob sua responsabilidade"
          message="Os bens vinculados à sua matrícula aparecerão aqui."
        />
      ) : (
        <div className="flex flex-col">
          {data.tombos.map((tombo) => (
            <Link
              key={tombo.id}
              href={`/tombos/${tombo.id}`}
              className="group -mx-4 flex items-start justify-between gap-3 border-b border-border px-4 py-3 last:border-0 transition-colors hover:bg-muted/30"
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
    </HomePanel>
  );
}
