import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { __resetEnvCacheForTests, getEnv } from "@/lib/env";

const ORIGINAL = { ...process.env };

function setEnv(over: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(over)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

describe("getEnv", () => {
  beforeEach(() => {
    __resetEnvCacheForTests();
    process.env = { ...ORIGINAL };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL };
    __resetEnvCacheForTests();
  });

  it("aceita configuração mínima válida", () => {
    setEnv({
      DATABASE_URL: "postgresql://x@y:5432/z",
      NEXTAUTH_SECRET: "this-is-a-strong-secret",
    });

    const env = getEnv();
    expect(env.DATABASE_URL).toBe("postgresql://x@y:5432/z");
    expect(env.TOKEN_EXPIRY_DAYS).toBe(7); // default
  });

  it("falha com mensagem clara quando DATABASE_URL falta", () => {
    setEnv({
      DATABASE_URL: undefined,
      NEXTAUTH_SECRET: "this-is-a-strong-secret",
    });

    expect(() => getEnv()).toThrow(/DATABASE_URL/);
  });

  it("falha quando NEXTAUTH_SECRET é curto demais", () => {
    setEnv({
      DATABASE_URL: "postgresql://x@y:5432/z",
      NEXTAUTH_SECRET: "curto",
    });

    expect(() => getEnv()).toThrow(/NEXTAUTH_SECRET/);
  });

  it("coerce TOKEN_EXPIRY_DAYS string para número", () => {
    setEnv({
      DATABASE_URL: "postgresql://x@y:5432/z",
      NEXTAUTH_SECRET: "this-is-a-strong-secret",
      TOKEN_EXPIRY_DAYS: "14",
    });

    expect(getEnv().TOKEN_EXPIRY_DAYS).toBe(14);
  });

  it("rejeita LOG_LEVEL inválido", () => {
    setEnv({
      DATABASE_URL: "postgresql://x@y:5432/z",
      NEXTAUTH_SECRET: "this-is-a-strong-secret",
      LOG_LEVEL: "verbose",
    });

    expect(() => getEnv()).toThrow(/LOG_LEVEL/);
  });
});
