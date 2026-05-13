import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  listarTodosTombosAtivos,
  buscarHistoricoTermosBatch,
} from "@/server/queries/sicam";
import { executarSincronizacaoSicam } from "@/server/services/sicam-sync";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    unidade: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    setor: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    usuario: {
      findMany: vi.fn(),
    },
    tombo: {
      findMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    historicoTermoSicam: {
      upsert: vi.fn(),
    },
    sincronizacaoSicam: {
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/server/queries/sicam", () => ({
  listarTodosTombosAtivos: vi.fn(),
  buscarHistoricoTermosBatch: vi.fn(),
}));

const mockSync = vi.mocked(listarTodosTombosAtivos);
const mockTermosBatch = vi.mocked(buscarHistoricoTermosBatch);

function tomboFixture(overrides: Partial<{
  numero: string;
  codLotacao: number | null;
  codSetor: number | null;
  matriculaResponsavel: string | null;
  nuTermo: number | null;
  descLotacao: string | null;
  siglaLotacao: string | null;
}> = {}) {
  return {
    numero: overrides.numero ?? "12423",
    descricaoMaterial: "MONITOR LG",
    tipoTombo: "T",
    codigoFornecedor: "07953689000118",
    nomeFornecedor: "FAGUNDEZ",
    nuTermo: overrides.nuTermo !== undefined ? overrides.nuTermo : 100,
    anTermo: 2023,
    tiTermo: 1,
    codLotacao: overrides.codLotacao ?? 348,
    codSetor: overrides.codSetor ?? 9,
    nomeSetor: "SETSIS",
    matriculaResponsavel: overrides.matriculaResponsavel ?? "AP20192",
    dataTermo: new Date("2025-12-03"),
    termoAssinado: true,
    descLotacao: overrides.descLotacao ?? null,
    siglaLotacao: overrides.siglaLotacao ?? null,
  };
}

function pageResult(tombos: ReturnType<typeof tomboFixture>[], pagina = 1, totalPaginas = 1) {
  return {
    tombos,
    total: tombos.length,
    pagina,
    porPagina: 500,
    totalPaginas,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.sincronizacaoSicam.create).mockResolvedValue({
    id: "sync1",
  } as never);
  vi.mocked(prisma.sincronizacaoSicam.update).mockResolvedValue({} as never);
  vi.mocked(prisma.unidade.findMany).mockResolvedValue([]);
  vi.mocked(prisma.setor.findMany).mockResolvedValue([]);
  vi.mocked(prisma.usuario.findMany).mockResolvedValue([]);
  vi.mocked(prisma.tombo.findMany).mockResolvedValue([]);
  // Defaults para o fluxo de resolverLocalizacao quando código aparece pela
  // primeira vez. Testes específicos podem sobrescrever.
  vi.mocked(prisma.unidade.create).mockResolvedValue({
    id: "u-default",
  } as never);
  vi.mocked(prisma.setor.create).mockResolvedValue({
    id: "s-default",
  } as never);
  vi.mocked(prisma.tombo.create).mockResolvedValue({} as never);
  vi.mocked(prisma.tombo.update).mockResolvedValue({} as never);
  vi.mocked(prisma.historicoTermoSicam.upsert).mockResolvedValue({} as never);
  // Por padrão, buscarHistoricoTermosBatch retorna Map vazia (sem TERMOs)
  mockTermosBatch.mockResolvedValue(new Map());
});

