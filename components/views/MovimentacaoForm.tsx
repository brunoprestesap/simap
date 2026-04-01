"use client";

import { useState, type FormEvent } from "react";
import {
  Building2,
  X,
  Keyboard,
  ScanLine,
  Plus,
  ArrowRight,
  AlertCircle,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Scanner } from "@/components/common/Scanner";
import type { ToastType } from "@/lib/hooks/use-toast";
import { useTomboSelection } from "@/lib/hooks/use-tombo-selection";
import type { TomboSelecionado } from "@/lib/movimentacao-types";
import { cn } from "@/lib/utils";

interface MovimentacaoFormProps {
  onAvancar: (tombos: TomboSelecionado[]) => void;
}

const TOAST_STYLES: Record<ToastType, string> = {
  error: "border-destructive/20 bg-destructive/10 text-destructive",
  warning: "border-jf-warning/20 bg-jf-warning/10 text-jf-warning",
  info: "border-primary/20 bg-primary/10 text-primary",
  success: "border-secondary/20 bg-secondary/10 text-secondary",
};

export function MovimentacaoForm({ onAvancar }: MovimentacaoFormProps) {
  const [manualMode, setManualMode] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const { tombos, toast, isAddingTombo, addTombo, removeTombo } =
    useTomboSelection();

  async function handleManualSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const codigo = manualInput.trim();

    if (codigo) {
      setManualInput("");
      await addTombo(codigo);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <section className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-foreground">
                Captura de Tombos
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Escaneie ou digite os códigos de barras dos bens.
              </p>
            </div>

            <div className="inline-flex rounded-lg border border-border bg-muted/50 p-1">
              <button
                type="button"
                onClick={() => setManualMode(false)}
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                  !manualMode
                    ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <ScanLine className="h-4 w-4" />
                Scanner
              </button>
              <button
                type="button"
                onClick={() => setManualMode(true)}
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                  manualMode
                    ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Keyboard className="h-4 w-4" />
                Manual
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 p-6">
          {manualMode ? (
            <ManualInput
              value={manualInput}
              onChange={setManualInput}
              onSubmit={handleManualSubmit}
              onSwitchToScanner={() => setManualMode(false)}
              disabled={isAddingTombo}
            />
          ) : (
            <div className="mx-auto max-w-md space-y-4">
              <div className="overflow-hidden rounded-xl border border-border bg-muted/30 shadow-inner">
                <div className="aspect-video w-full sm:h-72">
                  <Scanner onScan={addTombo} />
                </div>
              </div>

              {/* Quick manual input below scanner */}
              <form
                onSubmit={handleManualSubmit}
                className="flex gap-2"
              >
                <input
                  type="text"
                  inputMode="numeric"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="Digitar nº do tombo"
                  className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm font-mono outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!manualInput.trim() || isAddingTombo}
                  className="h-10 px-4"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </form>

              <p className="text-center text-xs text-muted-foreground">
                Não leu? Digite o número do tombo acima.
              </p>
            </div>
          )}
        </div>
      </section>

      <aside className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm lg:sticky lg:top-6 lg:max-h-[calc(100vh-8rem)]">
        <div className="border-b border-border p-5">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold tracking-tight text-foreground">
              Lote Atual
            </h4>
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary/10 px-2 text-xs font-semibold text-primary">
              {tombos.length}
            </span>
          </div>
        </div>

        {toast && (
          <div className="px-5 pt-5">
            <div
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 text-sm",
                TOAST_STYLES[toast.type]
              )}
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{toast.message}</span>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5">
          {tombos.length === 0 ? (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50 text-muted-foreground">
                <Package className="h-6 w-6" />
              </div>
              <p className="mt-4 text-sm font-medium text-foreground">
                Nenhum bem adicionado
              </p>
              <p className="mt-1 max-w-[200px] text-xs text-muted-foreground">
                Os tombos capturados aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tombos.map((tombo) => (
                <TomboCard
                  key={tombo.numero}
                  tombo={tombo}
                  onRemove={removeTombo}
                />
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-border bg-muted/10 p-5">
          <Button
            size="lg"
            className="w-full shadow-sm"
            disabled={tombos.length === 0 || isAddingTombo}
            onClick={() => onAvancar(tombos)}
          >
            Avançar
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </aside>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────── */

function ManualInput({
  value,
  onChange,
  onSubmit,
  onSwitchToScanner,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onSwitchToScanner: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex h-full flex-col justify-center rounded-lg border border-border bg-muted/20 p-5 sm:p-8">
      <div className="mx-auto w-full max-w-xl space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card text-primary">
            <Keyboard className="h-6 w-6" />
          </div>
          <h4 className="mt-4 text-lg font-semibold text-foreground">
            Digitação manual do tombo
          </h4>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Use este modo quando o código de barras não estiver legível ou a
            câmera não puder ser utilizada no dispositivo atual.
          </p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            inputMode="numeric"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Nº do tombo"
            autoFocus
            className="h-11 flex-1 rounded-lg border border-border bg-background px-4 text-sm font-mono outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <Button
            type="submit"
            size="lg"
            disabled={!value.trim() || disabled}
            className="sm:min-w-36"
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </form>

        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-xs text-muted-foreground">
            Digite apenas o número do tombo para consultar o bem.
          </p>
          <button
            type="button"
            onClick={onSwitchToScanner}
            className="inline-flex items-center justify-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <ScanLine className="h-4 w-4" />
            Voltar ao scanner
          </button>
        </div>
      </div>
    </div>
  );
}

function CaptureSupportItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ScanLine;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted/20 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-sm font-medium leading-5 text-foreground">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function TomboCard({
  tombo,
  onRemove,
}: {
  tombo: TomboSelecionado;
  onRemove: (numero: string) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              {tombo.numero}
            </span>
            {tombo.unidade?.codigo && (
              <span className="text-xs font-medium text-muted-foreground">
                Lotação {tombo.unidade.codigo}
              </span>
            )}
          </div>

          <p className="text-sm font-semibold leading-5 text-foreground">
            {tombo.descricaoMaterial}
          </p>

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1">
              {tombo.unidade?.descricao ?? "Sem lotação"}
            </span>
            {tombo.setor && (
              <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1">
                {tombo.setor.nome}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onRemove(tombo.numero)}
          className="shrink-0 rounded-md p-2 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          aria-label={`Remover tombo ${tombo.numero}`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
