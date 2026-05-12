import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  calcularTempoMedioRegistroSicam,
  contarPendentesSicam,
  contarPendentesConfirmacaoGeral,
  listarMovimentacoesPorPeriodo,
  listarDistribuicaoPorUnidade,
} from "../dashboard";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn(),
    $queryRawUnsafe: vi.fn(),
    movimentacao: {
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    unidade: {
      findMany: vi.fn(),
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── calcularTempoMedioRegistroSicam ───────────────────

describe("calcularTempoMedioRegistroSicam", () => {
  it("deve retornar tempo médio do período atual", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([
      { periodo: "atual", media_dias: 3.5, total: BigInt(10) },
    ]);

    const result = await calcularTempoMedioRegistroSicam();

    expect(result.tempoMedioDias).toBe(3.5);
    expect(result.tempoMedioPeriodoAnterior).toBeNull();
  });

  it("deve retornar 0 quando não há registros no período atual", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([]);

    const result = await calcularTempoMedioRegistroSicam();

    expect(result.tempoMedioDias).toBe(0);
    expect(result.tempoMedioPeriodoAnterior).toBeNull();
  });

  it("deve retornar tempo médio do período anterior quando presente", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([
      { periodo: "atual", media_dias: 2.0, total: BigInt(5) },
      { periodo: "anterior", media_dias: 4.0, total: BigInt(8) },
    ]);

    const result = await calcularTempoMedioRegistroSicam();

    expect(result.tempoMedioDias).toBe(2.0);
    expect(result.tempoMedioPeriodoAnterior).toBe(4.0);
  });

  it("deve retornar tempoMedioDias 0 quando media_dias é null", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([
      { periodo: "atual", media_dias: null, total: BigInt(0) },
    ]);

    const result = await calcularTempoMedioRegistroSicam();

    expect(result.tempoMedioDias).toBe(0);
  });

  it("deve arredondar para 1 casa decimal", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([
      { periodo: "atual", media_dias: 3.456, total: BigInt(3) },
    ]);

    const result = await calcularTempoMedioRegistroSicam();

    expect(result.tempoMedioDias).toBe(3.5);
  });
});

// ─── contarPendentesSicam ──────────────────────────────

describe("contarPendentesSicam", () => {
  it("deve retornar a contagem correta", async () => {
    vi.mocked(prisma.movimentacao.count).mockResolvedValueOnce(7);

    const result = await contarPendentesSicam();

    expect(result).toBe(7);
  });

  it("deve filtrar por status CONFIRMADA_ORIGEM", async () => {
    vi.mocked(prisma.movimentacao.count).mockResolvedValueOnce(0);

    await contarPendentesSicam();

    expect(prisma.movimentacao.count).toHaveBeenCalledWith({
      where: { status: "CONFIRMADA_ORIGEM" },
    });
  });

  it("deve retornar 0 quando não há pendentes", async () => {
    vi.mocked(prisma.movimentacao.count).mockResolvedValueOnce(0);

    const result = await contarPendentesSicam();

    expect(result).toBe(0);
  });
});

// ─── contarPendentesConfirmacaoGeral ──────────────────

describe("contarPendentesConfirmacaoGeral", () => {
  it("deve retornar a contagem correta", async () => {
    vi.mocked(prisma.movimentacao.count).mockResolvedValueOnce(12);

    const result = await contarPendentesConfirmacaoGeral();

    expect(result).toBe(12);
  });

  it("deve filtrar por status PENDENTE_CONFIRMACAO", async () => {
    vi.mocked(prisma.movimentacao.count).mockResolvedValueOnce(0);

    await contarPendentesConfirmacaoGeral();

    expect(prisma.movimentacao.count).toHaveBeenCalledWith({
      where: { status: "PENDENTE_CONFIRMACAO" },
    });
  });
});

// ─── listarMovimentacoesPorPeriodo ────────────────────

