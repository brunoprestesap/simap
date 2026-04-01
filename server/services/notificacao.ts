"use server";

import { prisma } from "@/lib/prisma";
import type { TipoNotificacao } from "@/lib/generated/prisma/client";

interface NotificacaoInput {
  tipo: TipoNotificacao;
  titulo: string;
  mensagem: string;
  link?: string;
  usuarioDestinoIds: string[];
}

/**
 * Cria notificações para múltiplos destinatários em batch.
 */
export async function criarNotificacoes(input: NotificacaoInput) {
  if (input.usuarioDestinoIds.length === 0) return;

  await prisma.notificacao.createMany({
    data: input.usuarioDestinoIds.map((id) => ({
      tipo: input.tipo,
      titulo: input.titulo,
      mensagem: input.mensagem,
      link: input.link,
      usuarioDestinoId: id,
    })),
  });
}

/**
 * Busca IDs de usuários por matrícula.
 */
export async function buscarUsuarioIdsPorMatriculas(
  matriculas: string[],
): Promise<string[]> {
  if (matriculas.length === 0) return [];

  const usuarios = await prisma.usuario.findMany({
    where: { matricula: { in: matriculas }, ativo: true },
    select: { id: true },
  });

  return usuarios.map((u) => u.id);
}
