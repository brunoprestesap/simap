"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { ArrowLeft, ClipboardCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/common/FormError";
import { useClickOutside } from "@/lib/hooks/use-click-outside";
import { formatDateTimeBR } from "@/lib/format";
import { criarMovimentacaoSchema } from "@/lib/validations/movimentacao";
import { listarSetoresPorUnidade } from "@/server/queries/tombo";
import { criarMovimentacao } from "@/server/actions/movimentacao";
import type {
  SetorResumo,
  TomboSelecionado,
  UnidadeResumo,
} from "@/lib/movimentacao-types";
import {
  MovimentacaoOrigemDestinoCard,
  MovimentacaoSetorSelect,
  MovimentacaoSuccessScreen,
  MovimentacaoTombosList,
  MovimentacaoUnidadeCombobox,
} from "./MovimentacaoConfirmacaoParts";

interface ConfirmacaoMovimentacaoProps {
  tombos: TomboSelecionado[];
  tecnicoNome: string;
  unidadesIniciais: UnidadeResumo[];
  onVoltar: () => void;
  onSucesso: () => void;
}

export function ConfirmacaoMovimentacao({
  tombos,
  tecnicoNome,
  unidadesIniciais,
  onVoltar,
  onSucesso,
}: ConfirmacaoMovimentacaoProps) {
  const [unidadeDestinoId, setUnidadeDestinoId] = useState("");
  const [setores, setSetores] = useState<SetorResumo[]>([]);
  const [setorDestinoId, setSetorDestinoId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  useClickOutside(dropdownRef, useCallback(() => setShowDropdown(false), []));

  const unidadeOrigem = tombos[0]?.unidade ?? null;
  const dataHoraRegistro = useMemo(() => formatDateTimeBR(new Date()), []);

  const setorOrigem = useMemo(() => {
    let primeiroSetor: SetorResumo | null = null;

    for (const tombo of tombos) {
      if (!tombo.setor) continue;

      if (!primeiroSetor) {
        primeiroSetor = tombo.setor;
        continue;
      }

      if (tombo.setor.id !== primeiroSetor.id) {
        return null;
      }
    }

    return primeiroSetor;
  }, [tombos]);

  const selectedUnidade = useMemo(
    () => unidadesIniciais.find((unidade) => unidade.id === unidadeDestinoId),
    [unidadesIniciais, unidadeDestinoId],
  );

  const selectedSetor = useMemo(
    () => setores.find((setor) => setor.id === setorDestinoId),
    [setores, setorDestinoId],
  );

  const filteredUnidades = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return unidadesIniciais.filter(
      (unidade) =>
        unidade.id !== unidadeOrigem?.id &&
        (unidade.descricao.toLowerCase().includes(query) ||
          unidade.codigo.toLowerCase().includes(query)),
    );
  }, [unidadesIniciais, unidadeOrigem?.id, searchQuery]);

  useEffect(() => {
    if (!unidadeDestinoId) return;

    let cancelled = false;

    listarSetoresPorUnidade(unidadeDestinoId)
      .then((data) => {
        if (!cancelled) {
          setSetores(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSetores([]);
          setError("Não foi possível carregar os setores da unidade selecionada.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [unidadeDestinoId]);

  const handleSelectUnidade = useCallback((unidade: UnidadeResumo) => {
    setUnidadeDestinoId(unidade.id);
    setSearchQuery(`${unidade.codigo} — ${unidade.descricao}`);
    setShowDropdown(false);
    setError(null);
    // Reset state derivado da unidade ao mudar de unidade
    setSetores([]);
    setSetorDestinoId("");
  }, []);

  const handleConfirm = async () => {
    setError(null);

    const parsed = criarMovimentacaoSchema.safeParse({
      tomboIds: tombos.map((t) => t.id),
      unidadeDestinoId,
      setorOrigemId: setorOrigem?.id || undefined,
      setorDestinoId,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    setIsLoading(true);

    try {
      const result = await criarMovimentacao(parsed.data);

      if (!result.success) {
        setError(result.error ?? "Erro ao registrar movimentação.");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Erro ao registrar movimentação.");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <MovimentacaoSuccessScreen
        tombosCount={tombos.length}
        origemDescricao={unidadeOrigem?.descricao}
        destinoDescricao={selectedUnidade?.descricao}
        onNova={onSucesso}
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        <section className="flex h-auto flex-col rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border p-6">
            <h3 className="text-lg font-semibold tracking-tight text-foreground">
              Confirmar Destino
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Revise a origem e selecione a unidade e setor de destino.
            </p>
          </div>

          <div className="space-y-6 p-6">
            <MovimentacaoOrigemDestinoCard
              unidadeOrigem={unidadeOrigem}
              setorOrigem={setorOrigem}
              selectedUnidade={selectedUnidade}
              selectedSetor={selectedSetor}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <MovimentacaoUnidadeCombobox
                dropdownRef={dropdownRef}
                searchQuery={searchQuery}
                showDropdown={showDropdown}
                filteredUnidades={filteredUnidades}
                selectedUnidadeId={unidadeDestinoId}
                onSearchQueryChange={(value) => {
                  setSearchQuery(value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                onSelectUnidade={handleSelectUnidade}
              />

              <MovimentacaoSetorSelect
                setores={setores}
                value={setorDestinoId}
                onChange={setSetorDestinoId}
              />
            </div>

            <FormError error={error ?? undefined} />
          </div>
        </section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            size="lg"
            onClick={onVoltar}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <Button
            size="lg"
            onClick={handleConfirm}
            disabled={!unidadeDestinoId || !setorDestinoId || isLoading}
            className="w-full sm:w-auto"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <ClipboardCheck className="mr-2 h-4 w-4" />
                Confirmar Movimentação
              </>
            )}
          </Button>
        </div>
      </div>

      <aside className="flex flex-col space-y-6 lg:sticky lg:top-6 lg:max-h-[calc(100vh-8rem)]">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Responsável
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {tecnicoNome}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Data e Hora
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {dataHoraRegistro}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border p-5">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold tracking-tight text-foreground">
                Tombos a Movimentar
              </h4>
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary/10 px-2 text-xs font-semibold text-primary">
                {tombos.length}
              </span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            <MovimentacaoTombosList tombos={tombos} />
          </div>
        </div>
      </aside>
    </div>
  );
}
