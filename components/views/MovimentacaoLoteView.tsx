"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { listarTombos, listarSetoresPorUnidade } from "@/server/queries/tombo";
import { criarMovimentacao } from "@/server/actions/movimentacao";
import type { SetorResumo, TomboSelecionado, UnidadeResumo } from "@/lib/movimentacao-types";
import { Pagination } from "@/components/common/Pagination";
import {
  MovimentacaoSetorSelect,
  MovimentacaoSuccessScreen,
  MovimentacaoTombosList,
  MovimentacaoUnidadeCombobox,
} from "@/components/views/MovimentacaoConfirmacaoParts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertCircle, Check, ChevronRight, Loader2, Package, Search, X } from "lucide-react";
import { useDebouncedCallback } from "@/lib/hooks/use-debounced-callback";

type Step = "selecao" | "destino" | "sucesso";
type TomboItem = Awaited<ReturnType<typeof listarTombos>>["tombos"][number];
type UnidadeComStatus = UnidadeResumo & { ativo: boolean };

interface TomboData {
  tombos: TomboItem[];
  total: number;
  totalPaginas: number;
}

interface Props {
  perfilAtual: "SERVIDOR_SEMAP" | "SERVIDOR_RESPONSAVEL";
  /** Apenas unidades ativas — usadas para o combobox de destino */
  unidadesAtivas: UnidadeResumo[];
  /** Todas as unidades (ativas + inativas) — usadas para o combobox de origem (SEMAP) */
  todasUnidades: UnidadeComStatus[];
  unidadeFixa?: UnidadeResumo;
}

function toTomboSelecionado(t: TomboItem): TomboSelecionado {
  return {
    id: t.id,
    numero: t.numero,
    descricaoMaterial: t.descricaoMaterial,
    unidade: t.unidade,
    setor: t.setor,
    usuarioResponsavel: t.usuarioResponsavel,
    matriculaResponsavel: t.matriculaResponsavel,
    nomeResponsavel: t.nomeResponsavel,
  };
}

// ── Stepper ───────────────────────────────────────────────────────────────────

function Stepper({ current }: { current: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "selecao", label: "Seleção" },
    { key: "destino", label: "Destino" },
    { key: "sucesso", label: "Concluído" },
  ];
  const currentIdx = steps.findIndex((s) => s.key === current);

  return (
    <div className="flex items-center">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center">
          <div className="flex items-center gap-1.5">
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                i < currentIdx
                  ? "bg-secondary text-white"
                  : i === currentIdx
                    ? "bg-primary text-white"
                    : "border border-border bg-background text-muted-foreground",
              )}
            >
              {i < currentIdx ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span
              className={cn(
                "text-sm",
                i === currentIdx ? "font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && <div className="mx-3 h-px w-8 bg-border" />}
        </div>
      ))}
    </div>
  );
}

// ── Combobox de origem (inclui unidades inativas) ─────────────────────────────

