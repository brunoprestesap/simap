import { beforeEach, describe, expect, it, vi } from "vitest";
import { confirmarMovimentacaoLogada } from "@/server/actions/confirmacao";
import { requireAuthAction } from "@/lib/auth-guard";
import { avaliarPermissaoConfirmacaoMovimentacao } from "@/lib/permissions/movimentacao-confirmacao";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/auth-guard", () => ({
  requireAuthAction: vi.fn(),
}));

vi.mock("@/lib/permissions/movimentacao-confirmacao", () => ({
  avaliarPermissaoConfirmacaoMovimentacao: vi.fn(),
}));

vi.mock("@/server/services/audit", () => ({
  registrarAuditoria: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    movimentacao: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    notificacao: {
      create: vi.fn(),
    },
  },
}));

describe("confirmarMovimentacaoLogada", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve retornar erro de permissão quando usuário não é autorizado", async () => {
    vi.mocked(requireAuthAction).mockResolvedValue({
      user: {
        id: "u1",
        matricula: "AP20159",
        nome: "Usuário Gestor",
        perfil: "GESTOR_ADMIN",
      },
      error: null,
    });
    vi.mocked(prisma.movimentacao.findUnique).mockResolvedValue({
      id: "mov-1",
      status: "PENDENTE_CONFIRMACAO",
      tokenExpiraEm: new Date(Date.now() + 60_000),
      unidadeDestinoId: "unid-1",
      tecnicoId: "tec-1",
    } as Awaited<ReturnType<typeof prisma.movimentacao.findUnique>>);
    vi.mocked(avaliarPermissaoConfirmacaoMovimentacao).mockResolvedValue({
      podeConfirmar: false,
      motivo: "SEM_PERMISSAO",
    });

    const result = await confirmarMovimentacaoLogada("mov-1");

    expect(result).toEqual({
      success: false,
      error: "Somente usuários autorizados da unidade de destino podem confirmar.",
    });
  });

  it("deve confirmar movimentação quando usuário é autorizado", async () => {
    vi.mocked(requireAuthAction).mockResolvedValue({
      user: {
        id: "u2",
        matricula: "AP20153",
        nome: "Roberto Oliveira",
        perfil: "SERVIDOR_RESPONSAVEL",
      },
      error: null,
    });
    vi.mocked(prisma.movimentacao.findUnique).mockResolvedValue({
      id: "mov-2",
      status: "PENDENTE_CONFIRMACAO",
      tokenExpiraEm: new Date(Date.now() + 60_000),
      unidadeDestinoId: "unid-2",
      tecnicoId: "tec-2",
    } as Awaited<ReturnType<typeof prisma.movimentacao.findUnique>>);
    vi.mocked(avaliarPermissaoConfirmacaoMovimentacao).mockResolvedValue({
      podeConfirmar: true,
      motivo: "OK",
    });
    vi.mocked(prisma.movimentacao.update).mockResolvedValue({
      id: "mov-2",
    } as Awaited<ReturnType<typeof prisma.movimentacao.update>>);
    vi.mocked(prisma.notificacao.create).mockResolvedValue({
      id: "not-1",
    } as Awaited<ReturnType<typeof prisma.notificacao.create>>);

    const result = await confirmarMovimentacaoLogada("mov-2");

    expect(result).toEqual({ success: true });
    expect(prisma.movimentacao.update).toHaveBeenCalledTimes(1);
    expect(prisma.notificacao.create).toHaveBeenCalledTimes(1);
  });
});
