import { beforeEach, describe, expect, it, vi } from "vitest";
import { registrarNoSicam } from "@/server/actions/registro-sicam";
import { requireRoleAction } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/server/services/audit";

vi.mock("@/lib/auth-guard", () => ({
  requireRoleAction: vi.fn(),
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
    usuario: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    tombo: {
      updateMany: vi.fn(),
    },
    notificacao: {
      create: vi.fn(),
    },
  },
}));

describe("registrarNoSicam", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(prisma.movimentacao.update).not.toHaveBeenCalled();
  });

  it("deve registrar no SICAM e atualizar tombos no fluxo feliz", async () => {
    vi.mocked(prisma.movimentacao.findUnique).mockResolvedValue({
      id: "mov-2",
      status: "CONFIRMADA_ORIGEM",
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
    } as Awaited<ReturnType<typeof prisma.movimentacao.findUnique>>);

    vi.mocked(prisma.usuario.findFirst).mockResolvedValue({
      id: "novo-resp",
      matricula: "AP20002",
      nome: "Novo Resp",
    } as Awaited<ReturnType<typeof prisma.usuario.findFirst>>);

    vi.mocked(prisma.usuario.findMany).mockResolvedValue([
      { id: "resp-antigo" },
    ] as Awaited<ReturnType<typeof prisma.usuario.findMany>>);

    vi.mocked(prisma.movimentacao.update).mockResolvedValue({
      id: "mov-2",
    } as Awaited<ReturnType<typeof prisma.movimentacao.update>>);

    vi.mocked(prisma.tombo.updateMany).mockResolvedValue({
      count: 1,
    } as Awaited<ReturnType<typeof prisma.tombo.updateMany>>);

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
    expect(prisma.movimentacao.update).toHaveBeenCalledTimes(1);
    expect(prisma.tombo.updateMany).toHaveBeenCalledTimes(1);
    expect(registrarAuditoria).toHaveBeenCalledTimes(1);
    expect(prisma.notificacao.create).toHaveBeenCalled();
  });
});
