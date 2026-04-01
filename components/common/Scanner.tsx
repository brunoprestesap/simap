"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, CameraOff } from "lucide-react";

interface ScannerProps {
  onScan: (codigo: string) => void;
  onError?: (mensagem: string) => void;
  active?: boolean;
}

export function Scanner({ onScan, onError, active = true }: ScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);
  const [hasCamera, setHasCamera] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const lastScanRef = useRef<string>("");
  const lastScanTimeRef = useRef<number>(0);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const handleDetection = useCallback((codigo: string) => {
    const now = Date.now();
    if (
      codigo === lastScanRef.current &&
      now - lastScanTimeRef.current < 2000
    ) {
      return;
    }
    lastScanRef.current = codigo;
    lastScanTimeRef.current = now;

    if (navigator.vibrate) {
      navigator.vibrate(100);
    }

    onScanRef.current(codigo);
  }, []);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;

    async function getCamera(): Promise<MediaStream> {
      try {
        return await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (err) {
        if (
          err instanceof DOMException &&
          err.name === "OverconstrainedError"
        ) {
          return await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
        throw err;
      }
    }

    async function startScanner() {
      try {
        const stream = await getCamera();

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        const {
          BrowserMultiFormatReader,
          BarcodeFormat,
          DecodeHintType,
        } = await import("@zxing/library");

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.CODE_93,
          BarcodeFormat.ITF,
          BarcodeFormat.CODABAR,
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);
        hints.set(DecodeHintType.CHARACTER_SET, "UTF-8");

        const reader = new BrowserMultiFormatReader(hints, 0);

        const video = videoRef.current;
        if (cancelled || !video) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        video.srcObject = stream;
        if (video.paused) await video.play();

        reader.decodeFromStream(stream, video, (result) => {
          if (result) {
            const text = result.getText();
            if (text) handleDetection(text);
          }
        });

        // Cleanup references for teardown
        const cleanup = () => {
          reader.reset();
          stream.getTracks().forEach((t) => t.stop());
          if (video) video.srcObject = null;
        };

        // Store cleanup for the effect teardown
        cleanupRef.current = cleanup;
      } catch (err) {
        if (!cancelled) {
          setHasCamera(false);
          let msg = "Não foi possível acessar a câmera.";
          if (err instanceof DOMException) {
            if (err.name === "NotAllowedError") {
              msg =
                "Permissão de câmera negada. Acesse Ajustes > Safari > Câmera e permita o acesso.";
            } else if (err.name === "NotFoundError") {
              msg = "Nenhuma câmera encontrada neste dispositivo.";
            } else if (err.name === "NotReadableError") {
              msg = "A câmera está sendo usada por outro aplicativo.";
            } else if (err.name === "OverconstrainedError") {
              msg = "Câmera traseira não disponível. Tente novamente.";
            }
          }
          setErrorMsg(msg);
          onErrorRef.current?.(msg);
        }
      }
    }

    startScanner();

    return () => {
      cancelled = true;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [active, handleDetection]);

  if (!hasCamera || errorMsg) {
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

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg border border-border bg-black">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        muted
        playsInline
      />

      {/* Viewfinder overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative h-28 w-[80%] max-w-80 rounded-2xl border-2 border-white/90">
          <div className="absolute -top-px left-4 right-4 h-0.5 bg-primary animate-pulse" />
        </div>
      </div>

      {/* Camera indicator */}
      <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1">
        <Camera className="h-3.5 w-3.5 text-white" />
        <span className="text-xs text-white font-medium">Code 128</span>
      </div>

      <div className="absolute bottom-3 left-3 right-3 rounded-lg bg-black/55 px-3 py-2 text-xs text-white">
        Centralize um tombo por vez dentro da moldura para leitura mais estável.
      </div>
    </div>
  );
}
