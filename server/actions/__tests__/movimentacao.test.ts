import { beforeEach, describe, expect, it, vi } from "vitest";
import { criarMovimentacao } from "@/server/actions/movimentacao";
import { requireAuthAction } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/server/services/audit";
import { buscarEmailsPorMatriculas } from "@/server/services/ldap";
import { criarNotificacoes, buscarUsuarioIdsPorMatriculas } from "@/server/services/notificacao";

vi.mock("@/lib/auth-guard", () => ({
  requireAuthAction: vi.fn(),
}));

vi.mock("@/server/services/audit", () => ({
  registrarAuditoria: vi.fn(),
}));

vi.mock("@/server/services/email", () => ({
  enviarEmail: vi.fn(),
}));

vi.mock("@/server/services/notificacao", () => ({
  criarNotificacoes: vi.fn(),
  buscarUsuarioIdsPorMatriculas: vi.fn(),
}));

vi.mock("@/server/services/ldap", () => ({
  buscarEmailsPorMatriculas: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tombo: {
      findMany: vi.fn(),
    },
    itemMovimentacao: {
      findMany: vi.fn(),
    },
    movimentacao: {
      create: vi.fn(),
    },
    usuario: {
      findMany: vi.fn(),
    },
  },
}));

describe("criarMovimentacao", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuthAction).mockResolvedValue({
      user: {
        id: "tec-1",
        matricula: "AP10001",
        nome: "Tecnico TI",
        perfil: "TECNICO_TI",
      },
      error: null,
    });
  });

  it("deve bloquear quando algum tombo já possui movimentação em andamento", async () => {
    vi.mocked(prisma.tombo.findMany).mockResolvedValue([
      {
        id: "t1",
        numero: "1001",
        unidadeId: "u-origem",
      },
    ] as Awaited<ReturnType<typeof prisma.tombo.findMany>>);

    vi.mocked(prisma.itemMovimentacao.findMany).mockResolvedValue([
      {
        tomboId: "t1",
        tombo: { numero: "1001" },
      },
    ] as Awaited<ReturnType<typeof prisma.itemMovimentacao.findMany>>);

    const result = await criarMovimentacao({
      tomboIds: ["t1"],
      unidadeDestinoId: "u-destino",
      setorDestinoId: "s-destino",
    });

    expect(result).toEqual({
      success: false,
      error: "Tombo 1001 já possui movimentação em andamento.",
    });
    expect(prisma.movimentacao.create).not.toHaveBeenCalled();
  });

  it("deve criar movimentação, registrar auditoria e notificações no fluxo feliz", async () => {
    vi.mocked(prisma.tombo.findMany).mockResolvedValue([
      {
        id: "t1",
        numero: "1001",
        descricaoMaterial: "Notebook",
        unidadeId: "u-origem",
      },
    ] as Awaited<ReturnType<typeof prisma.tombo.findMany>>);

    vi.mocked(prisma.itemMovimentacao.findMany).mockResolvedValue(
      [] as Awaited<ReturnType<typeof prisma.itemMovimentacao.findMany>>,
    );

    vi.mocked(prisma.movimentacao.create).mockResolvedValue({
      id: "mov-1",
      tokenConfirmacao: "token-1",
      unidadeOrigem: { descricao: "Origem" },
      unidadeDestino: { descricao: "Destino" },
      itens: [{ tombo: { numero: "1001", descricaoMaterial: "Notebook" } }],
    } as Awaited<ReturnType<typeof prisma.movimentacao.create>>);

    vi.mocked(prisma.usuario.findMany).mockResolvedValue([
      { matricula: "AP20001" },
    ] as Awaited<ReturnType<typeof prisma.usuario.findMany>>);

    vi.mocked(buscarEmailsPorMatriculas).mockResolvedValue(
      new Map([["AP20001", "destino@jfap.jus.br"]]),
    );

    vi.mocked(buscarUsuarioIdsPorMatriculas).mockResolvedValue(["user-destino"]);

    const result = await criarMovimentacao({
      tomboIds: ["t1"],
      unidadeDestinoId: "u-destino",
      setorDestinoId: "s-destino",
    });

    expect(result).toEqual({ success: true, movimentacaoId: "mov-1" });
    expect(prisma.movimentacao.create).toHaveBeenCalledTimes(1);
    expect(registrarAuditoria).toHaveBeenCalledTimes(1);
    expect(criarNotificacoes).toHaveBeenCalledTimes(1);
  });
});
