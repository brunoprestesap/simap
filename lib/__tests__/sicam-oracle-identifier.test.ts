import { describe, it, expect } from "vitest";
import {
  assertSafeOracleIdentifier,
  isSafeOracleIdentifier,
} from "@/lib/sicam-oracle/identifier";

describe("isSafeOracleIdentifier", () => {
  it("aceita nomes válidos (letras, dígitos, _, $, #)", () => {
    expect(isSafeOracleIdentifier("BEM_PATRIMONIAL")).toBe(true);
    expect(isSafeOracleIdentifier("SICAM$LOG")).toBe(true);
    expect(isSafeOracleIdentifier("T123")).toBe(true);
    expect(isSafeOracleIdentifier("a")).toBe(true);
  });

  it("normaliza para uppercase antes de validar", () => {
    expect(isSafeOracleIdentifier("bem_patrimonial")).toBe(true);
  });

  it("rejeita string vazia", () => {
    expect(isSafeOracleIdentifier("")).toBe(false);
  });

  it("rejeita caracteres não permitidos (defesa contra SQL injection)", () => {
    expect(isSafeOracleIdentifier("DROP TABLE")).toBe(false);
    expect(isSafeOracleIdentifier("BEM;TRUNCATE")).toBe(false);
    expect(isSafeOracleIdentifier("BEM--")).toBe(false);
    expect(isSafeOracleIdentifier("BEM/*")).toBe(false);
    expect(isSafeOracleIdentifier("'OR'1'='1")).toBe(false);
    expect(isSafeOracleIdentifier("BEM PATRIMONIAL")).toBe(false);
  });

  it("rejeita identificador maior que 128 caracteres", () => {
    expect(isSafeOracleIdentifier("A".repeat(129))).toBe(false);
    expect(isSafeOracleIdentifier("A".repeat(128))).toBe(true);
  });
});

describe("assertSafeOracleIdentifier", () => {
  it("retorna valor em uppercase quando válido", () => {
    expect(assertSafeOracleIdentifier("bem_patrimonial", "tableName")).toBe(
      "BEM_PATRIMONIAL",
    );
  });

  it("lança erro com label quando inválido", () => {
    expect(() => assertSafeOracleIdentifier("DROP TABLE", "tableName")).toThrow(
      /tableName inválido/,
    );
  });
});
