"use server";

import { prisma } from "@/lib/prisma";

export async function listarNotificacoes(
  usuarioDestinoId: string,
  pagina = 1,
  porPagina = 20,
) {
  const skip = (pagina - 1) * porPagina;

  const [notificacoes, total] = await Promise.all([
    prisma.notificacao.findMany({
      where: { usuarioDestinoId },
      orderBy: { createdAt: "desc" },
      skip,
      take: porPagina,
    }),
    prisma.notificacao.count({ where: { usuarioDestinoId } }),
  ]);

  return {
    notificacoes,
    total,
    totalPaginas: Math.ceil(total / porPagina),
    paginaAtual: pagina,
  };
}

export async function contarNaoLidas(usuarioDestinoId: string) {
  return prisma.notificacao.count({
    where: { usuarioDestinoId, lida: false },
  });
}

/**
 * Query combinada: retorna notificações recentes + contagem de não lidas
 * em uma única chamada, eliminando requisição dupla no NotificationBell.
 */
export async function listarNotificacoesComContagem(
  usuarioDestinoId: string,
  take = 10,
) {
  const [notificacoes, naoLidas] = await Promise.all([
    prisma.notificacao.findMany({
      where: { usuarioDestinoId },
      orderBy: { createdAt: "desc" },
      take,
    }),
    prisma.notificacao.count({
      where: { usuarioDestinoId, lida: false },
    }),
  ]);

  return { notificacoes, naoLidas };
}
