"use server";

import { revalidatePath } from "next/cache";
import { requireRoleAction } from "@/lib/auth-guard";
import { logger } from "@/lib/logger";
import { executarSincronizacaoSicam } from "@/server/services/sicam-sync";
import { registrarAuditoria } from "@/server/services/audit";
import { SicamOracleError } from "@/lib/sicam-oracle/errors";

const syncActionLogger = logger.child({ module: "sicam-sync-action" });

export interface SincronizarComSicamResult {
  success: boolean;
  error?: string;
  oraCode?: number | null;
  data?: {
    sincronizacaoId: string;
    totalProcessados: number;
    novos: number;
    atualizados: number;
    erros: number;
    duracaoMs: number;
    historicosSincronizados: number;
    errosFaseHistorico: number;
  };
}

/**
 * Dispara uma sincronização full do SICAM → SIMAP. Bloqueante para o usuário:
 * a Server Action só retorna quando o ciclo termina (ou falha).
 *
 * Apenas `GESTOR_ADMIN` pode disparar — evita técnicos sobrecarregando o
 * Oracle de produção. O resultado também é gravado em `AuditLog` para
 * compliance.
 */
export async function sincronizarComSicam(): Promise<SincronizarComSicamResult> {
  const { user, error: authError } = await requireRoleAction(["GESTOR_ADMIN"]);
  if (authError || !user) {
    return { success: false, error: authError ?? "Não autorizado" };
  }

  try {
    const resultado = await executarSincronizacaoSicam({ iniciadoPorId: user.id });

    await registrarAuditoria(
      "SINCRONIZACAO_SICAM",
      "SincronizacaoSicam",
      resultado.sincronizacaoId,
      user.id,
      {
        totalProcessados: resultado.totalProcessados,
        novos: resultado.novos,
        atualizados: resultado.atualizados,
        erros: resultado.erros,
        duracaoMs: resultado.duracaoMs,
      },
    );

    // Tombo/Unidade/Setor podem ter mudado — invalida caches de listagens.
    revalidatePath("/admin/sicam");
    revalidatePath("/tombos");
    revalidatePath("/admin/unidades");
    revalidatePath("/admin/setores");

    return { success: true, data: resultado };
  } catch (err) {
    const oraCode =
      err instanceof SicamOracleError ? err.oraCode : null;
    const mensagem =
      err instanceof Error ? err.message : "Falha desconhecida no sync";

    syncActionLogger.error(
      { err, oraCode, iniciadoPorId: user.id },
      "Server Action sincronizarComSicam falhou",
    );

    return { success: false, error: mensagem, oraCode };
  }
}
