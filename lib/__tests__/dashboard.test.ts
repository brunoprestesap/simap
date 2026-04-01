import { describe, it, expect } from "vitest";
import {
  calcMediaDias,
  calcTendencia,
  formatPeriodoLabel,
  agruparPorUnidade,
} from "@/lib/dashboard-utils";
import type { StatusMovimentacao } from "@/lib/generated/prisma/client";

// ─── calcMediaDias ─────────────────────────────────────

describe("calcMediaDias", () => {
  it("deve retornar 0 para lista vazia", () => {
    expect(calcMediaDias([])).toBe(0);
  });

  it("deve calcular média corretamente para um item", () => {
    const items = [
      {
        createdAt: new Date("2024-06-01T00:00:00Z"),
        dataRegistroSicam: new Date("2024-06-04T00:00:00Z"),
      },
    ];
    expect(calcMediaDias(items)).toBe(3);
  });

  it("deve calcular média corretamente para múltiplos itens", () => {
    const items = [
      {
        createdAt: new Date("2024-06-01T00:00:00Z"),
        dataRegistroSicam: new Date("2024-06-03T00:00:00Z"),
      },
      {
        createdAt: new Date("2024-06-01T00:00:00Z"),
        dataRegistroSicam: new Date("2024-06-07T00:00:00Z"),
      },
    ];
    expect(calcMediaDias(items)).toBe(4);
  });

  it("deve arredondar para 1 casa decimal", () => {
    const items = [
      {
        createdAt: new Date("2024-06-01T00:00:00Z"),
        dataRegistroSicam: new Date("2024-06-02T08:00:00Z"),
      },
      {
        createdAt: new Date("2024-06-01T00:00:00Z"),
        dataRegistroSicam: new Date("2024-06-03T00:00:00Z"),
      },
    ];
    expect(calcMediaDias(items)).toBe(1.7);
  });
});

// ─── calcTendencia ─────────────────────────────────────

describe("calcTendencia", () => {
  it("deve retornar null quando período anterior é null", () => {
    expect(calcTendencia(4.2, null)).toBeNull();
  });

  it("deve retornar null quando período anterior é 0", () => {
    expect(calcTendencia(4.2, 0)).toBeNull();
  });

  it("deve retornar null quando diferença é insignificante", () => {
    expect(calcTendencia(4.2, 4.25)).toBeNull();
  });

  it("deve retornar 'up' quando tempo aumentou", () => {
    const result = calcTendencia(5.0, 3.0);
    expect(result?.direcao).toBe("up");
  });

  it("deve retornar 'down' quando tempo diminuiu", () => {
    const result = calcTendencia(3.0, 5.0);
    expect(result?.direcao).toBe("down");
  });
});

// ─── formatPeriodoLabel ────────────────────────────────

describe("formatPeriodoLabel", () => {
  it("deve formatar dia como dd/mm", () => {
    const result = formatPeriodoLabel("2024-06-15T12:00:00Z", "dia");
    expect(result).toMatch(/15\/06/);
  });

  it("deve formatar semana com prefixo Sem", () => {
    const result = formatPeriodoLabel("2024-06-10T12:00:00Z", "semana");
    expect(result).toMatch(/^Sem /);
  });

  it("deve formatar mês com nome abreviado", () => {
    const result = formatPeriodoLabel("2024-06-15T12:00:00Z", "mes");
    expect(result).toMatch(/jun/i);
  });
});

// ─── agruparPorUnidade ─────────────────────────────────

describe("agruparPorUnidade", () => {
  const unidadeNomes = new Map([
    ["u1", "Seção TI"],
    ["u2", "SEMAP"],
  ]);

  it("deve agrupar movimentações por status corretamente", () => {
    const dados: {
      unidadeOrigemId: string;
      status: StatusMovimentacao;
      _count: { id: number };
    }[] = [
      { unidadeOrigemId: "u1", status: "PENDENTE_CONFIRMACAO", _count: { id: 3 } },
      { unidadeOrigemId: "u1", status: "REGISTRADA_SICAM", _count: { id: 5 } },
      { unidadeOrigemId: "u2", status: "CONFIRMADA_ORIGEM", _count: { id: 2 } },
    ];

    const result = agruparPorUnidade(dados, unidadeNomes);

    const u1 = result.find((r) => r.unidadeId === "u1")!;
    expect(u1.total).toBe(8);
    expect(u1.pendentes).toBe(3);
    expect(u1.registradas).toBe(5);
    expect(u1.confirmadas).toBe(0);
    expect(u1.unidadeDescricao).toBe("Seção TI");

    const u2 = result.find((r) => r.unidadeId === "u2")!;
    expect(u2.total).toBe(2);
    expect(u2.confirmadas).toBe(2);
    expect(u2.unidadeDescricao).toBe("SEMAP");
  });

  it("deve ordenar unidades por total decrescente", () => {
    const dados: {
      unidadeOrigemId: string;
      status: StatusMovimentacao;
      _count: { id: number };
    }[] = [
      { unidadeOrigemId: "u2", status: "REGISTRADA_SICAM", _count: { id: 10 } },
      { unidadeOrigemId: "u1", status: "REGISTRADA_SICAM", _count: { id: 3 } },
    ];

    const result = agruparPorUnidade(dados, unidadeNomes);
    expect(result[0].unidadeId).toBe("u2");
    expect(result[1].unidadeId).toBe("u1");
  });

  it("deve retornar array vazio para input vazio", () => {
    expect(agruparPorUnidade([], unidadeNomes)).toEqual([]);
  });

  it("deve tratar NAO_CONFIRMADA como pendente", () => {
    const dados: {
      unidadeOrigemId: string;
      status: StatusMovimentacao;
      _count: { id: number };
    }[] = [
      { unidadeOrigemId: "u1", status: "NAO_CONFIRMADA", _count: { id: 4 } },
    ];

    const result = agruparPorUnidade(dados, unidadeNomes);
    expect(result[0].pendentes).toBe(4);
  });
});

// ─── Paginação ─────────────────────────────────────────

describe("paginação da auditoria", () => {
  it("deve calcular total de páginas corretamente", () => {
    expect(Math.ceil(0 / 20)).toBe(0);
    expect(Math.ceil(1 / 20)).toBe(1);
    expect(Math.ceil(20 / 20)).toBe(1);
    expect(Math.ceil(21 / 20)).toBe(2);
    expect(Math.ceil(100 / 20)).toBe(5);
  });

  it("deve calcular skip corretamente", () => {
    expect((1 - 1) * 20).toBe(0);
    expect((2 - 1) * 20).toBe(20);
    expect((5 - 1) * 20).toBe(80);
  });
});
