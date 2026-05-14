import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { listarRelatorioAuditoria } from "../auditoria";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    movimentacao: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

const mockMovimentacao = {
  id: "m1",
  codigo: "abc123",
  status: "PENDENTE_CONFIRMACAO" as const,
  createdAt: new Date("2026-05-01T10:00:00Z"),
  confirmadoEm: null,
  dataRegistroSicam: null,
  protocoloSicam: null,
  confirmadoPorNome: null,
  unidadeOrigem: { descricao: "TI" },
  unidadeDestino: { descricao: "SEMAP" },
  tecnico: { nome: "João" },
  registradoSicamPor: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.movimentacao.findMany).mockResolvedValue([]);
  vi.mocked(prisma.movimentacao.count).mockResolvedValue(0);
});

// ─── paginação ─────────────────────────────────────────

describe("listarRelatorioAuditoria — paginação", () => {
  it("deve usar paginação default (pagina=1, porPagina=20, skip=0)", async () => {
    await listarRelatorioAuditoria();

    expect(prisma.movimentacao.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 20 }),
    );
  });

  it("deve calcular skip corretamente para página 2", async () => {
    await listarRelatorioAuditoria({ pagina: 2 });

    expect(prisma.movimentacao.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 20 }),
    );
  });

  it("deve retornar paginaAtual igual ao parâmetro informado", async () => {
    const result = await listarRelatorioAuditoria({ pagina: 3 });

    expect(result.paginaAtual).toBe(3);
  });

  it("deve calcular totalPaginas corretamente", async () => {
    vi.mocked(prisma.movimentacao.count).mockResolvedValueOnce(45);

    const result = await listarRelatorioAuditoria();

    expect(result.totalPaginas).toBe(3); // Math.ceil(45/20)
  });

  it("deve retornar totalPaginas 0 quando não há resultados", async () => {
    const result = await listarRelatorioAuditoria();

    expect(result.total).toBe(0);
    expect(result.totalPaginas).toBe(0);
    expect(result.movimentacoes).toEqual([]);
  });

  it("deve ordenar por createdAt decrescente", async () => {
    await listarRelatorioAuditoria();

    expect(prisma.movimentacao.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: "desc" } }),
    );
  });
});

// ─── filtros ───────────────────────────────────────────

describe("listarRelatorioAuditoria — filtros", () => {
  it("deve filtrar por status quando informado", async () => {
    await listarRelatorioAuditoria({ status: "REGISTRADA_SICAM" });

    expect(prisma.movimentacao.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "REGISTRADA_SICAM" }),
      }),
    );
  });

  it("não deve incluir filtro de status quando não informado", async () => {
    await listarRelatorioAuditoria({});

    const callArgs = vi.mocked(prisma.movimentacao.findMany).mock.calls[0][0];
    expect(callArgs?.where).not.toHaveProperty("status");
  });

  it("deve filtrar por período início (createdAt gte)", async () => {
    await listarRelatorioAuditoria({ periodoInicio: "2026-01-01" });

    const callArgs = vi.mocked(prisma.movimentacao.findMany).mock.calls[0][0];
    expect(callArgs?.where?.createdAt).toMatchObject({ gte: expect.any(Date) });
  });

  it("deve filtrar por período fim (createdAt lte)", async () => {
    await listarRelatorioAuditoria({ periodoFim: "2026-05-31" });

    const callArgs = vi.mocked(prisma.movimentacao.findMany).mock.calls[0][0];
    expect(callArgs?.where?.createdAt).toMatchObject({ lte: expect.any(Date) });
  });

  it("deve filtrar por unidade via OR em origem e destino", async () => {
    await listarRelatorioAuditoria({ unidadeId: "u1" });

    expect(prisma.movimentacao.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { unidadeOrigemId: "u1" },
            { unidadeDestinoId: "u1" },
          ],
        }),
      }),
    );
  });

  it("deve filtrar por responsável (tecnico.nome contains insensitive)", async () => {
    await listarRelatorioAuditoria({ responsavel: "João" });

    expect(prisma.movimentacao.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tecnico: {
            nome: { contains: "João", mode: "insensitive" },
          },
        }),
      }),
    );
  });

  it("deve aplicar o mesmo where no count e no findMany", async () => {
    await listarRelatorioAuditoria({ status: "CONFIRMADA_DESTINO" });

    const findManyWhere = vi.mocked(prisma.movimentacao.findMany).mock.calls[0][0]?.where;
    const countWhere = vi.mocked(prisma.movimentacao.count).mock.calls[0][0]?.where;

    expect(findManyWhere).toEqual(countWhere);
  });
});

// ─── retorno com dados ─────────────────────────────────

describe("listarRelatorioAuditoria — retorno", () => {
  it("deve retornar movimentações corretamente", async () => {
    vi.mocked(prisma.movimentacao.findMany).mockResolvedValueOnce(
      [mockMovimentacao] as never,
    );
    vi.mocked(prisma.movimentacao.count).mockResolvedValueOnce(1);

    const result = await listarRelatorioAuditoria();

    expect(result.movimentacoes).toHaveLength(1);
    expect(result.movimentacoes[0].id).toBe("m1");
    expect(result.total).toBe(1);
    expect(result.totalPaginas).toBe(1);
  });
});
