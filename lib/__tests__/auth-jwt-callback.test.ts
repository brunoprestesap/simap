import { describe, expect, it, vi } from "vitest";
import type { JWT } from "@auth/core/jwt";
import {
  JWT_REVALIDATE_MS,
  revalidateJwtToken,
  type UsuarioRevalidacao,
} from "@/lib/auth-jwt-callback";

function emptyToken(overrides: Partial<JWT> = {}): JWT {
  return {
    id: "",
    matricula: "",
    nome: "",
    perfil: "",
    ...overrides,
  } as JWT;
}

const usuarioAtivo: UsuarioRevalidacao = {
  ativo: true,
  perfil: "TECNICO_TI",
  nome: "Ana TI",
};

describe("revalidateJwtToken", () => {
  it("popula o token a partir do user no signIn (sem consultar DB)", async () => {
    const revalidate = vi.fn();
    const r = await revalidateJwtToken({
      token: emptyToken(),
      user: {
        id: "u1",
        matricula: "AP1",
        nome: "Ana",
        perfil: "TECNICO_TI",
      } as unknown as Parameters<typeof revalidateJwtToken>[0]["user"],
      trigger: "signIn",
      revalidate,
      now: 1_000,
    });

    expect(r).not.toBeNull();
    expect(r!.id).toBe("u1");
    expect(r!.matricula).toBe("AP1");
    expect(r!.lastValidatedAt).toBe(1_000);
    expect(revalidate).not.toHaveBeenCalled();
  });

  it("não consulta DB enquanto a janela de cache (5min) não expirar", async () => {
    const revalidate = vi.fn();
    const last = 1_000;
    const r = await revalidateJwtToken({
      token: emptyToken({ id: "u1", lastValidatedAt: last } as Partial<JWT>),
      user: undefined,
      trigger: undefined,
      revalidate,
      now: last + JWT_REVALIDATE_MS - 1,
    });

    expect(r).not.toBeNull();
    expect(revalidate).not.toHaveBeenCalled();
  });

  it("revalida no DB quando passou o TTL e atualiza nome/perfil/lastValidatedAt", async () => {
    const revalidate = vi.fn().mockResolvedValue({
      ativo: true,
      perfil: "GESTOR_ADMIN",
      nome: "Ana Promovida",
    } as UsuarioRevalidacao);

    const last = 1_000;
    const now = last + JWT_REVALIDATE_MS + 1;
    const r = await revalidateJwtToken({
      token: emptyToken({
        id: "u1",
        matricula: "AP1",
        nome: "Ana TI",
        perfil: "TECNICO_TI",
        lastValidatedAt: last,
      } as Partial<JWT>),
      user: undefined,
      trigger: undefined,
      revalidate,
      now,
    });

    expect(revalidate).toHaveBeenCalledWith("u1");
    expect(r).not.toBeNull();
    expect(r!.nome).toBe("Ana Promovida");
    expect(r!.perfil).toBe("GESTOR_ADMIN");
    expect(r!.lastValidatedAt).toBe(now);
  });

  it("força revalidação quando trigger='update' mesmo dentro do TTL", async () => {
    const revalidate = vi.fn().mockResolvedValue(usuarioAtivo);

    const r = await revalidateJwtToken({
      token: emptyToken({ id: "u1", lastValidatedAt: 1_000 } as Partial<JWT>),
      user: undefined,
      trigger: "update",
      revalidate,
      now: 1_001,
    });

    expect(revalidate).toHaveBeenCalledTimes(1);
    expect(r).not.toBeNull();
  });

  it("invalida sessão (retorna null) quando o usuário não existe mais", async () => {
    const revalidate = vi.fn().mockResolvedValue(null);
    const onInvalidate = vi.fn();

    const r = await revalidateJwtToken({
      token: emptyToken({
        id: "u1",
        matricula: "AP-removido",
      } as Partial<JWT>),
      user: undefined,
      trigger: undefined,
      revalidate,
      now: JWT_REVALIDATE_MS + 1,
      onInvalidate,
    });

    expect(r).toBeNull();
    expect(onInvalidate).toHaveBeenCalledWith("AP-removido");
  });

  it("invalida sessão quando o usuário foi desativado", async () => {
    const revalidate = vi.fn().mockResolvedValue({
      ativo: false,
      perfil: "TECNICO_TI",
      nome: "Ana",
    } as UsuarioRevalidacao);

    const r = await revalidateJwtToken({
      token: emptyToken({ id: "u1", matricula: "AP1" } as Partial<JWT>),
      user: undefined,
      trigger: undefined,
      revalidate,
      now: JWT_REVALIDATE_MS + 1,
    });

    expect(r).toBeNull();
  });
});
