"use client";

import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { FormField, FormInput, FormTextarea } from "@/components/common/FormInput";
import { FormError } from "@/components/common/FormError";
import { formatDateBR, toDateInputValueLocal } from "@/lib/format";
import { registrarNoSicam } from "@/server/actions/registro-sicam";
import { listarItensDaMovimentacao } from "@/server/queries/backlog";
import { X, CheckCircle2, ChevronDown, ChevronUp, Loader2, MapPin, User } from "lucide-react";
import type { listarBacklog } from "@/server/queries/backlog";

type MovimentacaoItem = Awaited<ReturnType<typeof listarBacklog>>["movimentacoes"][number];
type ItemMovimentacao = Awaited<ReturnType<typeof listarItensDaMovimentacao>>[number];

interface RegistroSicamSheetProps {
  movimentacao: MovimentacaoItem;
  onClose: () => void;
  onSuccess: () => void;
}

export function RegistroSicamSheet({ movimentacao, onClose, onSuccess }: RegistroSicamSheetProps) {
  const [isPending, startTransition] = useTransition();
  const [protocolo, setProtocolo] = useState("");
  const [dataRegistro, setDataRegistro] = useState(toDateInputValueLocal());
  const [observacoes, setObservacoes] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);

  // Tombos list
  const [itens, setItens] = useState<ItemMovimentacao[]>([]);
  const [isLoadingItens, startLoadItens] = useTransition();
  const [tombosExpanded, setTombosExpanded] = useState(true);

  useEffect(() => {
    startLoadItens(async () => {
      const result = await listarItensDaMovimentacao(movimentacao.id);
      setItens(result);
    });
  }, [movimentacao.id]);

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
      <div className="fixed inset-y-0 right-0 z-50 w-full md:w-[520px] bg-card shadow-xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3 md:px-6">
          <h2 className="text-lg font-semibold text-foreground">Registrar no SICAM</h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-md p-1 hover:bg-accent transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {sucesso ? (
            <SuccessMessage protocolo={protocolo} />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Movement summary */}
              <MovimentacaoResumo movimentacao={movimentacao} />

              {/* Tombos list */}
              <div className="rounded-lg border border-border bg-background">
                <button
                  type="button"
                  onClick={() => setTombosExpanded((v) => !v)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors rounded-lg"
                >
                  <span className="text-sm font-medium text-foreground">
                    Tombos a movimentar
                    <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      {movimentacao._count.itens}
                    </span>
                  </span>
                  {tombosExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                {tombosExpanded && (
                  <div className="border-t border-border">
                    {isLoadingItens ? (
                      <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Carregando tombos...
                      </div>
                    ) : (
                      <div className="max-h-64 overflow-y-auto divide-y divide-border">
                        {itens.map((item) => (
                          <div key={item.tombo.numero} className="px-4 py-2.5">
                            <div className="flex items-start gap-3">
                              <span className="mt-px font-mono text-xs font-semibold text-primary shrink-0">
                                #{item.tombo.numero}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm text-foreground leading-snug line-clamp-2">
                                  {item.tombo.descricaoMaterial || (
                                    <span className="italic text-muted-foreground">Sem descrição</span>
                                  )}
                                </p>
                                <div className="mt-0.5 flex flex-wrap gap-x-3">
                                  {item.tombo.setor && (
                                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                      <MapPin className="h-3 w-3 shrink-0" />
                                      {item.tombo.setor.nome}
                                    </span>
                                  )}
                                  {item.tombo.matriculaResponsavel && (
                                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                      <User className="h-3 w-3 shrink-0" />
                                      {item.tombo.matriculaResponsavel}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

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
                  max={toDateInputValueLocal()}
                />
              </FormField>

              <FormField
                label="Observações"
                htmlFor="observacoes"
                hint="opcional, max 500 caracteres"
              >
                <FormTextarea
                  id="observacoes"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Observações adicionais..."
                />
                <p className="mt-1 text-xs text-muted-foreground text-right">
                  {observacoes.length}/500
                </p>
              </FormField>

              <FormError error={erro} />

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                >
                  Cancelar
                </Button>
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

// ─── Sub-components ─────────────────────────────────────────────────────────

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
        {mov._count.itens} {mov._count.itens === 1 ? "tombo" : "tombos"} • Técnico:{" "}
        {mov.tecnico.nome} • {formatDateBR(mov.createdAt)}
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
