"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/lib/hooks/use-toast";
import type { TomboSelecionado } from "@/lib/movimentacao-types";
import { buscarTomboParaMovimentacao } from "@/server/queries/tombo";

function getDuplicateMessage(codigo: string, isInFlight: boolean) {
  if (isInFlight) {
    return `Tombo ${codigo} já está sendo processado.`;
  }

  return `Tombo ${codigo} já está na lista.`;
}

function getLookupFeedback(
  codigo: string,
  reason: "nao_encontrado" | "em_movimentacao" | "erro_generico",
) {
  switch (reason) {
    case "nao_encontrado":
      return `Tombo ${codigo} não encontrado.`;
    case "em_movimentacao":
      return `Tombo ${codigo} já possui movimentação em andamento.`;
    default:
      return "Erro ao buscar tombo.";
  }
}

export function normalizeTomboNumero(codigo: string) {
  return codigo.trim();
}

/** Tombos are numeric, 1-6 digits (range 1–350434 in SICAM). */
const TOMBO_PATTERN = /^\d{1,6}$/;

export function isValidTomboNumero(codigo: string): boolean {
  return TOMBO_PATTERN.test(codigo);
}

export function useTomboSelection() {
  const [tombos, setTombos] = useState<TomboSelecionado[]>([]);
  const [isAddingTombo, setIsAddingTombo] = useState(false);
  const tombosRef = useRef(new Set<string>());
  const pendingCodesRef = useRef(new Set<string>());
  const { toast, show: showToast } = useToast();

  useEffect(() => {
    tombosRef.current = new Set(tombos.map((tombo) => tombo.numero));
  }, [tombos]);

  const updateLoadingState = useCallback(() => {
    setIsAddingTombo(pendingCodesRef.current.size > 0);
  }, []);

  const addTombo = useCallback(
    async (rawCodigo: string) => {
      const codigo = normalizeTomboNumero(rawCodigo);
      if (!codigo) return false;

      // Silently reject scanner noise (EAN, UPC, etc. from other labels)
      if (!isValidTomboNumero(codigo)) return false;

      const isDuplicate = tombosRef.current.has(codigo);
      const isInFlight = pendingCodesRef.current.has(codigo);

      if (isDuplicate || isInFlight) {
        showToast("info", getDuplicateMessage(codigo, isInFlight));
        return false;
      }

      pendingCodesRef.current.add(codigo);
      updateLoadingState();

      try {
        const result = await buscarTomboParaMovimentacao(codigo);

        if (result.status === "nao_encontrado") {
          showToast("error", getLookupFeedback(codigo, "nao_encontrado"));
          return false;
        }

        if (result.status === "em_movimentacao") {
          showToast("warning", getLookupFeedback(codigo, "em_movimentacao"));
          return false;
        }

        setTombos((prev) => {
          if (prev.some((tombo) => tombo.numero === codigo)) {
            return prev;
          }

          return [...prev, result.tombo];
        });
        tombosRef.current.add(codigo);

        return true;
      } catch {
        showToast("error", getLookupFeedback(codigo, "erro_generico"));
        return false;
      } finally {
        pendingCodesRef.current.delete(codigo);
        updateLoadingState();
      }
    },
    [showToast, updateLoadingState],
  );

  const removeTombo = useCallback((numero: string) => {
    tombosRef.current.delete(numero);
    setTombos((prev) => prev.filter((tombo) => tombo.numero !== numero));
  }, []);

  return {
    tombos,
    toast,
    isAddingTombo,
    addTombo,
    removeTombo,
  };
}
