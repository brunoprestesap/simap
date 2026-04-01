"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface UseUrlParamsOptions {
  pageKey?: string;
  prefix?: string;
}

/**
 * Hook para gerenciamento de filtros via URL search params.
 * Reseta a paginação automaticamente ao alterar filtros.
 * Suporta prefixo para coexistência de múltiplos filtros na mesma página.
 */
export function useUrlParams(
  basePath: string,
  options: UseUrlParamsOptions = {},
) {
  const { pageKey = "pagina", prefix = "" } = options;
  const router = useRouter();
  const searchParams = useSearchParams();
  const fullPageKey = prefix + pageKey;

  const getParam = useCallback(
    (key: string) => searchParams.get(prefix + key) || "",
    [searchParams, prefix],
  );

  const pagina = Number(searchParams.get(fullPageKey)) || 1;

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, val] of Object.entries(updates)) {
        const fullKey = prefix + key;
        if (val) params.set(fullKey, val);
        else params.delete(fullKey);
      }
      if (!(pageKey in updates)) {
        params.delete(fullPageKey);
      }
      router.push(`${basePath}?${params.toString()}`);
    },
    [searchParams, router, basePath, pageKey, prefix, fullPageKey],
  );

  const clearAll = useCallback(() => {
    if (!prefix) {
      router.push(basePath);
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    for (const key of Array.from(params.keys())) {
      if (key.startsWith(prefix)) params.delete(key);
    }
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }, [router, basePath, searchParams, prefix]);

  return { searchParams, getParam, pagina, updateParams, clearAll };
}
