"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { ListSkeleton } from "@/components/common/ListSkeleton";
import { Pagination } from "@/components/common/Pagination";
import { useUrlParams } from "@/lib/hooks/use-url-params";
import { useDebouncedCallback } from "@/lib/hooks/use-debounced-callback";
import { listarMeusTombos } from "@/server/queries/tombo";
import { nomeResponsavelExibicao } from "@/lib/tombo-responsavel";

type MeusTomboItem = Awaited<ReturnType<typeof listarMeusTombos>>["tombos"][number];

interface MeusTombosListProps {
  userId: string;
  matricula: string;
}

function TomboCard({ tombo }: { tombo: MeusTomboItem }) {
  const responsavel = nomeResponsavelExibicao(tombo);

  return (
    <Link
      href={`/tombos/${tombo.id}`}
      className="block rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/30"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-mono text-sm font-bold text-primary">#{tombo.numero}</p>
      </div>
      <p className="mt-1 text-sm font-medium text-foreground">{tombo.descricaoMaterial}</p>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {tombo.unidade && <span>{tombo.unidade.descricao}</span>}
        {tombo.setor && <span>/ {tombo.setor.nome}</span>}
        {responsavel && <span>• {responsavel}</span>}
      </div>
    </Link>
  );
}

function TomboRow({ tombo }: { tombo: MeusTomboItem }) {
  const responsavel = nomeResponsavelExibicao(tombo);

  return (
    <tr className="border-b border-border transition-colors last:border-0 hover:bg-muted/20">
      <td className="py-3 pr-4">
        <Link
          href={`/tombos/${tombo.id}`}
          className="font-mono text-sm font-bold text-primary hover:underline"
        >
          #{tombo.numero}
        </Link>
      </td>
      <td className="py-3 pr-4">
        <Link href={`/tombos/${tombo.id}`} className="text-sm text-foreground hover:underline">
          {tombo.descricaoMaterial}
        </Link>
      </td>
      <td className="py-3 pr-4 text-sm text-muted-foreground">
        {tombo.unidade?.descricao ?? "—"}
      </td>
      <td className="py-3 pr-4 text-sm text-muted-foreground">
        {tombo.setor?.nome ?? "—"}
      </td>
      <td className="py-3 text-sm text-muted-foreground">
        {responsavel ?? "—"}
      </td>
    </tr>
  );
}

export function MeusTombosList({ userId, matricula }: MeusTombosListProps) {
  const { searchParams, updateParams } = useUrlParams("/meus-tombos");
  const [isPending, startTransition] = useTransition();
  const [tombos, setTombos] = useState<MeusTomboItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);

  const busca = searchParams.get("busca") || "";
  const pagina = Number(searchParams.get("pagina")) || 1;

  const handleBuscaChange = useDebouncedCallback((valor: string) => {
    updateParams({ busca: valor });
  });

  useEffect(() => {
    startTransition(async () => {
      const result = await listarMeusTombos(userId, matricula, {
        busca: busca || undefined,
        pagina,
        porPagina: 20,
      });
      setTombos(result.tombos);
      setTotal(result.total);
      setTotalPaginas(result.totalPaginas);
    });
  }, [userId, matricula, busca, pagina]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          defaultValue={busca}
          onChange={(e) => handleBuscaChange(e.target.value)}
          placeholder="Buscar por nº tombo ou descrição..."
          className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          aria-label="Buscar tombos"
        />
      </div>

      {!isPending && (
        <p className="text-sm text-muted-foreground">
          {total} {total === 1 ? "tombo encontrado" : "tombos encontrados"}
        </p>
      )}

      {isPending ? (
        <ListSkeleton count={5} />
      ) : tombos.length === 0 ? (
        <EmptyState
          titulo="Nenhum tombo encontrado"
          mensagem={
            busca
              ? "Tente ajustar o termo de busca."
              : "Nenhum bem patrimonial está vinculado à sua matrícula no momento."
          }
        />
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="space-y-3 md:hidden">
            {tombos.map((tombo) => (
              <TomboCard key={tombo.id} tombo={tombo} />
            ))}
          </div>

          {/* Desktop: tabela */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 pr-4 font-medium text-muted-foreground">Nº Tombo</th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground">Descrição</th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground">Unidade</th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground">Setor</th>
                  <th className="pb-2 font-medium text-muted-foreground">Responsável</th>
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
        mobileLoadMore
      />
    </div>
  );
}
