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

function toTomboLookupKey(codigo: string) {
  const numero = normalizeTomboNumero(codigo);
  const semZeros = numero.replace(/^0+/, "");
  return semZeros.length > 0 ? semZeros : "0";
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
    tombosRef.current = new Set(tombos.map((tombo) => toTomboLookupKey(tombo.numero)));
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

      const lookupKey = toTomboLookupKey(codigo);
      const isDuplicate = tombosRef.current.has(lookupKey);
      const isInFlight = pendingCodesRef.current.has(lookupKey);

      if (isDuplicate || isInFlight) {
        showToast("info", getDuplicateMessage(codigo, isInFlight));
        return false;
      }

      pendingCodesRef.current.add(lookupKey);
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
          if (
            prev.some(
              (tombo) =>
                toTomboLookupKey(tombo.numero) === toTomboLookupKey(result.tombo.numero),
            )
          ) {
            return prev;
          }

          return [...prev, result.tombo];
        });
        tombosRef.current.add(toTomboLookupKey(result.tombo.numero));

        return true;
      } catch {
        showToast("error", getLookupFeedback(codigo, "erro_generico"));
        return false;
      } finally {
        pendingCodesRef.current.delete(lookupKey);
        updateLoadingState();
      }
    },
    [showToast, updateLoadingState],
  );

  const removeTombo = useCallback((numero: string) => {
    tombosRef.current.delete(toTomboLookupKey(numero));
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
