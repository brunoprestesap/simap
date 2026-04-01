"use client";

import type { RefObject } from "react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Package,
  ScanLine,
  Search,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  SetorResumo,
  TomboSelecionado,
  UnidadeResumo,
} from "@/lib/movimentacao-types";
import { cn } from "@/lib/utils";

export function MovimentacaoSuccessScreen({
  tombosCount,
  origemDescricao,
  destinoDescricao,
  onNova,
}: {
  tombosCount: number;
  origemDescricao?: string;
  destinoDescricao?: string;
  onNova: () => void;
}) {
  return (
    <div className="mx-auto max-w-3xl rounded-lg border border-border bg-card p-6 sm:p-8">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10 text-secondary">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <span className="mt-4 inline-flex items-center rounded-full bg-secondary/10 px-2.5 py-1 text-xs font-semibold text-secondary">
          Registro concluído
        </span>
        <h3 className="mt-4 text-xl font-semibold text-foreground sm:text-2xl">
          Movimentação registrada com sucesso
        </h3>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          {tombosCount} tombo(s) foram encaminhados de{" "}
          <strong>{origemDescricao ?? "—"}</strong> para{" "}
          <strong>{destinoDescricao ?? "—"}</strong>. Os responsáveis já podem
          acompanhar a confirmação por e-mail.
        </p>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <SuccessMetric
          icon={Package}
          label="Tombos"
          value={`${tombosCount} ${tombosCount === 1 ? "item" : "itens"}`}
        />
        <SuccessMetric
          icon={Building2}
          label="Origem"
          value={origemDescricao ?? "—"}
        />
        <SuccessMetric
          icon={ArrowRight}
          label="Destino"
          value={destinoDescricao ?? "—"}
        />
      </div>

      <div className="mt-8 flex justify-center">
        <Button size="lg" onClick={onNova}>
          <ScanLine className="mr-2 h-4 w-4" />
          Registrar nova movimentação
        </Button>
      </div>
    </div>
  );
}

export function MovimentacaoOrigemDestinoCard({
  unidadeOrigem,
  setorOrigem,
  selectedUnidade,
  selectedSetor,
}: {
  unidadeOrigem?: UnidadeResumo | null;
  setorOrigem: SetorResumo | null;
  selectedUnidade?: UnidadeResumo;
  selectedSetor?: SetorResumo;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4 sm:p-5">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center">
        <LocationPanel
          label="Origem"
          unidade={unidadeOrigem ?? null}
          setor={setorOrigem}
        />

        <div className="hidden md:flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-primary">
          <ArrowRight className="h-4 w-4" />
        </div>

        <div className="flex justify-center md:hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-primary">
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>

        <LocationPanel
          label="Destino"
          unidade={selectedUnidade ?? null}
          setor={selectedSetor ?? null}
          emptyMessage="Selecione a unidade abaixo"
          highlight={!!selectedUnidade}
        />
      </div>
    </div>
  );
}

export function MovimentacaoUnidadeCombobox({
  dropdownRef,
  searchQuery,
  showDropdown,
  filteredUnidades,
  selectedUnidadeId,
  onSearchQueryChange,
  onFocus,
  onSelectUnidade,
}: {
  dropdownRef: RefObject<HTMLDivElement | null>;
  searchQuery: string;
  showDropdown: boolean;
  filteredUnidades: UnidadeResumo[];
  selectedUnidadeId: string;
  onSearchQueryChange: (value: string) => void;
  onFocus: () => void;
  onSelectUnidade: (unidade: UnidadeResumo) => void;
}) {
  return (
    <div className="space-y-2" ref={dropdownRef}>
      <div className="space-y-1">
        <label className="block text-sm font-medium text-foreground">
          Unidade de destino
        </label>
        <p className="text-xs text-muted-foreground">
          Busque pela sigla ou descrição da lotação que receberá os tombos.
        </p>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          onFocus={onFocus}
          placeholder="Buscar unidade..."
          className="h-11 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
        />
        {showDropdown && (
          <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            {filteredUnidades.length === 0 ? (
              <div className="px-4 py-3 text-sm text-muted-foreground">
                Nenhuma unidade encontrada.
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto p-1">
                {filteredUnidades.map((unidade) => (
                  <button
                    key={unidade.id}
                    type="button"
                    onClick={() => onSelectUnidade(unidade)}
                    className={cn(
                      "w-full rounded-md px-3 py-2.5 text-left transition-colors hover:bg-muted/60",
                      unidade.id === selectedUnidadeId
                        ? "bg-primary/10 text-primary"
                        : "text-foreground",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold">
                        {unidade.codigo}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Lotação
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-5">
                      {unidade.descricao}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function MovimentacaoSetorSelect({
  setores,
  value,
  onChange,
}: {
  setores: SetorResumo[];
  value: string;
  onChange: (value: string) => void;
}) {
  if (setores.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <label className="block text-sm font-medium text-foreground">
          Setor de destino
        </label>
        <p className="text-xs text-muted-foreground">
          Opcionalmente, selecione o setor interno da unidade de destino.
        </p>
      </div>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
      >
        <option value="">Selecione o setor (opcional)</option>
        {setores.map((setor) => (
          <option key={setor.id} value={setor.id}>
            {setor.nome}
          </option>
        ))}
      </select>
    </div>
  );
}

export function MovimentacaoTombosList({
  tombos,
}: {
  tombos: TomboSelecionado[];
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/20">
      <div className="flex items-center justify-between gap-3 border-b border-border p-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            Itens do lote
          </p>
          <p className="text-sm font-semibold text-foreground">
            Tombos selecionados
          </p>
        </div>
        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
          {tombos.length}
        </span>
      </div>
      <div className="max-h-72 space-y-3 overflow-y-auto p-4">
        {tombos.map((tombo) => (
          <div
            key={tombo.numero}
            className="rounded-lg border border-border bg-card p-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                {tombo.numero}
              </span>
              {tombo.unidade?.codigo && (
                <span className="text-xs font-medium text-muted-foreground">
                  {tombo.unidade.codigo}
                </span>
              )}
            </div>
            <p className="mt-2 text-sm font-medium leading-5 text-foreground">
              {tombo.descricaoMaterial}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SuccessMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-sm font-semibold text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}

function LocationPanel({
  label,
  unidade,
  setor,
  emptyMessage = "Nenhuma unidade selecionada",
  highlight = false,
}: {
  label: string;
  unidade: UnidadeResumo | null;
  setor: SetorResumo | null;
  emptyMessage?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        highlight
          ? "border-primary/20 bg-primary/5"
          : unidade
            ? "border-border bg-card"
            : "border-dashed border-border bg-card",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/20 text-primary">
          <Building2 className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          {unidade ? (
            <>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {unidade.descricao}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Código {unidade.codigo}
              </p>
              {setor && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Setor: {setor.nome}
                </p>
              )}
            </>
          ) : (
            <p className="mt-1 text-sm italic text-muted-foreground">
              {emptyMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
