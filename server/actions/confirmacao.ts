"use server";

import { requireAuthAction } from "@/lib/auth-guard";
import { avaliarPermissaoConfirmacaoMovimentacao } from "@/lib/permissions/movimentacao-confirmacao";
import { prisma } from "@/lib/prisma";

interface ConcluirConfirmacaoArgs {
  movimentacaoId: string;
  tecnicoId: string;
  confirmadoPorNome: string;
  auditoriaDetalhes: Record<string, string>;
  auditoriaUsuarioId: string | null;
}

// Confirmação atômica: o updateMany com guarda no WHERE garante que duas requisições
// concorrentes (duplo-clique no link público, retries de cliente) não consigam confirmar
// duas vezes — a segunda recebe count === 0 e é descartada antes de gerar auditoria/notificação.
async function concluirConfirmacao({
  movimentacaoId,
  tecnicoId,
  confirmadoPorNome,
  auditoriaDetalhes,
  auditoriaUsuarioId,
}: ConcluirConfirmacaoArgs): Promise<{ success: boolean; error?: string }> {
  const confirmou = await prisma.$transaction(async (tx) => {
    const r = await tx.movimentacao.updateMany({
      where: {
        id: movimentacaoId,
        status: "PENDENTE_CONFIRMACAO",
        tokenExpiraEm: { gt: new Date() },
      },
      data: {
        status: "CONFIRMADA_ORIGEM",
        confirmadoEm: new Date(),
        confirmadoPorNome,
      },
    });
    if (r.count === 0) return false;

    await tx.auditLog.create({
      data: {
        acao: "CONFIRMACAO_MOVIMENTACAO",
        entidade: "Movimentacao",
        entidadeId: movimentacaoId,
        usuarioId: auditoriaUsuarioId,
        detalhes: auditoriaDetalhes,
      },
    });

    return true;
  });

  if (!confirmou) {
    // SELECT só no caminho de erro para diferenciar "já confirmada" de "link expirou".
    // Mantém a UX original sem comprometer a atomicidade do happy path.
    const atual = await prisma.movimentacao.findUnique({
      where: { id: movimentacaoId },
      select: { status: true, tokenExpiraEm: true },
    });
    if (!atual) {
      return { success: false, error: "Movimentação não encontrada." };
    }
    if (atual.status !== "PENDENTE_CONFIRMACAO") {
      return { success: false, error: "Esta movimentação já foi confirmada." };
    }
    return { success: false, error: "Este link expirou." };
  }

  // Notificação fora da transação: fire-and-forget, não bloqueia resposta.
  prisma.notificacao
    .create({
      data: {
        tipo: "CONFIRMACAO_REALIZADA",
        titulo: "Confirmação realizada",
        mensagem: `${confirmadoPorNome} confirmou a entrada dos tombos da movimentação.`,
        link: `/movimentacao/${movimentacaoId}`,
        usuarioDestinoId: tecnicoId,
      },
    })
    .catch(() => {
      // Já confirmado no banco; falha de notificação não desfaz a confirmação.
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
    select: { id: true, tecnicoId: true },
  });

  if (!movimentacao) {
    return { success: false, error: "Token inválido." };
  }

  return concluirConfirmacao({
    movimentacaoId: movimentacao.id,
    tecnicoId: movimentacao.tecnicoId,
    confirmadoPorNome: nomConfirmador,
    auditoriaDetalhes: { confirmadoPorNome: nomConfirmador, token },
    auditoriaUsuarioId: null,
  });
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

  return concluirConfirmacao({
    movimentacaoId: movimentacao.id,
    tecnicoId: movimentacao.tecnicoId,
    confirmadoPorNome: user!.nome,
    auditoriaDetalhes: { confirmadoPorNome: user!.nome, canal: "UI_LOGADA" },
    auditoriaUsuarioId: user!.id,
  });
}
