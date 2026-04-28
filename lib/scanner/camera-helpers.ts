export function isDesktop(): boolean {
  if (typeof window === "undefined") return false;
  return (
    !window.matchMedia("(pointer: coarse)").matches &&
    window.matchMedia("(min-width: 1024px)").matches
  );
}

/** html5-qrcode throws or rejects if stop() runs before start() finished */
export async function safeStopScanner(
  instance: { stop: () => Promise<void> } | null,
): Promise<void> {
  if (!instance) return;
  try {
    await instance.stop();
  } catch {
    /* scanner not running yet, already stopped, or unmount race */
  }
}

export function friendlyError(err: unknown): string {
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
