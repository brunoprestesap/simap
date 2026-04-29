import { beforeEach, describe, expect, it, vi } from "vitest";
import { TOMBO_EM_MOVIMENTACAO_WHERE } from "@/lib/movimentacao-status";
import { prisma } from "@/lib/prisma";
import { buscarTomboDetalhe, buscarTomboParaMovimentacao, listarTombos } from "../tombo";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tombo: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

const mockTomboBase = {
  id: "t1",
  numero: "100",
  descricaoMaterial: "Notebook",
  unidade: { id: "u1", codigo: "NTI", descricao: "TI" },
  setor: { id: "s1", codigo: "SEC", nome: "Infra" },
  usuarioResponsavel: { id: "usr1", nome: "Ana", matricula: "AP1" },
  matriculaResponsavel: null as string | null,
  nomeResponsavel: null as string | null,
};

describe("listarTombos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.tombo.findMany).mockResolvedValue([]);
    vi.mocked(prisma.tombo.count).mockResolvedValue(0);
  });

  it("chama findMany e count com paginação default", async () => {
    const r = await listarTombos();
    expect(r.tombos).toEqual([]);
    expect(r.total).toBe(0);
    expect(r.totalPaginas).toBe(0);
    expect(r.paginaAtual).toBe(1);
    expect(prisma.tombo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
        skip: 0,
        take: 20,
        orderBy: { numero: "asc" },
      }),
    );
    expect(prisma.tombo.count).toHaveBeenCalledWith({ where: {} });
  });

  it("aplica busca em número e descrição (OR insensível a maiúsculas)", async () => {
    await listarTombos({ busca: "not" });
    const expectedOr = [
      { numero: { contains: "not", mode: "insensitive" } },
      { descricaoMaterial: { contains: "not", mode: "insensitive" } },
    ];
    expect(prisma.tombo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { OR: expectedOr },
      }),
    );
    expect(prisma.tombo.count).toHaveBeenCalledWith({
      where: { OR: expectedOr },
    });
  });

  it("filtra por unidade e setor", async () => {
    await listarTombos({ unidadeId: "u1", setorId: "s1" });
    expect(prisma.tombo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { unidadeId: "u1", setorId: "s1" },
      }),
    );
  });

  it("filtra ativos e inativos", async () => {
    await listarTombos({ status: "ativos" });
    expect(prisma.tombo.count).toHaveBeenCalledWith({
      where: { ativo: true },
    });

    vi.clearAllMocks();
    vi.mocked(prisma.tombo.findMany).mockResolvedValue([]);
    vi.mocked(prisma.tombo.count).mockResolvedValue(0);

    await listarTombos({ status: "inativos" });
    expect(prisma.tombo.count).toHaveBeenCalledWith({
      where: { ativo: false },
    });
  });

  it("filtra em_movimentacao com itens de movimentação em aberto", async () => {
    await listarTombos({ status: "em_movimentacao" });
    expect(prisma.tombo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          ativo: true,
          itensMovimentacao: TOMBO_EM_MOVIMENTACAO_WHERE,
        },
      }),
    );
  });

  it("calcula skip e totalPaginas", async () => {
    vi.mocked(prisma.tombo.count).mockResolvedValue(45);
    vi.mocked(prisma.tombo.findMany).mockResolvedValue([]);

    const r = await listarTombos({ pagina: 2, porPagina: 10 });
    expect(r.totalPaginas).toBe(5);
    expect(r.paginaAtual).toBe(2);
    expect(prisma.tombo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
      }),
    );
  });
});