describe("executarSincronizacaoSicam", () => {
  it("cria SincronizacaoSicam em EM_ANDAMENTO no início", async () => {
    mockSync.mockResolvedValue(pageResult([]));

    await executarSincronizacaoSicam("user-id");

    expect(prisma.sincronizacaoSicam.create).toHaveBeenCalledWith({
      data: {
        iniciadoPorId: "user-id",
        status: "EM_ANDAMENTO",
      },
    });
  });

  it("conclui com status CONCLUIDA quando não há tombos", async () => {
    mockSync.mockResolvedValue(pageResult([]));

    const r = await executarSincronizacaoSicam("user-id");

    expect(r.totalProcessados).toBe(0);
    expect(r.novos).toBe(0);
    expect(r.atualizados).toBe(0);
    expect(r.erros).toBe(0);
    expect(prisma.sincronizacaoSicam.update).toHaveBeenLastCalledWith({
      where: { id: "sync1" },
      data: expect.objectContaining({ status: "CONCLUIDA" }),
    });
  });

  it("cria Tombo novo quando não existe localmente", async () => {
    mockSync.mockResolvedValue(pageResult([tomboFixture()]));

    const r = await executarSincronizacaoSicam("user-id");

    expect(r.novos).toBe(1);
    expect(r.atualizados).toBe(0);
    expect(prisma.tombo.create).toHaveBeenCalledTimes(1);
  });

  it("atualiza Tombo existente em vez de criar", async () => {
    mockSync.mockResolvedValue(pageResult([tomboFixture()]));
    vi.mocked(prisma.tombo.findMany).mockResolvedValue([
      { id: "existing-t1", numero: "12423" },
    ] as never);

    const r = await executarSincronizacaoSicam("user-id");

    expect(r.atualizados).toBe(1);
    expect(r.novos).toBe(0);
    expect(prisma.tombo.update).toHaveBeenCalledWith({
      where: { id: "existing-t1" },
      data: expect.objectContaining({ descricaoMaterial: "MONITOR LG" }),
    });
    expect(prisma.tombo.create).not.toHaveBeenCalled();
  });

  it("cria Unidade quando código de lotação ainda não existe localmente", async () => {
    mockSync.mockResolvedValue(pageResult([tomboFixture({ codLotacao: 999 })]));
    vi.mocked(prisma.unidade.create).mockResolvedValue({ id: "u-new" } as never);

    await executarSincronizacaoSicam("user-id");

    expect(prisma.unidade.create).toHaveBeenCalledWith({
      data: { codigo: "999", descricao: "999" },
      select: { id: true },
    });
  });

  it("reutiliza Unidade do cache local em tombos subsequentes", async () => {
    mockSync.mockResolvedValue(
      pageResult([
        tomboFixture({ numero: "1", codLotacao: 348 }),
        tomboFixture({ numero: "2", codLotacao: 348 }),
        tomboFixture({ numero: "3", codLotacao: 348 }),
      ]),
    );
    vi.mocked(prisma.unidade.findMany).mockResolvedValue([
      { id: "u-cached", codigo: "348" },
    ] as never);

    await executarSincronizacaoSicam("user-id");

    // Não deve criar Unidade — já estava em cache
    expect(prisma.unidade.create).not.toHaveBeenCalled();
  });

  it("vincula usuarioResponsavelId quando matrícula existe em Usuario", async () => {
    mockSync.mockResolvedValue(pageResult([tomboFixture()]));
    vi.mocked(prisma.usuario.findMany).mockResolvedValue([
      { id: "user-resp", matricula: "AP20192" },
    ] as never);

    await executarSincronizacaoSicam("user-id");

    expect(prisma.tombo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ usuarioResponsavelId: "user-resp" }),
      }),
    );
  });

  it("deixa usuarioResponsavelId null quando matrícula não existe localmente", async () => {
    mockSync.mockResolvedValue(pageResult([tomboFixture()]));
    vi.mocked(prisma.usuario.findMany).mockResolvedValue([]);

    await executarSincronizacaoSicam("user-id");

    expect(prisma.tombo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          usuarioResponsavelId: null,
          matriculaResponsavel: "AP20192",
        }),
      }),
    );
  });

  it("conta erros por tombo sem abortar o ciclo", async () => {
    mockSync.mockResolvedValue(
      pageResult([
        tomboFixture({ numero: "1" }),
        tomboFixture({ numero: "2" }),
        tomboFixture({ numero: "3" }),
      ]),
    );
    vi.mocked(prisma.tombo.create)
      .mockResolvedValueOnce({} as never)
      .mockRejectedValueOnce(new Error("constraint violation"))
      .mockResolvedValueOnce({} as never);

    const r = await executarSincronizacaoSicam("user-id");

    expect(r.totalProcessados).toBe(2);
    expect(r.novos).toBe(2);
    expect(r.erros).toBe(1);
    expect(prisma.sincronizacaoSicam.update).toHaveBeenLastCalledWith({
      where: { id: "sync1" },
      data: expect.objectContaining({ status: "CONCLUIDA", erros: 1 }),
    });
  });

  it("marca como ERRO quando falha global (ex: Oracle fora)", async () => {
    mockSync.mockRejectedValueOnce(new Error("ORA-12541: TNS:no listener"));

    await expect(executarSincronizacaoSicam("user-id")).rejects.toThrow(
      /ORA-12541/,
    );

    expect(prisma.sincronizacaoSicam.update).toHaveBeenLastCalledWith({
      where: { id: "sync1" },
      data: expect.objectContaining({
        status: "ERRO",
        mensagemErro: expect.stringContaining("ORA-12541"),
      }),
    });
  });

  it("processa múltiplas páginas sequencialmente", async () => {
    mockSync
      .mockResolvedValueOnce(
        pageResult([tomboFixture({ numero: "1" })], 1, 2),
      )
      .mockResolvedValueOnce(
        pageResult([tomboFixture({ numero: "2" })], 2, 2),
      );

    const r = await executarSincronizacaoSicam("user-id");

    expect(mockSync).toHaveBeenCalledTimes(2);
    expect(r.totalProcessados).toBe(2);
  });

  it("usa Tombo.ativo = true ao criar ou atualizar (reativa baixados que voltarem)", async () => {
    mockSync.mockResolvedValue(pageResult([tomboFixture()]));

    await executarSincronizacaoSicam("user-id");

    expect(prisma.tombo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ ativo: true }),
      }),
    );
  });

  describe("fase 2 — sync de TERMOs", () => {
    it("upserta TERMOs no Prisma após sincronizar tombos da página", async () => {
      mockSync.mockResolvedValue(pageResult([tomboFixture({ numero: "12423" })]));
      vi.mocked(prisma.tombo.findMany).mockResolvedValue([
        { id: "tombo-local-1", numero: "12423" },
      ] as never);

      const termoMap = new Map([
        [
          "12423",
          [
            {
              nuTombo: "12423",
              nuTermo: 12,
              anTermo: 2024,
              tiTermo: 1,
              dtTermo: new Date("2024-06-15"),
              codLotacao: 348,
              codSetor: 9,
              nomeSetor: "SETSIS",
              matriculaResp: "AP20192",
            },
          ],
        ],
      ]);
      mockTermosBatch.mockResolvedValueOnce(termoMap);

      await executarSincronizacaoSicam("user-id");

      // 2 chamadas: (1) TERMO atual do tombo (nuTermo=100/2023 do fixture),
      //              (2) TERMO histórico do batch (nuTermo=12/2024 do termoMap)
      expect(prisma.historicoTermoSicam.upsert).toHaveBeenCalledTimes(2);
      expect(prisma.historicoTermoSicam.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tomboId_nuTermo_anTermo_tiTermo: {
              tomboId: "tombo-local-1",
              nuTermo: 12,
              anTermo: 2024,
              tiTermo: 1,
            },
          },
          create: expect.objectContaining({
            tomboId: "tombo-local-1",
            nuTermo: 12,
            anTermo: 2024,
            tiTermo: 1,
            codLotacao: 348,
          }),
        }),
      );
    });

    it("não aborta o ciclo quando falha na busca batch de TERMOs", async () => {
      mockSync.mockResolvedValue(pageResult([tomboFixture()]));
      mockTermosBatch.mockRejectedValueOnce(
        new Error("ORA-00942: table or view does not exist"),
      );

      const r = await executarSincronizacaoSicam("user-id");

      // Tombo ainda foi processado normalmente
      expect(r.totalProcessados).toBe(1);
      expect(r.novos).toBe(1);
      // Sync concluído sem abortar
      expect(prisma.sincronizacaoSicam.update).toHaveBeenLastCalledWith({
        where: { id: "sync1" },
        data: expect.objectContaining({ status: "CONCLUIDA" }),
      });
    });

    it("falha em TERMO individual não incrementa contador de erros do tombo", async () => {
      mockSync.mockResolvedValue(pageResult([tomboFixture({ numero: "12423" })]));
      vi.mocked(prisma.tombo.findMany).mockResolvedValue([
        { id: "tombo-local-1", numero: "12423" },
      ] as never);

      const termoMap = new Map([
        [
          "12423",
          [
            {
              nuTombo: "12423",
              nuTermo: 12,
              anTermo: 2024,
              tiTermo: 1,
              dtTermo: new Date("2024-06-15"),
              codLotacao: 348,
              codSetor: null,
              nomeSetor: null,
              matriculaResp: null,
            },
          ],
        ],
      ]);
      mockTermosBatch.mockResolvedValueOnce(termoMap);
      vi.mocked(prisma.historicoTermoSicam.upsert).mockRejectedValueOnce(
        new Error("constraint"),
      );

      const r = await executarSincronizacaoSicam("user-id");

      // Tombo foi processado; erro de TERMO não conta no contador principal
      expect(r.erros).toBe(0);
      expect(r.totalProcessados).toBe(1);
    });

    it("não chama buscarHistoricoTermosBatch quando página não tem tombos", async () => {
      mockSync.mockResolvedValue(pageResult([]));

      await executarSincronizacaoSicam("user-id");

      expect(mockTermosBatch).not.toHaveBeenCalled();
    });
  });
});
