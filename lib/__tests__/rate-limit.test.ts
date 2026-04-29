import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetAllForTests,
  consumeAttempt,
  resetAttempts,
} from "@/lib/rate-limit";

const OPTS = {
  windowMs: 60_000,
  maxAttempts: 5,
  lockoutMs: 10 * 60_000,
};

describe("consumeAttempt", () => {
  beforeEach(() => {
    __resetAllForTests();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("permite as 5 primeiras tentativas dentro da janela", () => {
    for (let i = 0; i < 5; i++) {
      expect(consumeAttempt("k", OPTS)).toEqual({ allowed: true });
    }
  });

  it("bloqueia a 6ª tentativa e retorna retryAfterMs do lockout", () => {
    for (let i = 0; i < 5; i++) consumeAttempt("k", OPTS);

    const r = consumeAttempt("k", OPTS);
    expect(r.allowed).toBe(false);
    if (!r.allowed) {
      expect(r.retryAfterMs).toBe(OPTS.lockoutMs);
    }
  });

  it("mantém bloqueio mesmo após a janela passar enquanto lockout não expirou", () => {
    for (let i = 0; i < 5; i++) consumeAttempt("k", OPTS);
    consumeAttempt("k", OPTS); // dispara o lockout

    vi.advanceTimersByTime(OPTS.windowMs + 1_000); // janela passou
    const r = consumeAttempt("k", OPTS);
    expect(r.allowed).toBe(false);
  });

  it("libera depois que o lockout expira", () => {
    for (let i = 0; i < 5; i++) consumeAttempt("k", OPTS);
    consumeAttempt("k", OPTS);

    vi.advanceTimersByTime(OPTS.lockoutMs + 1_000);
    expect(consumeAttempt("k", OPTS)).toEqual({ allowed: true });
  });

  it("reseta o contador quando a janela expira sem lockout", () => {
    for (let i = 0; i < 4; i++) consumeAttempt("k", OPTS);

    vi.advanceTimersByTime(OPTS.windowMs + 1_000);

    // Como abriu janela nova, ainda dá 5 tentativas.
    for (let i = 0; i < 5; i++) {
      expect(consumeAttempt("k", OPTS)).toEqual({ allowed: true });
    }
    expect(consumeAttempt("k", OPTS).allowed).toBe(false);
  });

  it("isola buckets por chave", () => {
    for (let i = 0; i < 5; i++) consumeAttempt("user-A", OPTS);
    consumeAttempt("user-A", OPTS); // bloqueado

    expect(consumeAttempt("user-B", OPTS)).toEqual({ allowed: true });
  });
});

describe("resetAttempts", () => {
  beforeEach(() => {
    __resetAllForTests();
  });

  it("zera o bucket após sucesso, restaurando o crédito completo", () => {
    for (let i = 0; i < 4; i++) consumeAttempt("k", OPTS);

    resetAttempts("k");

    for (let i = 0; i < 5; i++) {
      expect(consumeAttempt("k", OPTS)).toEqual({ allowed: true });
    }
  });
});
