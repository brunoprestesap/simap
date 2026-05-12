import { prisma } from "@/lib/prisma";

export interface SicamSyncHistoricoItem {
  id: string;
  status: "EM_ANDAMENTO" | "CONCLUIDA" | "ERRO";
  totalProcessados: number;
  novos: number;
  atualizados: number;
  erros: number;
  mensagemErro: string | null;
  iniciadoPor: { nome: string; matricula: string };
  createdAt: Date;
  finalizadoEm: Date | null;
}

/**
 * Retorna as últimas execuções de sincronização para exibir no painel admin.
 * Sem paginação — as últimas 20 são suficientes para visibilidade operacional.
 * Sincronizações antigas continuam no banco (auditoria), só não aparecem aqui.
 */
export async function listarHistoricoSincronizacoesSicam(
  limite = 20,
): Promise<SicamSyncHistoricoItem[]> {
  const items = await prisma.sincronizacaoSicam.findMany({
    take: Math.min(Math.max(limite, 1), 100),
    orderBy: { createdAt: "desc" },
    include: {
      iniciadoPor: { select: { nome: true, matricula: true } },
    },
  });

  return items.map((s) => ({
    id: s.id,
    status: s.status,
    totalProcessados: s.totalProcessados,
    novos: s.novos,
    atualizados: s.atualizados,
    erros: s.erros,
    mensagemErro: s.mensagemErro,
    iniciadoPor: s.iniciadoPor,
    createdAt: s.createdAt,
    finalizadoEm: s.finalizadoEm,
  }));
}
