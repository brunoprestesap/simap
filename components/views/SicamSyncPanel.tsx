"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sincronizarComSicam } from "@/server/actions/sicam-sync";
import type { SincronizarComSicamResult } from "@/server/actions/sicam-sync";

export function SicamSyncPanel({
  podeIniciar,
  conexaoOk,
}: {
  podeIniciar: boolean;
  conexaoOk: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [resultado, setResultado] = useState<SincronizarComSicamResult | null>(
    null,
  );

  function handleSync() {
    setResultado(null);
    startTransition(async () => {
      const r = await sincronizarComSicam();
      setResultado(r);
      // Atualiza o histórico (Server Component) sem refresh do navegador.
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">
            Sincronizar com SICAM
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Importa todos os tombos ativos do SICAM e atualiza o cache local.
            Tombos que sumiram do SICAM permanecem no SIMAP (não são removidos).
          </p>
        </div>
        <Button
          onClick={handleSync}
          disabled={isPending || !podeIniciar || !conexaoOk}
          className="shrink-0"
        >
          <RefreshCw
            className={`mr-1.5 h-4 w-4 ${isPending ? "animate-spin" : ""}`}
          />
          {isPending ? "Sincronizando…" : "Sincronizar agora"}
        </Button>
      </div>

      {!podeIniciar && (
        <p className="mt-3 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          Apenas GESTOR_ADMIN pode disparar o sync.
        </p>
      )}

      {!conexaoOk && podeIniciar && (
        <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          Conexão SICAM Oracle indisponível — corrija o erro acima antes de
          sincronizar.
        </p>
      )}

      {isPending && (
        <p className="mt-3 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          Sincronizando — pode levar 30s a 2 minutos. Não feche esta aba.
        </p>
      )}

      {resultado && !isPending && resultado.success && resultado.data && (
        <div className="mt-3 rounded-md border border-jf-green/40 bg-jf-green/5 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-jf-green">
            <CheckCircle2 className="h-4 w-4" />
            Sincronização concluída
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-foreground sm:grid-cols-4">
            <div>
              <dt className="uppercase tracking-wider text-muted-foreground">
                Processados
              </dt>
              <dd className="font-mono">
                {resultado.data.totalProcessados.toLocaleString("pt-BR")}
              </dd>
            </div>
            <div>
              <dt className="uppercase tracking-wider text-muted-foreground">
                Novos
              </dt>
              <dd className="font-mono">
                {resultado.data.novos.toLocaleString("pt-BR")}
              </dd>
            </div>
            <div>
              <dt className="uppercase tracking-wider text-muted-foreground">
                Atualizados
              </dt>
              <dd className="font-mono">
                {resultado.data.atualizados.toLocaleString("pt-BR")}
              </dd>
            </div>
            <div>
              <dt className="uppercase tracking-wider text-muted-foreground">
                Erros
              </dt>
              <dd
                className={`font-mono ${resultado.data.erros > 0 ? "text-destructive" : ""}`}
              >
                {resultado.data.erros.toLocaleString("pt-BR")}
              </dd>
            </div>
          </dl>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-jf-green/20 pt-2 text-xs text-foreground">
            <div>
              <dt className="uppercase tracking-wider text-muted-foreground">
                Histórico sincronizado
              </dt>
              <dd className="font-mono">
                {resultado.data.historicosSincronizados.toLocaleString("pt-BR")}
              </dd>
            </div>
            <div>
              <dt className="uppercase tracking-wider text-muted-foreground">
                Erros histórico
              </dt>
              <dd
                className={`font-mono ${resultado.data.errosFaseHistorico > 0 ? "text-destructive" : ""}`}
              >
                {resultado.data.errosFaseHistorico.toLocaleString("pt-BR")}
              </dd>
            </div>
          </dl>
          <p className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
            Duração: {(resultado.data.duracaoMs / 1000).toFixed(1)}s
          </p>
        </div>
      )}

      {resultado && !isPending && !resultado.success && (
        <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/5 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Sincronização falhou
          </div>
          <p className="mt-1 wrap-break-word text-xs text-destructive">
            {resultado.error}
            {resultado.oraCode
              ? ` (ORA-${String(resultado.oraCode).padStart(5, "0")})`
              : ""}
          </p>
        </div>
      )}
    </div>
  );
}
