import { beforeEach, describe, expect, it, vi } from "vitest";
import { registrarNoSicam } from "@/server/actions/registro-sicam";
import { requireRoleAction } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/auth-guard", () => ({
  requireRoleAction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => {
  const movimentacao = {
    findUnique: vi.fn(),
    updateMany: vi.fn(),
  };
  const usuario = {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  };
  const tombo = { updateMany: vi.fn() };
  const auditLog = { create: vi.fn() };
  const notificacao = { create: vi.fn() };
  return {
    prisma: {
      movimentacao,
      usuario,
      tombo,
      auditLog,
      notificacao,
      $transaction: vi.fn(),
    },
  };
});

type Tx = {
  movimentacao: { updateMany: ReturnType<typeof vi.fn> };
  tombo: { updateMany: ReturnType<typeof vi.fn> };
  auditLog: { create: ReturnType<typeof vi.fn> };
};

function mockTransactionAsTx() {
  vi.mocked(prisma.$transaction).mockImplementation(
    (async (cb: (tx: Tx) => Promise<unknown>) =>
      cb({
        movimentacao: prisma.movimentacao,
        tombo: prisma.tombo,
        auditLog: prisma.auditLog,
      } as unknown as Tx)) as unknown as typeof prisma.$transaction,
  );
}

const movimentacaoConfirmada = {
  id: "mov-2",
  status: "CONFIRMADA_ORIGEM" as const,
  unidadeDestinoId: "u-destino",
  setorDestinoId: null,
  tecnicoId: "tec-1",
  unidadeOrigem: { descricao: "Origem" },
  unidadeDestino: { id: "u-destino", descricao: "Destino" },
  tecnico: { id: "tec-1", nome: "Tecnico" },
  itens: [
    {
      tomboId: "t1",
      tombo: {
        id: "t1",
        numero: "1001",
        usuarioResponsavel: { id: "r1", nome: "Resp", matricula: "AP20001" },
        matriculaResponsavel: "AP20001",
        nomeResponsavel: "Resp",
      },
    },
  ],
};

describe("registrarNoSicam", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransactionAsTx();
    vi.mocked(requireRoleAction).mockResolvedValue({
      user: {
        id: "semap-1",
        matricula: "AP30001",
        nome: "Servidor SEMAP",
        perfil: "SERVIDOR_SEMAP",
      },
      error: null,
    });
  });

  it("deve rejeitar movimentação fora do status confirmado", async () => {
    vi.mocked(prisma.movimentacao.findUnique).mockResolvedValue({
      id: "mov-1",
      status: "PENDENTE_CONFIRMACAO",
    } as Awaited<ReturnType<typeof prisma.movimentacao.findUnique>>);

    const result = await registrarNoSicam({
      movimentacaoId: "mov-1",
      protocoloSicam: "PROC-100",
      dataRegistroSicam: "2026-04-27",
    });

    expect(result).toEqual({
      success: false,
      error: "Somente movimentações confirmadas podem ser registradas no SICAM.",
    });
    expect(prisma.movimentacao.updateMany).not.toHaveBeenCalled();
    expect(prisma.tombo.updateMany).not.toHaveBeenCalled();
  });

  it("deve registrar no SICAM e atualizar tombos no fluxo feliz", async () => {
    vi.mocked(prisma.movimentacao.findUnique).mockResolvedValue(
      movimentacaoConfirmada as unknown as Awaited<
        ReturnType<typeof prisma.movimentacao.findUnique>
      >,
    );
    vi.mocked(prisma.usuario.findFirst).mockResolvedValue({
      id: "novo-resp",
      matricula: "AP20002",
      nome: "Novo Resp",
    } as Awaited<ReturnType<typeof prisma.usuario.findFirst>>);
    vi.mocked(prisma.usuario.findMany).mockResolvedValue([
      { id: "resp-antigo" },
    ] as Awaited<ReturnType<typeof prisma.usuario.findMany>>);
    vi.mocked(prisma.movimentacao.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.tombo.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.notificacao.create).mockResolvedValue({
      id: "notif-1",
    } as Awaited<ReturnType<typeof prisma.notificacao.create>>);

    const result = await registrarNoSicam({
      movimentacaoId: "mov-2",
      protocoloSicam: "PROC-200",
      dataRegistroSicam: "2026-04-27",
      observacoesSicam: "Registro concluído",
    });

    expect(result).toEqual({ success: true });
    expect(prisma.movimentacao.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.tombo.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
    expect(prisma.notificacao.create).toHaveBeenCalled();
  });

  it("deve abortar com erro quando outra requisição já saiu de CONFIRMADA_ORIGEM (race no SICAM)", async () => {
    vi.mocked(prisma.movimentacao.findUnique).mockResolvedValue(
      movimentacaoConfirmada as unknown as Awaited<
        ReturnType<typeof prisma.movimentacao.findUnique>
      >,
    );
    vi.mocked(prisma.usuario.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.usuario.findMany).mockResolvedValue([]);
    // Guarda no WHERE: outro registro paralelo já mudou status para REGISTRADA_SICAM.
    vi.mocked(prisma.movimentacao.updateMany).mockResolvedValue({ count: 0 });

    const result = await registrarNoSicam({
      movimentacaoId: "mov-2",
      protocoloSicam: "PROC-200",
      dataRegistroSicam: "2026-04-27",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/CONFIRMADA_ORIGEM|outro usuário/i);
    expect(prisma.tombo.updateMany).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
    expect(prisma.notificacao.create).not.toHaveBeenCalled();
  });

  it("deve reverter movimentação quando tombo.updateMany falha (atomicidade da $transaction)", async () => {
    vi.mocked(prisma.movimentacao.findUnique).mockResolvedValue(
      movimentacaoConfirmada as unknown as Awaited<
        ReturnType<typeof prisma.movimentacao.findUnique>
      >,
    );
    vi.mocked(prisma.usuario.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.usuario.findMany).mockResolvedValue([]);
    vi.mocked(prisma.movimentacao.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.tombo.updateMany).mockRejectedValue(
      new Error("connection lost"),
    );

    await expect(
      registrarNoSicam({
        movimentacaoId: "mov-2",
        protocoloSicam: "PROC-200",
        dataRegistroSicam: "2026-04-27",
      }),
    ).rejects.toThrow(/connection lost/);

    // Em produção o Postgres faria rollback do update da movimentacao.
    // Aqui validamos contratualmente que auditoria/notificação NÃO foram feitas
    // — porque o erro ocorreu no meio da $transaction, antes de prosseguir.
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
    expect(prisma.notificacao.create).not.toHaveBeenCalled();
  });
});
