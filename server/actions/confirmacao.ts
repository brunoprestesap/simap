"use server";

import { requireAuthAction } from "@/lib/auth-guard";
import { avaliarPermissaoConfirmacaoMovimentacao } from "@/lib/permissions/movimentacao-confirmacao";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/server/services/audit";

async function concluirConfirmacao(
  movimentacaoId: string,
  tecnicoId: string,
  confirmadoPorNome: string,
  auditoriaDetalhes: Record<string, string>,
  auditoriaUsuarioId: string | null,
): Promise<{ success: boolean; error?: string }> {
  await prisma.movimentacao.update({
    where: { id: movimentacaoId },
    data: {
      status: "CONFIRMADA_ORIGEM",
      confirmadoEm: new Date(),
      confirmadoPorNome,
    },
  });

  await registrarAuditoria(
    "CONFIRMACAO_MOVIMENTACAO",
    "Movimentacao",
    movimentacaoId,
    auditoriaUsuarioId,
    auditoriaDetalhes,
  );

  await prisma.notificacao.create({
    data: {
      tipo: "CONFIRMACAO_REALIZADA",
      titulo: "Confirmação realizada",
      mensagem: `${confirmadoPorNome} confirmou a entrada dos tombos da movimentação.`,
      link: `/movimentacao/${movimentacaoId}`,
      usuarioDestinoId: tecnicoId,
    },
  });

  return { success: true };
}

export async function confirmarMovimentacaoPublica(
  token: string,
  nomConfirmador: string,
): Promise<{
  success: boolean;
  error?: string;
}> {
  const movimentacao = await prisma.movimentacao.findUnique({
    where: { tokenConfirmacao: token },
  });

  if (!movimentacao) {
    return { success: false, error: "Token inválido." };
  }

  if (movimentacao.status !== "PENDENTE_CONFIRMACAO") {
    return { success: false, error: "Esta movimentação já foi confirmada." };
  }

  if (new Date() > movimentacao.tokenExpiraEm) {
    return { success: false, error: "Este link expirou." };
  }

  return concluirConfirmacao(
    movimentacao.id,
    movimentacao.tecnicoId,
    nomConfirmador,
    { confirmadoPorNome: nomConfirmador, token },
    null,
  );
}

export async function confirmarMovimentacaoLogada(
  movimentacaoId: string,
): Promise<{
  success: boolean;
  error?: string;
}> {
  const { user, error: authError } = await requireAuthAction();
  if (authError) return { success: false, error: authError };

  const movimentacao = await prisma.movimentacao.findUnique({
    where: { id: movimentacaoId },
  });
  if (!movimentacao) {
    return { success: false, error: "Movimentação não encontrada." };
  }
  const permissao = await avaliarPermissaoConfirmacaoMovimentacao({
    status: movimentacao.status,
    tokenExpiraEm: movimentacao.tokenExpiraEm,
    unidadeDestinoId: movimentacao.unidadeDestinoId,
    usuario: {
      matricula: user!.matricula,
      perfil: user!.perfil,
    },
  });
  if (!permissao.podeConfirmar) {
    if (permissao.motivo === "STATUS_INVALIDO") {
      return { success: false, error: "Esta movimentação já foi confirmada." };
    }
    if (permissao.motivo === "TOKEN_EXPIRADO") {
      return { success: false, error: "Prazo de confirmação expirado." };
    }
    return {
      success: false,
      error: "Somente usuários autorizados da unidade de destino podem confirmar.",
    };
  }

  return concluirConfirmacao(
    movimentacao.id,
    movimentacao.tecnicoId,
    user!.nome,
    { confirmadoPorNome: user!.nome, canal: "UI_LOGADA" },
    user!.id,
  );
}