function OrigemUnidadeCombobox({
  dropdownRef,
  searchQuery,
  showDropdown,
  filteredUnidades,
  selectedUnidadeId,
  onSearchQueryChange,
  onFocus,
  onSelectUnidade,
}: {
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  searchQuery: string;
  showDropdown: boolean;
  filteredUnidades: UnidadeComStatus[];
  selectedUnidadeId: string;
  onSearchQueryChange: (value: string) => void;
  onFocus: () => void;
  onSelectUnidade: (unidade: UnidadeComStatus) => void;
}) {
  return (
    <div className="space-y-2" ref={dropdownRef}>
      <div className="space-y-1">
        <label className="block text-sm font-medium text-foreground">Unidade de origem</label>
        <p className="text-xs text-muted-foreground">
          Busque pela sigla ou descrição — inclui unidades inativas.
        </p>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
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
                {filteredUnidades.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => onSelectUnidade(u)}
                    className={cn(
                      "w-full rounded-md px-3 py-2.5 text-left transition-colors hover:bg-muted/60",
                      u.id === selectedUnidadeId ? "bg-primary/10 text-primary" : "text-foreground",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold">{u.codigo}</span>
                      {!u.ativo && (
                        <span className="rounded-full bg-destructive/10 px-1.5 py-px text-[10px] font-medium text-destructive">
                          Inativa
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm leading-5">{u.descricao}</p>
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

// ── Main component ────────────────────────────────────────────────────────────

export function MovimentacaoLoteView({
  perfilAtual,
  unidadesAtivas,
  todasUnidades,
  unidadeFixa,
}: Props) {
  const isSemap = perfilAtual === "SERVIDOR_SEMAP";

  // ── Wizard step ───────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>("selecao");

  // ── Step 1: Seleção ───────────────────────────────────────────────────────
  const [selectedMap, setSelectedMap] = useState<Map<string, TomboSelecionado>>(new Map());
  const [unidadeOrigem, setUnidadeOrigem] = useState<UnidadeResumo | null>(unidadeFixa ?? null);
  const [setoresOrigem, setSetoresOrigem] = useState<SetorResumo[]>([]);
  const [isLoadingSetoresOrigem, startLoadSetoresOrigem] = useTransition();
  const [setorFiltroId, setSetorFiltroId] = useState("");
  const [buscaInput, setBuscaInput] = useState("");
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const [tomboData, setTomboData] = useState<TomboData | null>(null);
  const [isLoadingTombos, startLoadTombos] = useTransition();

  // Origin combobox (SEMAP only) — mostra todas as unidades incluindo inativas
  const dropdownRefOrigem = useRef<HTMLDivElement | null>(null);
  const [searchOrigem, setSearchOrigem] = useState("");
  const [showDropdownOrigem, setShowDropdownOrigem] = useState(false);
  const filteredUnidadesOrigem = todasUnidades.filter((u) => {
    if (!searchOrigem) return true;
    const q = searchOrigem.toLowerCase();
    return u.codigo.toLowerCase().includes(q) || u.descricao.toLowerCase().includes(q);
  });

  // ── Step 2: Destino ───────────────────────────────────────────────────────
  const dropdownRefDestino = useRef<HTMLDivElement | null>(null);
  const [searchDestino, setSearchDestino] = useState("");
  const [showDropdownDestino, setShowDropdownDestino] = useState(false);
  const [unidadeDestino, setUnidadeDestino] = useState<UnidadeResumo | null>(null);
  const [setoresDestino, setSetoresDestino] = useState<SetorResumo[]>([]);
  const [isLoadingSetoresDestino, startLoadSetoresDestino] = useTransition();
  const [setorDestinoId, setSetorDestinoId] = useState("");
  const [isSubmitting, startSubmit] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const filteredUnidadesDestino = unidadesAtivas.filter((u) => {
    if (u.id === unidadeOrigem?.id) return false;
    if (!searchDestino) return true;
    const q = searchDestino.toLowerCase();
    return u.codigo.toLowerCase().includes(q) || u.descricao.toLowerCase().includes(q);
  });

  // ── Step 3: Sucesso ───────────────────────────────────────────────────────
  const [successInfo, setSuccessInfo] = useState<{
    tombosCount: number;
    origemDescricao: string;
    destinoDescricao: string;
  } | null>(null);

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRefOrigem.current && !dropdownRefOrigem.current.contains(e.target as Node)) {
        setShowDropdownOrigem(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRefDestino.current && !dropdownRefDestino.current.contains(e.target as Node)) {
        setShowDropdownDestino(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    startLoadSetoresOrigem(async () => {
      if (!unidadeOrigem) {
        setSetoresOrigem([]);
        return;
      }
      const result = await listarSetoresPorUnidade(unidadeOrigem.id);
      setSetoresOrigem(result);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unidadeOrigem?.id]);

  useEffect(() => {
    startLoadSetoresDestino(async () => {
      if (!unidadeDestino) {
        setSetoresDestino([]);
        setSetorDestinoId("");
        return;
      }
      const result = await listarSetoresPorUnidade(unidadeDestino.id);
      setSetoresDestino(result);
      setSetorDestinoId("");
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unidadeDestino?.id]);

  useEffect(() => {
    startLoadTombos(async () => {
      if (!unidadeOrigem) {
        setTomboData(null);
        return;
      }
      const result = await listarTombos({
        unidadeId: unidadeOrigem.id,
        setorId: setorFiltroId || undefined,
        busca: busca || undefined,
        status: "ativos",
        pagina,
        porPagina: 50,
      });
      setTomboData({
        tombos: result.tombos,
        total: result.total,
        totalPaginas: result.totalPaginas,
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unidadeOrigem?.id, setorFiltroId, busca, pagina]);

  // ── Debounce busca ────────────────────────────────────────────────────────
  const debouncedSearch = useDebouncedCallback((value: string) => {
    setBusca(value);
    setPagina(1);
  }, 300);

  // ── Handlers ─────────────────────────────────────────────────────────────
  function handleSelectUnidadeOrigem(u: UnidadeComStatus) {
    setUnidadeOrigem(u);
    setSearchOrigem(u.descricao);
    setShowDropdownOrigem(false);
    setSelectedMap(new Map());
    setSetorFiltroId("");
    setPagina(1);
    setBusca("");
    setBuscaInput("");
  }

  function handleSelectUnidadeDestino(u: UnidadeResumo) {
    setUnidadeDestino(u);
    setSearchDestino(u.descricao);
    setShowDropdownDestino(false);
  }

  function handleSetorFiltroChange(id: string) {
    setSetorFiltroId(id);
    setPagina(1);
  }

  function handleBuscaChange(value: string) {
    setBuscaInput(value);
    debouncedSearch(value);
  }

  // ── Checkbox helpers ──────────────────────────────────────────────────────
  const tombosNaPagina = tomboData?.tombos ?? [];
  const tombosHabilitados = tombosNaPagina.filter((t) => t.itensMovimentacao.length === 0);
  const todosHabilitadosSelecionados =
    tombosHabilitados.length > 0 && tombosHabilitados.every((t) => selectedMap.has(t.id));

  function handleToggleAll() {
    setSelectedMap((prev) => {
      const next = new Map(prev);
      if (todosHabilitadosSelecionados) {
        tombosHabilitados.forEach((t) => next.delete(t.id));
      } else {
        tombosHabilitados.forEach((t) => next.set(t.id, toTomboSelecionado(t)));
      }
      return next;
    });
  }

  function handleToggleTombo(tombo: TomboItem) {
    if (tombo.itensMovimentacao.length > 0) return;
    setSelectedMap((prev) => {
      const next = new Map(prev);
      if (next.has(tombo.id)) {
        next.delete(tombo.id);
      } else {
        next.set(tombo.id, toTomboSelecionado(tombo));
      }
      return next;
    });
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  function handleSubmit() {
    if (!unidadeDestino || selectedMap.size === 0) return;
    setErro(null);
    startSubmit(async () => {
      const result = await criarMovimentacao({
        tomboIds: [...selectedMap.keys()],
        unidadeDestinoId: unidadeDestino.id,
        setorDestinoId: setorDestinoId,
      });
      if (result.success) {
        setSuccessInfo({
          tombosCount: selectedMap.size,
          origemDescricao: unidadeOrigem?.descricao ?? "",
          destinoDescricao: unidadeDestino.descricao,
        });
        setStep("sucesso");
      } else {
        setErro(result.error ?? "Erro ao registrar movimentação.");
      }
    });
  }

  // ── Reset ─────────────────────────────────────────────────────────────────
  function handleNova() {
    setStep("selecao");
    setSelectedMap(new Map());
    setPagina(1);
    setBusca("");
    setBuscaInput("");
    setSetorFiltroId("");
    setUnidadeDestino(null);
    setSearchDestino("");
    setSetorDestinoId("");
    setSetoresDestino([]);
    setErro(null);
    setSuccessInfo(null);
    if (isSemap) {
      setUnidadeOrigem(null);
      setSetoresOrigem([]);
      setSearchOrigem("");
      setTomboData(null);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {step !== "sucesso" && <Stepper current={step} />}

      {/* ── Passo 1: Seleção ─────────────────────────────────── */}
      {step === "selecao" && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-wrap gap-3">
            {isSemap ? (
              <div className="w-full max-w-sm">
                <OrigemUnidadeCombobox
                  dropdownRef={dropdownRefOrigem}
                  searchQuery={searchOrigem}
                  showDropdown={showDropdownOrigem}
                  filteredUnidades={filteredUnidadesOrigem}
                  selectedUnidadeId={unidadeOrigem?.id ?? ""}
                  onSearchQueryChange={setSearchOrigem}
                  onFocus={() => {
                    if (unidadeOrigem) setSearchOrigem("");
                    setShowDropdownOrigem(true);
                  }}
                  onSelectUnidade={handleSelectUnidadeOrigem}
                />
              </div>
            ) : unidadeOrigem ? (
              <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                <span className="text-xs font-medium text-muted-foreground">Unidade:</span>
                <span className="text-sm font-semibold text-primary">{unidadeOrigem.descricao}</span>
                <span className="text-xs text-muted-foreground">({unidadeOrigem.codigo})</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm text-destructive">
                  Sua conta não possui unidade patrimonial configurada. Entre em contato com o
                  administrador.
                </span>
              </div>
            )}

            {/* Setor filter */}
            {unidadeOrigem && setoresOrigem.length > 0 && (
              <div className="w-48">
                {isLoadingSetoresOrigem ? (
                  <div className="flex h-11 items-center gap-2 px-1 text-sm text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Setores...
                  </div>
                ) : (
                  <select
                    value={setorFiltroId}
                    onChange={(e) => handleSetorFiltroChange(e.target.value)}
                    className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Todos os setores</option>
                    {setoresOrigem.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Busca */}
            {unidadeOrigem && (
              <div className="relative flex-1 min-w-48">
                <input
                  type="text"
                  value={buscaInput}
                  onChange={(e) => handleBuscaChange(e.target.value)}
                  placeholder="Buscar por número ou descrição..."
                  className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            )}
          </div>

          {/* Content */}
          {!unidadeOrigem && isSemap ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
              <Package className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">
                Selecione a unidade de origem
              </p>
              <p className="text-xs text-muted-foreground/70">
                Escolha a unidade acima para visualizar os tombos disponíveis.
              </p>
            </div>
          ) : !unidadeOrigem ? null : isLoadingTombos ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="text-sm">Carregando tombos...</span>
            </div>
          ) : !tomboData || tomboData.tombos.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
              <Package className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">Nenhum tombo encontrado</p>
              <p className="text-xs text-muted-foreground/70">
                Tente ajustar os filtros ou execute a sincronização do SICAM.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {tomboData.total} tombo(s) encontrado(s)
                {selectedMap.size > 0 && (
                  <span className="ml-2 font-semibold text-primary">
                    · {selectedMap.size} selecionado(s)
                  </span>
                )}
              </p>

              {/* Table */}
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="w-10 px-3 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={todosHabilitadosSelecionados}
                          onChange={handleToggleAll}
                          disabled={tombosHabilitados.length === 0}
                          className="h-4 w-4 rounded border-border accent-primary"
                          aria-label="Selecionar todos habilitados desta página"
                        />
                      </th>
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                        Número
                      </th>
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                        Descrição
                      </th>
                      <th className="hidden md:table-cell px-3 py-2.5 text-left font-medium text-muted-foreground">
                        Setor
                      </th>
                      <th className="px-3 py-2.5 text-center font-medium text-muted-foreground">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tomboData.tombos.map((t) => {
                      const emMov = t.itensMovimentacao.length > 0;
                      const selecionado = selectedMap.has(t.id);
                      return (
                        <tr
                          key={t.id}
                          onClick={() => handleToggleTombo(t)}
                          className={cn(
                            "border-b border-border last:border-0 transition-colors",
                            emMov
                              ? "opacity-50 cursor-not-allowed"
                              : selecionado
                                ? "bg-primary/5 cursor-pointer"
                                : "hover:bg-muted/30 cursor-pointer",
                          )}
                        >
                          <td className="px-3 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={selecionado}
                              disabled={emMov}
                              onChange={() => handleToggleTombo(t)}
                              onClick={(e) => e.stopPropagation()}
                              className="h-4 w-4 rounded border-border accent-primary"
                              aria-label={`Selecionar tombo ${t.numero}`}
                            />
                          </td>
                          <td className="px-3 py-3">
                            <span className="font-mono text-xs font-semibold text-primary">
                              #{t.numero}
                            </span>
                          </td>
                          <td className="max-w-xs truncate px-3 py-3 text-sm text-foreground">
                            {t.descricaoMaterial || (
                              <span className="italic text-muted-foreground">Sem descrição</span>
                            )}
                          </td>
                          <td className="hidden md:table-cell px-3 py-3 text-sm text-muted-foreground">
                            {t.setor?.nome ?? "—"}
                          </td>
                          <td className="px-3 py-3 text-center">
                            {emMov ? (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                Em movimentação
                              </span>
                            ) : (
                              <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-[11px] font-medium text-secondary">
                                Ativo
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {tomboData.totalPaginas > 1 && (
                <Pagination
                  pagina={pagina}
                  totalPaginas={tomboData.totalPaginas}
                  onPageChange={setPagina}
                />
              )}
            </div>
          )}

          {/* Footer */}
          {selectedMap.size > 0 && (
            <div className="sticky bottom-0 z-10 -mx-4 border-t border-border bg-card/95 px-4 py-3 backdrop-blur-sm md:-mx-6 md:px-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{selectedMap.size}</span> tombo(s)
                  selecionado(s)
                  {unidadeOrigem && (
                    <span className="hidden sm:inline"> de {unidadeOrigem.descricao}</span>
                  )}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedMap(new Map())}
                    className="gap-1.5"
                  >
                    <X className="h-3.5 w-3.5" />
                    Limpar
                  </Button>
                  <Button size="sm" onClick={() => setStep("destino")} className="gap-1.5">
                    Avançar
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Passo 2: Destino ──────────────────────────────────── */}
      {step === "destino" && (
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Sumário de origem */}
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <p className="text-xs font-medium text-muted-foreground">Origem</p>
            <p className="mt-0.5 text-sm font-semibold text-foreground">
              {unidadeOrigem?.descricao ?? "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {selectedMap.size} tombo(s) selecionado(s)
            </p>
          </div>

          {/* Destination unit — apenas unidades ativas */}
          <MovimentacaoUnidadeCombobox
            dropdownRef={dropdownRefDestino}
            searchQuery={searchDestino}
            showDropdown={showDropdownDestino}
            filteredUnidades={filteredUnidadesDestino}
            selectedUnidadeId={unidadeDestino?.id ?? ""}
            onSearchQueryChange={setSearchDestino}
            onFocus={() => {
              if (unidadeDestino) setSearchDestino("");
              setShowDropdownDestino(true);
            }}
            onSelectUnidade={handleSelectUnidadeDestino}
          />

          {/* Destination setor */}
          {isLoadingSetoresDestino ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando setores...
            </div>
          ) : (
            <MovimentacaoSetorSelect
              setores={setoresDestino}
              value={setorDestinoId}
              onChange={setSetorDestinoId}
            />
          )}

          {/* Tombos list */}
          <MovimentacaoTombosList tombos={[...selectedMap.values()]} />

          {/* Error */}
          {erro && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {erro}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setStep("selecao");
                setErro(null);
              }}
            >
              Voltar
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={!unidadeDestino || !setorDestinoId || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                "Confirmar movimentação"
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ── Passo 3: Sucesso ──────────────────────────────────── */}
      {step === "sucesso" && successInfo && (
        <MovimentacaoSuccessScreen
          tombosCount={successInfo.tombosCount}
          origemDescricao={successInfo.origemDescricao}
          destinoDescricao={successInfo.destinoDescricao}
          onNova={handleNova}
        />
      )}
    </div>
  );
}
