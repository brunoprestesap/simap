import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  confirmarMovimentacaoLogada,
  confirmarMovimentacaoPublica,
} from "@/server/actions/confirmacao";
import { requireAuthAction } from "@/lib/auth-guard";
import { avaliarPermissaoConfirmacaoMovimentacao } from "@/lib/permissions/movimentacao-confirmacao";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/auth-guard", () => ({
  requireAuthAction: vi.fn(),
}));

vi.mock("@/lib/permissions/movimentacao-confirmacao", () => ({
  avaliarPermissaoConfirmacaoMovimentacao: vi.fn(),
}));

vi.mock("@/lib/prisma", () => {
  const movimentacao = {
    findUnique: vi.fn(),
    updateMany: vi.fn(),
  };
  const auditLog = { create: vi.fn() };
  const notificacao = { create: vi.fn() };
  return {
    prisma: {
      movimentacao,
      auditLog,
      notificacao,
      $transaction: vi.fn(),
    },
  };
});

type Tx = {
  movimentacao: { updateMany: ReturnType<typeof vi.fn> };
  auditLog: { create: ReturnType<typeof vi.fn> };
};

function mockTransactionAsTx() {
  // Espelha a API que o action usa: prisma.$transaction(async tx => {...}).
  // Passa um "tx" que delega aos mocks de prisma.movimentacao / prisma.auditLog.
  vi.mocked(prisma.$transaction).mockImplementation(
    (async (cb: (tx: Tx) => Promise<unknown>) =>
      cb({
        movimentacao: prisma.movimentacao,
        auditLog: prisma.auditLog,
      } as unknown as Tx)) as unknown as typeof prisma.$transaction,
  );
}

describe("confirmarMovimentacaoLogada", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransactionAsTx();
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
    expect(prisma.movimentacao.updateMany).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
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
    vi.mocked(prisma.movimentacao.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.notificacao.create).mockResolvedValue({
      id: "not-1",
    } as Awaited<ReturnType<typeof prisma.notificacao.create>>);

    const result = await confirmarMovimentacaoLogada("mov-2");

    expect(result).toEqual({ success: true });
    expect(prisma.movimentacao.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
  });
});

describe("confirmarMovimentacaoPublica — atomicidade contra duplo-clique", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransactionAsTx();
  });

  it("deve confirmar UMA única vez quando o link é clicado em rajada (race TOCTOU)", async () => {
    // 1ª lookup do token — resolve a movimentação. 2ª lookup pós-falha — para distinguir
    // a mensagem entre "já confirmada" e "expirou".
    vi.mocked(prisma.movimentacao.findUnique).mockImplementation(
      (async (args: { where: { tokenConfirmacao?: string; id?: string } }) => {
        if (args.where.tokenConfirmacao) {
          return { id: "mov-race", tecnicoId: "tec-99" } as Awaited<
            ReturnType<typeof prisma.movimentacao.findUnique>
          >;
        }
        return {
          status: "CONFIRMADA_ORIGEM",
          tokenExpiraEm: new Date(Date.now() + 60_000),
        } as Awaited<ReturnType<typeof prisma.movimentacao.findUnique>>;
      }) as unknown as typeof prisma.movimentacao.findUnique,
    );

    // Simula o cenário: a 1ª chamada do updateMany consegue (count: 1, status muda no DB);
    // a 2ª chamada não encontra mais nada com `status = PENDENTE_CONFIRMACAO` (count: 0).
    vi.mocked(prisma.movimentacao.updateMany)
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    vi.mocked(prisma.notificacao.create).mockResolvedValue({
      id: "not-1",
    } as Awaited<ReturnType<typeof prisma.notificacao.create>>);

    const [r1, r2] = await Promise.all([
      confirmarMovimentacaoPublica("token-x", "Maria"),
      confirmarMovimentacaoPublica("token-x", "Maria"),
    ]);

    const successes = [r1, r2].filter((r) => r.success).length;
    const failures = [r1, r2].filter((r) => !r.success);

    expect(successes).toBe(1);
    expect(failures).toHaveLength(1);
    expect(failures[0].error).toBe("Esta movimentação já foi confirmada.");
    expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it("retorna 'link expirou' (e não 'já confirmada') quando token está expirado", async () => {
    vi.mocked(prisma.movimentacao.findUnique).mockImplementation(
      (async (args: { where: { tokenConfirmacao?: string; id?: string } }) => {
        if (args.where.tokenConfirmacao) {
          return { id: "mov-exp", tecnicoId: "tec-1" } as Awaited<
            ReturnType<typeof prisma.movimentacao.findUnique>
          >;
        }
        // Status ainda é PENDENTE_CONFIRMACAO; a guarda no updateMany rejeitou só pelo prazo.
        return {
          status: "PENDENTE_CONFIRMACAO",
          tokenExpiraEm: new Date(Date.now() - 60_000),
        } as Awaited<ReturnType<typeof prisma.movimentacao.findUnique>>;
      }) as unknown as typeof prisma.movimentacao.findUnique,
    );

    vi.mocked(prisma.movimentacao.updateMany).mockResolvedValue({ count: 0 });

    const r = await confirmarMovimentacaoPublica("token-exp", "Maria");

    expect(r).toEqual({ success: false, error: "Este link expirou." });
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
    expect(prisma.notificacao.create).not.toHaveBeenCalled();
  });

  it("deve retornar erro quando token é inválido (movimentação não existe)", async () => {
    vi.mocked(prisma.movimentacao.findUnique).mockResolvedValue(null);

    const r = await confirmarMovimentacaoPublica("token-fake", "Maria");

    expect(r).toEqual({ success: false, error: "Token inválido." });
    expect(prisma.movimentacao.updateMany).not.toHaveBeenCalled();
  });
});
