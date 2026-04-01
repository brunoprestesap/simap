import { requireAuth } from "@/lib/auth-guard";
import { notFound } from "next/navigation";
import { buscarMovimentacaoDetalhada } from "@/server/queries/movimentacao";
import { StatusBadge } from "@/components/common/StatusBadge";
import { MovimentacaoTimeline } from "@/components/common/MovimentacaoTimeline";
import {
  MovimentacaoDataCard,
  TombosTable,
} from "@/components/views/MovimentacaoDetailParts";
import { formatDateLongBR } from "@/lib/format";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MovimentacaoDetalhePage({ params }: Props) {
  await requireAuth();

  const { id } = await params;
  const mov = await buscarMovimentacaoDetalhada(id);
  if (!mov) notFound();

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/movimentacao/historico"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar ao histórico
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Movimentação #{mov.codigo.slice(-6).toUpperCase()}
          </h2>
          <p className="text-sm text-muted-foreground">
            {formatDateLongBR(mov.createdAt)}
          </p>
        </div>
        <StatusBadge status={mov.status} />
      </div>

      {/* Movement data card */}
      <MovimentacaoDataCard mov={mov} />

      {/* Timeline */}
      {mov.status !== "NAO_CONFIRMADA" && (
        <MovimentacaoTimeline
          status={mov.status}
          dates={{
            createdAt: mov.createdAt,
            confirmadoEm: mov.confirmadoEm,
            dataRegistroSicam: mov.dataRegistroSicam,
          }}
        />
      )}

      {/* Non-confirmed special state */}
      {mov.status === "NAO_CONFIRMADA" && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-destructive">
            Movimentação não confirmada
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            O token de confirmação expirou sem que a movimentação fosse confirmada.
          </p>
        </div>
      )}

      {/* Tombos list */}
      <TombosTable itens={mov.itens} />
    </div>
  );
}
