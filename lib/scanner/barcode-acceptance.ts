/** Minimum consecutive reads of the same code to accept as valid */
export const CONFIRM_THRESHOLD = 2;
/** Time window for consecutive reads (ms) */
export const CONFIRM_WINDOW_MS = 2000;
/** Debounce between accepted scans of the same code (ms) */
export const SCAN_COOLDOWN_MS = 2500;

export type ScanBuffer = { code: string; count: number; firstAt: number };
export type LastAccepted = { code: string; at: number };

const emptyBuf = (): ScanBuffer => ({ code: "", count: 0, firstAt: 0 });

export type BarcodeAcceptOptions = {
  /** Por defeito igual a CONFIRM_THRESHOLD (usado em testes para ramos extra). */
  confirmThreshold?: number;
};

/**
 * Pure state step for multi-frame barcode confirmation (matches Scanner behaviour).
 */
export function processBarcodeReadAttempt(
  code: string,
  now: number,
  buf: ScanBuffer,
  lastAccepted: LastAccepted,
  options?: BarcodeAcceptOptions,
): {
  buf: ScanBuffer;
  lastAccepted: LastAccepted;
  acceptedCode: string | null;
} {
  const threshold = options?.confirmThreshold ?? CONFIRM_THRESHOLD;

  if (
    code === lastAccepted.code &&
    now - lastAccepted.at < SCAN_COOLDOWN_MS
  ) {
    return { buf, lastAccepted, acceptedCode: null };
  }

  if (code === buf.code && now - buf.firstAt < CONFIRM_WINDOW_MS) {
    const nextCount = buf.count + 1;
    if (nextCount >= threshold) {
      return {
        buf: emptyBuf(),
        lastAccepted: { code, at: now },
        acceptedCode: code,
      };
    }
    return {
      buf: { ...buf, count: nextCount },
      lastAccepted,
      acceptedCode: null,
    };
  }

  return {
    buf: { code, count: 1, firstAt: now },
    lastAccepted,
    acceptedCode: null,
  };
}