describe("buscarTomboParaMovimentacao", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna nao_encontrado quando o tombo não existe", async () => {
    vi.mocked(prisma.tombo.findFirst).mockResolvedValue(null);

    const r = await buscarTomboParaMovimentacao("999999");
    expect(r).toEqual({ status: "nao_encontrado", codigo: "999999" });
    expect(prisma.tombo.findFirst).toHaveBeenCalledTimes(1);
  });

  it("retorna em_movimentacao quando há item em movimentação ativa", async () => {
    vi.mocked(prisma.tombo.findFirst).mockResolvedValue({
      ...mockTomboBase,
      itensMovimentacao: [{ id: "im1" }],
    } as Awaited<ReturnType<typeof prisma.tombo.findFirst>>);

    const r = await buscarTomboParaMovimentacao("100");
    expect(r).toEqual({ status: "em_movimentacao", codigo: "100" });
  });

  it("retorna disponivel com tombo mapeado quando não há movimentação pendente", async () => {
    vi.mocked(prisma.tombo.findFirst).mockResolvedValue({
      ...mockTomboBase,
      itensMovimentacao: [],
    } as Awaited<ReturnType<typeof prisma.tombo.findFirst>>);

    const r = await buscarTomboParaMovimentacao("100");
    expect(r).toEqual({
      status: "disponivel",
      tombo: {
        id: "t1",
        numero: "100",
        descricaoMaterial: "Notebook",
        unidade: mockTomboBase.unidade,
        setor: mockTomboBase.setor,
        usuarioResponsavel: mockTomboBase.usuarioResponsavel,
        matriculaResponsavel: null,
        nomeResponsavel: null,
      },
    });
  });

  it("inclui número sem zeros à esquerda na lista de candidatos (lookup único)", async () => {
    vi.mocked(prisma.tombo.findFirst).mockResolvedValue({
      ...mockTomboBase,
      numero: "11706",
      itensMovimentacao: [],
    } as Awaited<ReturnType<typeof prisma.tombo.findFirst>>);

    const r = await buscarTomboParaMovimentacao("011706");

    // Era 2 roundtrips; agora é 1 só com `numero: { in: [...] }`.
    expect(prisma.tombo.findFirst).toHaveBeenCalledTimes(1);
    expect(prisma.tombo.findFirst).toHaveBeenCalledWith({
      where: { numero: { in: ["011706", "11706"] } },
      include: expect.any(Object),
    });
    expect(r).toMatchObject({
      status: "disponivel",
      tombo: { numero: "11706" },
    });
  });

  it("não inclui número trimmed quando o input é só zeros", async () => {
    vi.mocked(prisma.tombo.findFirst).mockResolvedValue(null);

    const r = await buscarTomboParaMovimentacao("000");
    expect(prisma.tombo.findFirst).toHaveBeenCalledWith({
      where: { numero: { in: ["000"] } },
      include: expect.any(Object),
    });
    expect(r).toEqual({ status: "nao_encontrado", codigo: "000" });
  });
});

describe("buscarTomboDetalhe", () => {
  const mockTomboDetalhe = {
    id: "t1",
    numero: "0034521",
    descricaoMaterial: "Notebook Dell Latitude 5520",
    codigoFornecedor: "DL-001",
    nomeFornecedor: "Dell Computadores do Brasil",
    ativo: true,
    matriculaResponsavel: null as string | null,
    nomeResponsavel: null as string | null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-04-27"),
    unidade: { id: "u1", codigo: "GAB", descricao: "Gabinete do Juiz" },
    setor: { id: "s1", codigo: "SEC", nome: "Secretaria" },
    usuarioResponsavel: { id: "usr1", nome: "João Silva", matricula: "001234" },
    itensMovimentacao: [
      {
        id: "im1",
        movimentacaoId: "m1",
        tomboId: "t1",
        createdAt: new Date("2025-04-15"),
        movimentacao: {
          id: "m1",
          status: "REGISTRADA_SICAM" as const,
          createdAt: new Date("2025-04-15"),
          unidadeOrigem: { codigo: "TI", descricao: "Setor de TI" },
          unidadeDestino: { codigo: "GAB", descricao: "Gabinete do Juiz" },
          tecnico: { nome: "Carlos TI" },
        },
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna null quando o tombo não existe", async () => {
    vi.mocked(prisma.tombo.findUnique).mockResolvedValue(null);

    const result = await buscarTomboDetalhe("nao-existe");

    expect(result).toBeNull();
    expect(prisma.tombo.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "nao-existe" } }),
    );
  });

  it("retorna tombo com dados completos incluindo movimentações", async () => {
    vi.mocked(prisma.tombo.findUnique).mockResolvedValue(
      mockTomboDetalhe as unknown as Awaited<
        ReturnType<typeof prisma.tombo.findUnique>
      >,
    );

    const result = await buscarTomboDetalhe("t1");

    expect(result).not.toBeNull();
    expect(result?.numero).toBe("0034521");
    expect(result?.itensMovimentacao).toHaveLength(1);
    expect(result?.itensMovimentacao[0].movimentacao.status).toBe(
      "REGISTRADA_SICAM",
    );
  });

  it("chama findUnique com include de movimentações limitado a 10 e ordenado desc", async () => {
    vi.mocked(prisma.tombo.findUnique).mockResolvedValue(null);

    await buscarTomboDetalhe("t1");

    expect(prisma.tombo.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "t1" },
        include: expect.objectContaining({
          itensMovimentacao: expect.objectContaining({
            orderBy: { createdAt: "desc" },
            take: 10,
          }),
        }),
      }),
    );
  });
});
