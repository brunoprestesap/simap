"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export type ToastType = "error" | "info" | "warning" | "success";

export interface Toast {
  type: ToastType;
  message: string;
}

const DEFAULT_DURATION_MS = 3000;

export function useToast(durationMs = DEFAULT_DURATION_MS) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const show = useCallback(
    (type: ToastType, message: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setToast({ type, message });
      timerRef.current = setTimeout(() => setToast(null), durationMs);
    },
    [durationMs],
  );

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(null);
  }, []);

  return { toast, show, dismiss };
}
