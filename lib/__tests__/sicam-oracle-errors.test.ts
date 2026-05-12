import { describe, it, expect } from "vitest";
import {
  SicamOracleError,
  extractOraCode,
  wrapSicamOracleError,
} from "@/lib/sicam-oracle/errors";

describe("extractOraCode", () => {
  it("retorna null para entrada nula/indefinida", () => {
    expect(extractOraCode(null)).toBeNull();
    expect(extractOraCode(undefined)).toBeNull();
  });

  it("lê errorNum quando presente (oracledb)", () => {
    expect(extractOraCode({ errorNum: 12541, message: "qualquer" })).toBe(12541);
  });

  it("extrai ORA-xxxxx da mensagem", () => {
    expect(
      extractOraCode(new Error("ORA-12541: TNS:no listener")),
    ).toBe(12541);
  });

  it("extrai ORA-xxxxx de string", () => {
    expect(extractOraCode("ORA-01017: invalid username/password")).toBe(1017);
  });

  it("retorna null quando não há código ORA", () => {
    expect(extractOraCode(new Error("erro genérico"))).toBeNull();
    expect(extractOraCode("nada aqui")).toBeNull();
  });
});

describe("wrapSicamOracleError", () => {
  it("preserva cause e oraCode", () => {
    const original = Object.assign(new Error("ORA-12541"), { errorNum: 12541 });
    const wrapped = wrapSicamOracleError("Falha ao conectar", original);

    expect(wrapped).toBeInstanceOf(SicamOracleError);
    expect(wrapped.message).toBe("Falha ao conectar");
    expect(wrapped.oraCode).toBe(12541);
    expect(wrapped.cause).toBe(original);
  });

  it("oraCode é null quando não há código identificável", () => {
    const wrapped = wrapSicamOracleError("Falha", new Error("erro qualquer"));
    expect(wrapped.oraCode).toBeNull();
  });
});
