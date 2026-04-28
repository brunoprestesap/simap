import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  friendlyError,
  isDesktop,
  safeStopScanner,
} from "../camera-helpers";

function mockMatchMedia(overrides: { coarse: boolean; minWidth1024: boolean }) {
  return vi.fn().mockImplementation((q: string) => ({
    matches:
      q === "(pointer: coarse)"
        ? overrides.coarse
        : q === "(min-width: 1024px)"
          ? overrides.minWidth1024
          : false,
    media: q,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

describe("isDesktop", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      matchMedia: mockMatchMedia({ coarse: false, minWidth1024: true }),
    });
  });

  it("retorna true quando é fine pointer e viewport largo", () => {
    expect(isDesktop()).toBe(true);
  });

  it("retorna false com pointer coarse", () => {
    globalThis.window.matchMedia = mockMatchMedia({
      coarse: true,
      minWidth1024: true,
    });
    expect(isDesktop()).toBe(false);
  });

  it("retorna false com viewport estreita", () => {
    globalThis.window.matchMedia = mockMatchMedia({
      coarse: false,
      minWidth1024: false,
    });
    expect(isDesktop()).toBe(false);
  });
});

describe("friendlyError", () => {
  it("mapeia NotAllowedError", () => {
    const e = new DOMException("nope", "NotAllowedError");
    expect(friendlyError(e)).toContain("Permissão de câmera negada");
  });

  it("mapeia NotFoundError", () => {
    const e = new DOMException("nope", "NotFoundError");
    expect(friendlyError(e)).toBe("Nenhuma câmera encontrada neste dispositivo.");
  });

  it("trata Error com not found", () => {
    expect(friendlyError(new Error("No camera on device not found"))).toContain(
      "Nenhuma câmera",
    );
  });

  it("mapeia NotReadableError e OverconstrainedError", () => {
    expect(
      friendlyError(new DOMException("b", "NotReadableError")),
    ).toContain("usada por outro");
    expect(
      friendlyError(new DOMException("c", "OverconstrainedError")),
    ).toContain("resolução");
  });

  it("trata Error com Permission na mensagem", () => {
    expect(friendlyError(new Error("Permission failed"))).toContain("Permissão");
  });

  it("retorna mensagem genérica para desconhecidos", () => {
    expect(friendlyError("x")).toBe("Não foi possível acessar a câmera.");
  });
});

describe("safeStopScanner", () => {
  it("não rejeita quando instância é null", async () => {
    await expect(safeStopScanner(null)).resolves.toBeUndefined();
  });

  it("ignora rejeição de stop()", async () => {
    const inst = { stop: vi.fn().mockRejectedValue(new Error("already stopped")) };
    await expect(safeStopScanner(inst)).resolves.toBeUndefined();
  });
});
