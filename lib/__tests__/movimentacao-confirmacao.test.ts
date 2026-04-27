import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  avaliarPermissaoConfirmacaoMovimentacao,
  atendeCriterioCompostoConfirmacao,
  estaPendenteEValidaParaConfirmacao,
} from "@/lib/permissions/movimentacao-confirmacao";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    usuario: {
      findFirst: vi.fn(),
    },
  },
}));

describe("movimentacao-confirmacao", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("atendeCriterioCompostoConfirmacao", () => {
    it("deve autorizar por perfil de servidor responsavel", () => {
      expect(
        atendeCriterioCompostoConfirmacao("SERVIDOR_RESPONSAVEL", false),
      ).toBe(true);
    });

    it("deve autorizar por flag responsavelUnidade mesmo sem perfil de responsavel", () => {
      expect(atendeCriterioCompostoConfirmacao("TECNICO_TI", true)).toBe(true);
    });

    it("deve negar quando nao atende perfil nem flag", () => {
      expect(atendeCriterioCompostoConfirmacao("TECNICO_TI", false)).toBe(false);
    });
  });

  describe("estaPendenteEValidaParaConfirmacao", () => {
    it("deve autorizar quando status pendente e token valido", () => {
      const tokenFuturo = new Date(Date.now() + 60_000);
      expect(
        estaPendenteEValidaParaConfirmacao("PENDENTE_CONFIRMACAO", tokenFuturo),
      ).toBe(true);
    });

    it("deve negar quando status nao esta pendente", () => {
      const tokenFuturo = new Date(Date.now() + 60_000);
      expect(
        estaPendenteEValidaParaConfirmacao("CONFIRMADA_ORIGEM", tokenFuturo),
      ).toBe(false);
    });

    it("deve negar quando token expirou", () => {
      const tokenPassado = new Date(Date.now() - 60_000);
      expect(
        estaPendenteEValidaParaConfirmacao("PENDENTE_CONFIRMACAO", tokenPassado),
      ).toBe(false);
    });
  });

  describe("avaliarPermissaoConfirmacaoMovimentacao", () => {
    it("deve negar quando status não está pendente", async () => {
      const result = await avaliarPermissaoConfirmacaoMovimentacao({
        status: "CONFIRMADA_ORIGEM",
        tokenExpiraEm: new Date(Date.now() + 60_000),
        unidadeDestinoId: "unidade-1",
        usuario: {
          matricula: "AP20153",
          perfil: "SERVIDOR_RESPONSAVEL",
        },
      });

      expect(result).toEqual({
        podeConfirmar: false,
        motivo: "STATUS_INVALIDO",
      });
    });

    it("deve negar quando não existe vínculo com unidade de destino", async () => {
      vi.mocked(prisma.usuario.findFirst).mockResolvedValueOnce(null);

      const result = await avaliarPermissaoConfirmacaoMovimentacao({
        status: "PENDENTE_CONFIRMACAO",
        tokenExpiraEm: new Date(Date.now() + 60_000),
        unidadeDestinoId: "unidade-1",
        usuario: {
          matricula: "AP20159",
          perfil: "GESTOR_ADMIN",
        },
      });

      expect(result).toEqual({
        podeConfirmar: false,
        motivo: "SEM_VINCULO_UNIDADE_DESTINO",
      });
    });

    it("deve autorizar por flag responsavelUnidade", async () => {
      vi.mocked(prisma.usuario.findFirst).mockResolvedValueOnce({
        responsavelUnidade: true,
      } as Awaited<ReturnType<typeof prisma.usuario.findFirst>>);

      const result = await avaliarPermissaoConfirmacaoMovimentacao({
        status: "PENDENTE_CONFIRMACAO",
        tokenExpiraEm: new Date(Date.now() + 60_000),
        unidadeDestinoId: "unidade-1",
        usuario: {
          matricula: "AP20151",
          perfil: "TECNICO_TI",
        },
      });

      expect(result).toEqual({
        podeConfirmar: true,
        motivo: "OK",
      });
    });
  });
});
