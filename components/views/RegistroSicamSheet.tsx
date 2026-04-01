"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { FormField, FormInput, FormTextarea } from "@/components/common/FormInput";
import { FormError } from "@/components/common/FormError";
import { formatDateBR } from "@/lib/format";
import { registrarNoSicam } from "@/server/actions/registro-sicam";
import { X, CheckCircle2 } from "lucide-react";
import type { listarBacklog } from "@/server/queries/backlog";

type MovimentacaoItem = Awaited<ReturnType<typeof listarBacklog>>["movimentacoes"][number];

interface RegistroSicamSheetProps {
  movimentacao: MovimentacaoItem;
  onClose: () => void;
  onSuccess: () => void;
}

export function RegistroSicamSheet({ movimentacao, onClose, onSuccess }: RegistroSicamSheetProps) {
  const [isPending, startTransition] = useTransition();
  const [protocolo, setProtocolo] = useState("");
  const [dataRegistro, setDataRegistro] = useState(new Date().toISOString().split("T")[0]);
  const [observacoes, setObservacoes] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    startTransition(async () => {
      const result = await registrarNoSicam({
        movimentacaoId: movimentacao.id,
        protocoloSicam: protocolo.trim(),
        dataRegistroSicam: dataRegistro,
        observacoesSicam: observacoes.trim() || undefined,
      });

      if (result.success) {
        setSucesso(true);
        setTimeout(onSuccess, 1500);
      } else {
        setErro(result.error || "Erro ao registrar no SICAM.");
      }
    });
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} aria-hidden="true" />

      {/* Sheet */}
      <div className="fixed inset-y-0 right-0 z-50 w-full md:w-[480px] bg-card shadow-xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3 md:px-6">
          <h2 className="text-lg font-semibold text-foreground">Registrar no SICAM</h2>
          <button onClick={onClose} aria-label="Fechar" className="rounded-md p-1 hover:bg-accent transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {sucesso ? (
            <SuccessMessage protocolo={protocolo} />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Movement summary (read-only) */}
              <MovimentacaoResumo movimentacao={movimentacao} />

              <FormField label="Nº Protocolo SICAM" htmlFor="protocolo" required>
                <FormInput
                  id="protocolo"
                  value={protocolo}
                  onChange={(e) => setProtocolo(e.target.value)}
                  placeholder="Ex: 2024/001234"
                  autoFocus
                />
              </FormField>

              <FormField label="Data do Registro" htmlFor="dataRegistro" required>
                <FormInput
                  id="dataRegistro"
                  type="date"
                  value={dataRegistro}
                  onChange={(e) => setDataRegistro(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                />
              </FormField>

              <FormField label="Observações" htmlFor="observacoes" hint="opcional, max 500 caracteres">
                <FormTextarea
                  id="observacoes"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Observações adicionais..."
                />
                <p className="mt-1 text-xs text-muted-foreground text-right">{observacoes.length}/500</p>
              </FormField>

              <FormError error={erro} />

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
                <Button type="submit" className="flex-1" disabled={isPending}>
                  {isPending ? "Registrando..." : "Confirmar Registro"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Sub-components ─────────────────────────────────────

function MovimentacaoResumo({ movimentacao: mov }: { movimentacao: MovimentacaoItem }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-muted-foreground">
          #{mov.codigo.slice(-6).toUpperCase()}
        </span>
        <StatusBadge status={mov.status} />
      </div>
      <p className="text-sm font-medium text-foreground">
        {mov.unidadeOrigem.descricao} → {mov.unidadeDestino.descricao}
      </p>
      <p className="text-xs text-muted-foreground">
        {mov._count.itens} {mov._count.itens === 1 ? "tombo" : "tombos"} •
        Técnico: {mov.tecnico.nome} • {formatDateBR(mov.createdAt)}
      </p>
    </div>
  );
}

function SuccessMessage({ protocolo }: { protocolo: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <CheckCircle2 className="h-12 w-12 text-secondary mb-4" />
      <h3 className="text-lg font-semibold text-foreground">Registrado no SICAM com sucesso!</h3>
      <p className="mt-1 text-sm text-muted-foreground">Protocolo: {protocolo}</p>
    </div>
  );
}
