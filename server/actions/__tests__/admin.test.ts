import { beforeEach, describe, expect, it, vi } from "vitest";
import { criarUnidade, editarUsuarioLotacao } from "@/server/actions/admin";
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
    unidade: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    setor: {
      findFirst: vi.fn(),
    },
    usuario: {
      update: vi.fn(),
    },
  },
}));

describe("admin actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireRoleAction).mockResolvedValue({
      user: {
        id: "admin-1",
        matricula: "AP50001",
        nome: "Admin",
        perfil: "GESTOR_ADMIN",
      },
      error: null,
    });
  });

  it("criarUnidade deve bloquear código duplicado (case-insensitive)", async () => {
    vi.mocked(prisma.unidade.findFirst).mockResolvedValueOnce({
      id: "u-existente",
    } as Awaited<ReturnType<typeof prisma.unidade.findFirst>>);

    const result = await criarUnidade({
      codigo: " sec01 ",
      descricao: " Secretaria 01 ",
    });

    expect(result).toEqual({
      success: false,
      error: "Código de unidade já existe.",
    });
    expect(prisma.unidade.create).not.toHaveBeenCalled();
  });

  it("editarUsuarioLotacao deve rejeitar setor fora da unidade", async () => {
    vi.mocked(prisma.setor.findFirst).mockResolvedValue(
      null as Awaited<ReturnType<typeof prisma.setor.findFirst>>,
    );

    const result = await editarUsuarioLotacao("user-1", {
      nome: "Servidor X",
      email: "x@jfap.jus.br",
      unidadeId: "u1",
      responsavelUnidade: false,
      setorId: "setor-invalido",
    });

    expect(result).toEqual({
      success: false,
      error: "O setor não pertence à unidade selecionada.",
    });
    expect(prisma.usuario.update).not.toHaveBeenCalled();
  });

  it("editarUsuarioLotacao deve atualizar e auditar no fluxo feliz", async () => {
    vi.mocked(prisma.setor.findFirst).mockResolvedValue({
      id: "s1",
    } as Awaited<ReturnType<typeof prisma.setor.findFirst>>);

    vi.mocked(prisma.usuario.update).mockResolvedValue({
      id: "user-1",
    } as Awaited<ReturnType<typeof prisma.usuario.update>>);

    const result = await editarUsuarioLotacao("user-1", {
      nome: "Servidor Y",
      email: "y@jfap.jus.br",
      unidadeId: "u1",
      responsavelUnidade: false,
      setorId: "s1",
    });

    expect(result).toEqual({ success: true });
    expect(prisma.usuario.update).toHaveBeenCalledTimes(1);
    expect(registrarAuditoria).toHaveBeenCalledTimes(1);
  });
});
