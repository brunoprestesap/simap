import { beforeEach, describe, expect, it, vi } from "vitest";
import { previewImportacaoCsv, confirmarImportacaoCsv } from "@/server/actions/importacao";
import { requireRoleAction } from "@/lib/auth-guard";
import { parseCsvSicam } from "@/server/services/csv-parser";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/server/services/audit";

vi.mock("@/lib/auth-guard", () => ({
  requireRoleAction: vi.fn(),
}));

vi.mock("@/server/services/csv-parser", () => ({
  parseCsvSicam: vi.fn(),
}));

vi.mock("@/server/services/audit", () => ({
  registrarAuditoria: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    unidade: {
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
    setor: {
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
    usuario: {
      findMany: vi.fn(),
    },
    tombo: {
      findMany: vi.fn(),
      update: vi.fn(),
      createMany: vi.fn(),
    },
    importacaoCSV: {
      create: vi.fn(),
    },
    notificacao: {
      createMany: vi.fn(),
    },
  },
}));

function csvFile(name = "dados.csv") {
  return new File(["numero;descricao"], name, { type: "text/csv" });
}

function csvFileMock(name = "dados.csv") {
  return {
    name,
    arrayBuffer: vi.fn().mockResolvedValue(new TextEncoder().encode("numero;descricao").buffer),
  } as unknown as File;
}

describe("importacao csv actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireRoleAction).mockResolvedValue({
      user: {
        id: "admin-1",
        matricula: "AP99999",
        nome: "Gestor",
        perfil: "GESTOR_ADMIN",
      },
      error: null,
    });
  });

  it("previewImportacaoCsv deve rejeitar arquivo não-csv", async () => {
    const formData = new FormData();
    formData.set("arquivo", new File(["x"], "dados.txt", { type: "text/plain" }));

    const result = await previewImportacaoCsv(formData);

    expect(result).toEqual({
      success: false,
      error: "Selecione um arquivo CSV válido.",
    });
  });

  it("confirmarImportacaoCsv deve importar com novos/atualizados e registrar auditoria", async () => {
    const registros = [
      {
        numeroTombo: "1001",
        descricaoMaterial: "Notebook",
        codigoFornecedor: "F1",
        nomeFornecedor: "Fornecedor 1",
        codigoLotacao: "U1",
        descricaoLotacao: "Unidade 1",
        codigoSetor: "S1",
        nomeSetor: "Setor 1",
        matriculaResponsavel: "AP10001",
        nomeResponsavel: "Resp 1",
        saida: null,
      },
      {
        numeroTombo: "1002",
        descricaoMaterial: "Monitor",
        codigoFornecedor: "F2",
        nomeFornecedor: "Fornecedor 2",
        codigoLotacao: "U1",
        descricaoLotacao: "Unidade 1",
        codigoSetor: "S1",
        nomeSetor: "Setor 1",
        matriculaResponsavel: "AP10001",
        nomeResponsavel: "Resp 1",
        saida: null,
      },
    ];

    vi.mocked(parseCsvSicam).mockReturnValue({
      registros,
      erros: [],
    } as unknown as ReturnType<typeof parseCsvSicam>);

    vi.mocked(prisma.unidade.findMany)
      .mockResolvedValueOnce([] as Awaited<ReturnType<typeof prisma.unidade.findMany>>)
      .mockResolvedValueOnce([
        { id: "u1", codigo: "U1" },
      ] as Awaited<ReturnType<typeof prisma.unidade.findMany>>);

    vi.mocked(prisma.setor.findMany)
      .mockResolvedValueOnce([] as Awaited<ReturnType<typeof prisma.setor.findMany>>)
      .mockResolvedValueOnce([
        { id: "s1", codigo: "S1", unidadeId: "u1" },
      ] as Awaited<ReturnType<typeof prisma.setor.findMany>>);

    vi.mocked(prisma.usuario.findMany)
      .mockResolvedValueOnce([
        { id: "resp-1", matricula: "AP10001" },
      ] as Awaited<ReturnType<typeof prisma.usuario.findMany>>)
      .mockResolvedValueOnce([
        { id: "semap-1" },
      ] as Awaited<ReturnType<typeof prisma.usuario.findMany>>);

    vi.mocked(prisma.tombo.findMany).mockResolvedValue([
      { id: "t-existente", numero: "1001" },
    ] as Awaited<ReturnType<typeof prisma.tombo.findMany>>);

    vi.mocked(prisma.tombo.update).mockResolvedValue({
      id: "t-existente",
    } as Awaited<ReturnType<typeof prisma.tombo.update>>);

    vi.mocked(prisma.tombo.createMany).mockResolvedValue({
      count: 1,
    } as Awaited<ReturnType<typeof prisma.tombo.createMany>>);

    vi.mocked(prisma.importacaoCSV.create).mockResolvedValue({
      id: "imp-1",
    } as Awaited<ReturnType<typeof prisma.importacaoCSV.create>>);

    vi.mocked(prisma.notificacao.createMany).mockResolvedValue({
      count: 1,
    } as Awaited<ReturnType<typeof prisma.notificacao.createMany>>);

    const formData = {
      get: vi.fn().mockReturnValue(csvFileMock()),
    } as unknown as FormData;

    const result = await confirmarImportacaoCsv(formData);

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      total: 2,
      novos: 1,
      atualizados: 1,
      erros: 0,
    });
    expect(prisma.importacaoCSV.create).toHaveBeenCalledTimes(1);
    expect(prisma.notificacao.createMany).toHaveBeenCalledTimes(1);
    expect(registrarAuditoria).toHaveBeenCalledTimes(1);
  });

  it("confirmarImportacaoCsv deve acumular erro quando createMany de tombos falhar", async () => {
    const registros = [
      {
        numeroTombo: "2001",
        descricaoMaterial: "Impressora",
        codigoFornecedor: null,
        nomeFornecedor: null,
        codigoLotacao: "U2",
        descricaoLotacao: "Unidade 2",
        codigoSetor: "S2",
        nomeSetor: "Setor 2",
        matriculaResponsavel: "AP20001",
        nomeResponsavel: "Resp 2",
        saida: null,
      },
    ];

    vi.mocked(parseCsvSicam).mockReturnValue({
      registros,
      erros: [],
    } as unknown as ReturnType<typeof parseCsvSicam>);

    vi.mocked(prisma.unidade.findMany)
      .mockResolvedValueOnce([] as Awaited<ReturnType<typeof prisma.unidade.findMany>>)
      .mockResolvedValueOnce([
        { id: "u2", codigo: "U2" },
      ] as Awaited<ReturnType<typeof prisma.unidade.findMany>>);

    vi.mocked(prisma.setor.findMany)
      .mockResolvedValueOnce([] as Awaited<ReturnType<typeof prisma.setor.findMany>>)
      .mockResolvedValueOnce([
        { id: "s2", codigo: "S2", unidadeId: "u2" },
      ] as Awaited<ReturnType<typeof prisma.setor.findMany>>);

    vi.mocked(prisma.usuario.findMany)
      .mockResolvedValueOnce([
        { id: "resp-2", matricula: "AP20001" },
      ] as Awaited<ReturnType<typeof prisma.usuario.findMany>>)
      .mockResolvedValueOnce([] as Awaited<ReturnType<typeof prisma.usuario.findMany>>);

    vi.mocked(prisma.tombo.findMany).mockResolvedValue(
      [] as Awaited<ReturnType<typeof prisma.tombo.findMany>>,
    );

    vi.mocked(prisma.tombo.createMany).mockRejectedValue(new Error("db indisponível"));

    vi.mocked(prisma.importacaoCSV.create).mockResolvedValue({
      id: "imp-erro-1",
    } as Awaited<ReturnType<typeof prisma.importacaoCSV.create>>);

    vi.mocked(prisma.notificacao.createMany).mockResolvedValue({
      count: 0,
    } as Awaited<ReturnType<typeof prisma.notificacao.createMany>>);

    const formData = {
      get: vi.fn().mockReturnValue(csvFileMock("erro.csv")),
    } as unknown as FormData;

    const result = await confirmarImportacaoCsv(formData);

    expect(result.success).toBe(true);
    expect(result.data?.novos).toBe(0);
    expect(result.data?.erros).toBe(1);
    expect(result.data?.errosDetalhe[0]?.mensagem).toContain("Erro ao criar batch");
  });

  it("confirmarImportacaoCsv deve usar fallback de responsável sem usuarioResponsavelId", async () => {
    const registros = [
      {
        numeroTombo: "3001",
        descricaoMaterial: "Teclado",
        codigoFornecedor: null,
        nomeFornecedor: null,
        codigoLotacao: "U3",
        descricaoLotacao: "Unidade 3",
        codigoSetor: "S3",
        nomeSetor: "Setor 3",
        matriculaResponsavel: "AP30001",
        nomeResponsavel: "Responsável CSV",
        saida: null,
      },
    ];

    vi.mocked(parseCsvSicam).mockReturnValue({
      registros,
      erros: [],
    } as unknown as ReturnType<typeof parseCsvSicam>);

    vi.mocked(prisma.unidade.findMany)
      .mockResolvedValueOnce([] as Awaited<ReturnType<typeof prisma.unidade.findMany>>)
      .mockResolvedValueOnce([
        { id: "u3", codigo: "U3" },
      ] as Awaited<ReturnType<typeof prisma.unidade.findMany>>);

    vi.mocked(prisma.setor.findMany)
      .mockResolvedValueOnce([] as Awaited<ReturnType<typeof prisma.setor.findMany>>)
      .mockResolvedValueOnce([
        { id: "s3", codigo: "S3", unidadeId: "u3" },
      ] as Awaited<ReturnType<typeof prisma.setor.findMany>>);

    vi.mocked(prisma.usuario.findMany)
      .mockResolvedValueOnce([] as Awaited<ReturnType<typeof prisma.usuario.findMany>>)
      .mockResolvedValueOnce([] as Awaited<ReturnType<typeof prisma.usuario.findMany>>);

    vi.mocked(prisma.tombo.findMany).mockResolvedValue([
      { id: "t-3001", numero: "3001" },
    ] as Awaited<ReturnType<typeof prisma.tombo.findMany>>);

    vi.mocked(prisma.tombo.update).mockResolvedValue({
      id: "t-3001",
    } as Awaited<ReturnType<typeof prisma.tombo.update>>);

    vi.mocked(prisma.importacaoCSV.create).mockResolvedValue({
      id: "imp-3",
    } as Awaited<ReturnType<typeof prisma.importacaoCSV.create>>);

    const formData = {
      get: vi.fn().mockReturnValue(csvFileMock("fallback.csv")),
    } as unknown as FormData;

    const result = await confirmarImportacaoCsv(formData);

    expect(result.success).toBe(true);
    expect(prisma.tombo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          matriculaResponsavel: "AP30001",
          nomeResponsavel: "Responsável CSV",
          usuarioResponsavelId: null,
        }),
      }),
    );
  });
});