describe("listarMovimentacoesPorPeriodo", () => {
  it("deve usar agrupamento 'month' por default", async () => {
    vi.mocked(prisma.$queryRawUnsafe).mockResolvedValueOnce([]);

    await listarMovimentacoesPorPeriodo();

    expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining("date_trunc"),
      "month",
      expect.any(Date),
    );
  });

  it("deve usar agrupamento 'day' quando solicitado", async () => {
    vi.mocked(prisma.$queryRawUnsafe).mockResolvedValueOnce([]);

    await listarMovimentacoesPorPeriodo("dia");

    expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.any(String),
      "day",
      expect.any(Date),
    );
  });

  it("deve usar agrupamento 'week' quando solicitado", async () => {
    vi.mocked(prisma.$queryRawUnsafe).mockResolvedValueOnce([]);

    await listarMovimentacoesPorPeriodo("semana");

    expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.any(String),
      "week",
      expect.any(Date),
    );
  });

  it("deve mapear BigInt para number no total", async () => {
    const periodo = new Date("2026-04-01T00:00:00Z");
    vi.mocked(prisma.$queryRawUnsafe).mockResolvedValueOnce([
      { periodo, total: BigInt(42) },
    ]);

    const result = await listarMovimentacoesPorPeriodo("mes");

    expect(result[0].total).toBe(42);
    expect(typeof result[0].total).toBe("number");
  });

  it("deve retornar array vazio quando não há dados", async () => {
    vi.mocked(prisma.$queryRawUnsafe).mockResolvedValueOnce([]);

    const result = await listarMovimentacoesPorPeriodo("mes");

    expect(result).toEqual([]);
  });

  it("deve converter periodo para ISO string", async () => {
    const periodo = new Date("2026-01-01T00:00:00.000Z");
    vi.mocked(prisma.$queryRawUnsafe).mockResolvedValueOnce([
      { periodo, total: BigInt(3) },
    ]);

    const result = await listarMovimentacoesPorPeriodo("mes");

    expect(result[0].periodo).toBe(periodo.toISOString());
  });
});

// ─── listarDistribuicaoPorUnidade ─────────────────────

describe("listarDistribuicaoPorUnidade", () => {
  it("deve retornar array vazio quando não há movimentações", async () => {
    vi.mocked(prisma.movimentacao.groupBy).mockResolvedValueOnce([]);

    const result = await listarDistribuicaoPorUnidade();

    expect(result).toEqual([]);
    expect(prisma.unidade.findMany).not.toHaveBeenCalled();
  });

  it("deve agrupar por unidade e buscar nomes", async () => {
    vi.mocked(prisma.movimentacao.groupBy).mockResolvedValueOnce([
      { unidadeOrigemId: "u1", status: "REGISTRADA_SICAM", _count: { id: 5 } },
      { unidadeOrigemId: "u1", status: "PENDENTE_CONFIRMACAO", _count: { id: 2 } },
    ] as never);
    vi.mocked(prisma.unidade.findMany).mockResolvedValueOnce([
      { id: "u1", descricao: "TI" } as never,
    ]);

    const result = await listarDistribuicaoPorUnidade();

    expect(result).toHaveLength(1);
    expect(result[0].unidadeId).toBe("u1");
    expect(result[0].unidadeDescricao).toBe("TI");
    expect(result[0].registradas).toBe(5);
    expect(result[0].pendentes).toBe(2);
    expect(result[0].total).toBe(7);
  });

  it("deve buscar nomes somente das unidades presentes", async () => {
    vi.mocked(prisma.movimentacao.groupBy).mockResolvedValueOnce([
      { unidadeOrigemId: "u2", status: "CONFIRMADA_ORIGEM", _count: { id: 1 } },
    ] as never);
    vi.mocked(prisma.unidade.findMany).mockResolvedValueOnce([
      { id: "u2", descricao: "SEMAP" } as never,
    ]);

    await listarDistribuicaoPorUnidade();

    expect(prisma.unidade.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["u2"] } },
      }),
    );
  });

  it("deve ordenar por total decrescente", async () => {
    vi.mocked(prisma.movimentacao.groupBy).mockResolvedValueOnce([
      { unidadeOrigemId: "u1", status: "REGISTRADA_SICAM", _count: { id: 2 } },
      { unidadeOrigemId: "u2", status: "REGISTRADA_SICAM", _count: { id: 10 } },
    ] as never);
    vi.mocked(prisma.unidade.findMany).mockResolvedValueOnce([
      { id: "u1", descricao: "A" } as never,
      { id: "u2", descricao: "B" } as never,
    ]);

    const result = await listarDistribuicaoPorUnidade();

    expect(result[0].unidadeId).toBe("u2");
    expect(result[1].unidadeId).toBe("u1");
  });
});
