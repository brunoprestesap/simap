"use server";

import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/server/services/audit";

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

  await prisma.movimentacao.update({
    where: { id: movimentacao.id },
    data: {
      status: "CONFIRMADA_ORIGEM",
      confirmadoEm: new Date(),
      confirmadoPorNome: nomConfirmador,
    },
  });

  // Audit log
  await registrarAuditoria(
    "CONFIRMACAO_MOVIMENTACAO",
    "Movimentacao",
    movimentacao.id,
    null,
    {
      confirmadoPorNome: nomConfirmador,
      token,
    },
  );

  // Notify technician
  await prisma.notificacao.create({
    data: {
      tipo: "CONFIRMACAO_REALIZADA",
      titulo: "Confirmação realizada",
      mensagem: `${nomConfirmador} confirmou a saída dos tombos da movimentação.`,
      link: `/movimentacao/${movimentacao.id}`,
      usuarioDestinoId: movimentacao.tecnicoId,
    },
  });

  return { success: true };
}
