"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Hook genérico para operações CRUD em telas admin.
 * Centraliza fetch, busca, sheet open/close, e refresh.
 */
export function useAdminCrud<T>(fetchFn: (busca?: string) => Promise<T[]>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState<T[]>([]);
  const [busca, setBusca] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);

  const fetchData = useCallback(() => {
    startTransition(async () => {
      const result = await fetchFn(busca || undefined);
      setData(result);
    });
  }, [busca, fetchFn]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(() => {
    fetchData();
    router.refresh();
  }, [fetchData, router]);

  const closeSheet = useCallback(() => setSheetOpen(false), []);
  const openSheet = useCallback(() => setSheetOpen(true), []);

  return {
    data,
    busca,
    setBusca,
    isPending,
    sheetOpen,
    openSheet,
    closeSheet,
    refresh,
  };
}
