"use client";

import { useEffect, useRef, useState, useCallback, useId } from "react";
import { Camera, CameraOff, Loader2, Zap, ZapOff } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScannerProps {
  onScan: (codigo: string) => void;
  onError?: (mensagem: string) => void;
  active?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Html5QrcodeSupportedFormats numeric values (avoids top-level import of
 * html5-qrcode which accesses `document` and breaks SSR).
 */
const BARCODE_FORMATS = [
  5,  // CODE_128
  3,  // CODE_39
  4,  // CODE_93
  8,  // ITF
  2,  // CODABAR
  9,  // EAN_13
  10, // EAN_8
];

/** Minimum consecutive reads of the same code to accept as valid */
const CONFIRM_THRESHOLD = 2;
/** Time window for consecutive reads (ms) */
const CONFIRM_WINDOW_MS = 2000;
/** Debounce between accepted scans of the same code (ms) */
const SCAN_COOLDOWN_MS = 2500;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isDesktop(): boolean {
  if (typeof window === "undefined") return false;
  return (
    !window.matchMedia("(pointer: coarse)").matches &&
    window.matchMedia("(min-width: 1024px)").matches
  );
}

function friendlyError(err: unknown): string {
  if (err instanceof DOMException) {
    switch (err.name) {
      case "NotAllowedError":
        return "Permissão de câmera negada. Acesse Ajustes > Safari > Câmera e permita o acesso.";
      case "NotFoundError":
        return "Nenhuma câmera encontrada neste dispositivo.";
      case "NotReadableError":
        return "A câmera está sendo usada por outro aplicativo.";
      case "OverconstrainedError":
        return "A câmera não suporta a resolução solicitada.";
    }
  }
  if (err instanceof Error && err.message) {
    if (err.message.includes("Permission")) {
      return "Permissão de câmera negada. Acesse Ajustes > Safari > Câmera e permita o acesso.";
    }
    if (err.message.includes("not found") || err.message.includes("No camera")) {
      return "Nenhuma câmera encontrada neste dispositivo.";
    }
  }
  return "Não foi possível acessar a câmera.";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Scanner({ onScan, onError, active = true }: ScannerProps) {
  const reactId = useId();
  const containerIdRef = useRef(`scanner-reader-${reactId.replace(/:/g, "")}`);

  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);

  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);

  // Scan state refs (avoid re-renders on every frame)
  const confirmBuf = useRef<{ code: string; count: number; firstAt: number }>({
    code: "",
    count: 0,
    firstAt: 0,
  });
  const lastAcceptedRef = useRef<{ code: string; at: number }>({
    code: "",
    at: 0,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerRef = useRef<any>(null);

  // Keep callback refs fresh
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // --------------------------------------------------
  // Accept a code only after multi-frame confirmation
  // --------------------------------------------------
  const tryAccept = useCallback((code: string) => {
    const now = Date.now();

    // Cooldown: don't re-accept the same code too quickly
    if (
      code === lastAcceptedRef.current.code &&
      now - lastAcceptedRef.current.at < SCAN_COOLDOWN_MS
    ) {
      return;
    }

    const buf = confirmBuf.current;
    if (code === buf.code && now - buf.firstAt < CONFIRM_WINDOW_MS) {
      buf.count++;
    } else {
      // Reset buffer for new code
      confirmBuf.current = { code, count: 1, firstAt: now };
      return;
    }

    if (buf.count >= CONFIRM_THRESHOLD) {
      // Accepted!
      lastAcceptedRef.current = { code, at: now };
      confirmBuf.current = { code: "", count: 0, firstAt: 0 };

      if (navigator.vibrate) navigator.vibrate(100);
      onScanRef.current(code);
    }
  }, []);

  // --------------------------------------------------
  // Torch toggle
  // --------------------------------------------------
  const toggleTorch = useCallback(async () => {
    const containerId = containerIdRef.current;
    const videoEl = document.getElementById(containerId)?.querySelector("video");
    const stream = videoEl?.srcObject;
    if (!(stream instanceof MediaStream)) return;

    const track = stream.getVideoTracks()[0];
    if (!track) return;

    const next = !torchOn;
    try {
      await track.applyConstraints({
        advanced: [{ torch: next } as MediaTrackConstraintSet],
      });
      setTorchOn(next);
    } catch {
      // silently ignore — torch may have become unavailable
    }
  }, [torchOn]);

  // --------------------------------------------------
  // Main camera + scanning loop
  // --------------------------------------------------
  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    const containerId = containerIdRef.current;

    async function start() {
      // Dynamic import to avoid SSR issues (html5-qrcode accesses document at import time)
      const { Html5Qrcode } = await import("html5-qrcode");

      if (cancelled) return;

      const html5QrCode = new Html5Qrcode(containerId, {
        formatsToSupport: BARCODE_FORMATS,
        verbose: false,
      });
      scannerRef.current = html5QrCode;

      const desktop = isDesktop();
      const cameraConfig = desktop
        ? { facingMode: "user" as const }
        : { facingMode: "environment" as const };

      const scanConfig = {
        fps: 4,
        qrbox: { width: 280, height: 120 },
        aspectRatio: desktop ? 16 / 9 : undefined,
        disableFlip: false,
      };

      const onSuccess = (decodedText: string) => {
        if (!cancelled) tryAccept(decodedText);
      };

      try {
        await html5QrCode.start(cameraConfig, scanConfig, onSuccess, undefined);
      } catch {
        // Retry with relaxed constraints (some devices reject specific facingMode)
        try {
          await html5QrCode.start(
            { facingMode: "environment" as const },
            { fps: 4, qrbox: { width: 280, height: 120 }, disableFlip: false },
            onSuccess,
            undefined
          );
        } catch (err2) {
          if (cancelled) return;
          const msg = friendlyError(err2);
          setErrorMsg(msg);
          setStatus("error");
          onErrorRef.current?.(msg);
          return;
        }
      }

      if (cancelled) {
        html5QrCode.stop().catch(() => {});
        return;
      }

      setStatus("ready");

      // Check torch capability from the running video track
      try {
        const videoEl = document.getElementById(containerId)?.querySelector("video");
        const stream = videoEl?.srcObject;
        if (stream instanceof MediaStream) {
          const track = stream.getVideoTracks()[0];
          const caps = track?.getCapabilities?.();
          if (caps && "torch" in caps) {
            setHasTorch(true);
          }
        }
      } catch {
        // no torch support
      }
    }

    start();

    return () => {
      cancelled = true;
      const instance = scannerRef.current;
      if (instance) {
        instance.stop().catch(() => {});
        scannerRef.current = null;
      }
      setTorchOn(false);
      setHasTorch(false);
      setStatus("loading");
    };
  }, [active, tryAccept]);

  // --------------------------------------------------
  // Error state
  // --------------------------------------------------
  if (status === "error") {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center sm:p-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card text-primary">
          <CameraOff className="h-6 w-6" />
        </div>
        <p className="mt-4 text-sm font-medium text-foreground">
          {errorMsg ?? "Câmera não disponível"}
        </p>
        <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
          Utilize a digitação manual para continuar o cadastro sem interromper o
          fluxo da movimentação.
        </p>
      </div>
    );
  }

  // --------------------------------------------------
  // Render
  // --------------------------------------------------
  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg border border-border bg-black">
      {/* Container for html5-qrcode — library creates <video> inside */}
      <div
        id={containerIdRef.current}
        className="h-full w-full [&_video]:!h-full [&_video]:!w-full [&_video]:!object-cover [&_video]:!static [&>div]:!border-none [&_canvas]:!hidden [&>div>img]:!hidden"
      />

      {/* Loading overlay */}
      {status === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
          <span className="text-sm text-white/80">Abrindo câmera…</span>
        </div>
      )}

      {/* Viewfinder overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {/* Dim background outside viewfinder */}
        <div className="absolute inset-0 bg-black/40" />

        {/* Viewfinder cutout */}
        <div className="relative h-32 w-[85%] max-w-sm md:h-40 md:max-w-md rounded-2xl border-2 border-white/80 bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]">
          {/* Corner markers */}
          <div className="absolute -top-0.5 -left-0.5 h-5 w-5 rounded-tl-2xl border-t-[3px] border-l-[3px] border-primary" />
          <div className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-tr-2xl border-t-[3px] border-r-[3px] border-primary" />
          <div className="absolute -bottom-0.5 -left-0.5 h-5 w-5 rounded-bl-2xl border-b-[3px] border-l-[3px] border-primary" />
          <div className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-br-2xl border-b-[3px] border-r-[3px] border-primary" />

          {/* Scanning line */}
          <div className="absolute top-1/2 left-3 right-3 h-0.5 -translate-y-1/2 bg-primary/80 animate-pulse rounded-full" />
        </div>
      </div>

      {/* Top-left: camera badge */}
      <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1">
        <Camera className="h-3.5 w-3.5 text-white" />
        <span className="text-xs text-white font-medium">Scanner</span>
      </div>

      {/* Top-right: torch toggle */}
      {hasTorch && (
        <button
          type="button"
          onClick={toggleTorch}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white active:bg-black/70 transition-colors"
          aria-label={torchOn ? "Desligar lanterna" : "Ligar lanterna"}
        >
          {torchOn ? (
            <Zap className="h-4 w-4 text-yellow-300" />
          ) : (
            <ZapOff className="h-4 w-4" />
          )}
        </button>
      )}

      {/* Bottom hint */}
      <div className="absolute bottom-3 left-3 right-3 rounded-lg bg-black/55 px-3 py-2 text-xs text-white text-center">
        Aponte a câmera para o código de barras do tombo
      </div>
    </div>
  );
}
