import type { StatusMovimentacao } from "@/lib/generated/prisma/client";

export const MOVIMENTACAO_STATUS_EM_ANDAMENTO = [
  "PENDENTE_CONFIRMACAO",
  "CONFIRMADA_ORIGEM",
] as const satisfies readonly StatusMovimentacao[];

/** Prisma where clause for tombos with active movements (itensMovimentacao filter). */
export const TOMBO_EM_MOVIMENTACAO_WHERE = {
  some: {
    movimentacao: {
      status: { in: [...MOVIMENTACAO_STATUS_EM_ANDAMENTO] },
    },
  },
};
