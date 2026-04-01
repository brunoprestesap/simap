"use server";

import type { StatusMovimentacao, TipoNotificacao } from "@/lib/generated/prisma/client";
import {
  MOVIMENTACAO_STATUS_EM_ANDAMENTO,
  TOMBO_EM_MOVIMENTACAO_WHERE,
} from "@/lib/movimentacao-status";
import { prisma } from "@/lib/prisma";
import { listarBacklog } from "@/server/queries/backlog";
import {
  calcularTempoMedioRegistroSicam,
  contarPendentesConfirmacaoGeral,
  contarPendentesSicam,
} from "@/server/queries/dashboard";
import { listarNotificacoesComContagem } from "@/server/queries/notificacoes";
import { contarPendentesConfirmacao } from "@/server/queries/patrimonio";

interface HomeMovimentacaoPreviewSource {
  id: string;
  codigo: string;
  status: StatusMovimentacao;
  createdAt: Date;
  unidadeOrigem: { descricao: string };
  unidadeDestino: { descricao: string };
  _count: { itens: number };
  tecnico?: { nome: string } | null;
}

export interface HomeMovimentacaoPreview {
  id: string;
  codigo: string;
  status: StatusMovimentacao;
  createdAt: Date;
  origem: string;
  destino: string;
  tombos: number;
  tecnicoNome?: string;
}

export interface HomeNotificationPreview {
  id: string;
  tipo: TipoNotificacao;
  titulo: string;
  mensagem: string;
  link: string | null;
  lida: boolean;
  createdAt: Date;
}

export interface HomeImportacaoSnapshot {
  id: string;
  nomeArquivo: string;
  novos: number;
  atualizados: number;
  erros: number;
  createdAt: Date;
  importadoPorNome: string;
}

function getStartOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function getEndOfToday() {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function mapMovimentacaoPreview(
  movimentacao: HomeMovimentacaoPreviewSource,
): HomeMovimentacaoPreview {
  return {
    id: movimentacao.id,
    codigo: movimentacao.codigo,
    status: movimentacao.status,
    createdAt: movimentacao.createdAt,
    origem: movimentacao.unidadeOrigem.descricao,
    destino: movimentacao.unidadeDestino.descricao,
    tombos: movimentacao._count.itens,
    tecnicoNome: movimentacao.tecnico?.nome,
  };
}

async function getRecentNotifications(userId: string, take = 3) {
  const { notificacoes, naoLidas } = await listarNotificacoesComContagem(userId, take);

  return {
    naoLidas,
    notificacoes: notificacoes.map<HomeNotificationPreview>((notificacao) => ({
      id: notificacao.id,
      tipo: notificacao.tipo,
      titulo: notificacao.titulo,
      mensagem: notificacao.mensagem,
      link: notificacao.link,
      lida: notificacao.lida,
      createdAt: notificacao.createdAt,
    })),
  };
}

async function getUltimaImportacao(importadoPorId: string) {
  const importacao = await prisma.importacaoCSV.findFirst({
    where: { importadoPorId },
    orderBy: { createdAt: "desc" },
    include: {
      importadoPor: { select: { nome: true } },
    },
  });

  if (!importacao) {
    return null;
  }

  return {
    id: importacao.id,
    nomeArquivo: importacao.nomeArquivo,
    novos: importacao.novos,
    atualizados: importacao.atualizados,
    erros: importacao.erros,
    createdAt: importacao.createdAt,
    importadoPorNome: importacao.importadoPor.nome,
  } satisfies HomeImportacaoSnapshot;
}

export async function getTecnicoHomeData(userId: string) {
  const todayStart = getStartOfToday();
  const todayEnd = getEndOfToday();

  const [
    movHoje,
    pendentesConfirmacao,
    registradasSicam,
    movimentacoesRecentes,
    notifications,
    ultimaImportacao,
  ] = await Promise.all([
    prisma.movimentacao.count({
      where: {
        tecnicoId: userId,
        createdAt: { gte: todayStart, lte: todayEnd },
      },
    }),
    prisma.movimentacao.count({
      where: {
        tecnicoId: userId,
        status: "PENDENTE_CONFIRMACAO",
      },
    }),
    prisma.movimentacao.count({
      where: {
        tecnicoId: userId,
        status: "REGISTRADA_SICAM",
      },
    }),
    prisma.movimentacao.findMany({
      where: { tecnicoId: userId },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: {
        unidadeOrigem: { select: { descricao: true } },
        unidadeDestino: { select: { descricao: true } },
        _count: { select: { itens: true } },
      },
    }),
    getRecentNotifications(userId),
    getUltimaImportacao(userId),
  ]);

  return {
    movHoje,
    pendentesConfirmacao,
    registradasSicam,
    movimentacoesRecentes: movimentacoesRecentes.map(mapMovimentacaoPreview),
    notificacoes: notifications.notificacoes,
    notificacoesNaoLidas: notifications.naoLidas,
    ultimaImportacao,
  };
}

export async function getResponsavelHomeData(userId: string, matricula: string) {
  const servidor = await prisma.servidor.findFirst({
    where: { matricula, ativo: true },
    include: {
      unidade: { select: { id: true, descricao: true } },
    },
  });

  const notifications = await getRecentNotifications(userId);

  if (!servidor) {
    return {
      servidor: null,
      pendentesConfirmacao: 0,
      patrimonioTotal: 0,
      patrimonioEmMovimentacao: 0,
      pendenciasRecentes: [] as HomeMovimentacaoPreview[],
      notificacoes: notifications.notificacoes,
      notificacoesNaoLidas: notifications.naoLidas,
    };
  }

  const [
    pendentesConfirmacao,
    patrimonioTotal,
    patrimonioEmMovimentacao,
    pendenciasRecentes,
  ] = await Promise.all([
    contarPendentesConfirmacao(servidor.unidadeId),
    prisma.tombo.count({
      where: {
        unidadeId: servidor.unidadeId,
        ativo: true,
      },
    }),
    prisma.tombo.count({
      where: {
        unidadeId: servidor.unidadeId,
        ativo: true,
        itensMovimentacao: TOMBO_EM_MOVIMENTACAO_WHERE,
      },
    }),
    prisma.movimentacao.findMany({
      where: {
        unidadeOrigemId: servidor.unidadeId,
        status: { in: [...MOVIMENTACAO_STATUS_EM_ANDAMENTO] },
      },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: {
        unidadeOrigem: { select: { descricao: true } },
        unidadeDestino: { select: { descricao: true } },
        _count: { select: { itens: true } },
      },
    }),
  ]);

  return {
    servidor: {
      unidadeId: servidor.unidadeId,
      unidadeNome: servidor.unidade.descricao,
    },
    pendentesConfirmacao,
    patrimonioTotal,
    patrimonioEmMovimentacao,
    pendenciasRecentes: pendenciasRecentes.map(mapMovimentacaoPreview),
    notificacoes: notifications.notificacoes,
    notificacoesNaoLidas: notifications.naoLidas,
  };
}

export async function getSemapHomeData(userId: string) {
  const [
    pendentesSicam,
    pendentesConfirmacao,
    tempoMedio,
    backlog,
    notifications,
    ultimaImportacao,
  ] = await Promise.all([
    contarPendentesSicam(),
    contarPendentesConfirmacaoGeral(),
    calcularTempoMedioRegistroSicam(),
    listarBacklog({ pagina: 1, porPagina: 4 }),
    getRecentNotifications(userId),
    getUltimaImportacao(userId),
  ]);

  return {
    pendentesSicam,
    pendentesConfirmacao,
    backlogTotal: backlog.total,
    tempoMedioDias: tempoMedio.tempoMedioDias,
    backlogRecente: backlog.movimentacoes.map(mapMovimentacaoPreview),
    notificacoes: notifications.notificacoes,
    notificacoesNaoLidas: notifications.naoLidas,
    ultimaImportacao,
  };
}

export async function getGestorHomeData(userId: string) {
  const periodo30Dias = daysAgo(30);

  const [
    pendentesSicam,
    pendentesConfirmacao,
    tempoMedio,
    movimentacoes30Dias,
    unidadesAtivas,
    atividadesRecentes,
    notifications,
  ] = await Promise.all([
    contarPendentesSicam(),
    contarPendentesConfirmacaoGeral(),
    calcularTempoMedioRegistroSicam(),
    prisma.movimentacao.count({
      where: {
        createdAt: { gte: periodo30Dias },
      },
    }),
    prisma.unidade.count({ where: { ativo: true } }),
    prisma.movimentacao.findMany({
      orderBy: { createdAt: "desc" },
      take: 4,
      include: {
        unidadeOrigem: { select: { descricao: true } },
        unidadeDestino: { select: { descricao: true } },
        tecnico: { select: { nome: true } },
        _count: { select: { itens: true } },
      },
    }),
    getRecentNotifications(userId),
  ]);

  return {
    pendentesSicam,
    pendentesConfirmacao,
    tempoMedioDias: tempoMedio.tempoMedioDias,
    movimentacoes30Dias,
    unidadesAtivas,
    atividadesRecentes: atividadesRecentes.map(mapMovimentacaoPreview),
    notificacoes: notifications.notificacoes,
    notificacoesNaoLidas: notifications.naoLidas,
  };
}
