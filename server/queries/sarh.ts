import { executeSicamQuery } from "@/lib/sicam-oracle";
import { logger } from "@/lib/logger";

const sarhLogger = logger.child({ module: "sarh-queries" });

export interface SarhLotacaoServidor {
  /** Código numérico da lotação — corresponde a Unidade.codigo no SIMAP. */
  codLotacao: number;
  /** Descrição longa da unidade (SARH.RH_LOTACAO). Null quando a unidade não
   *  tem registro ativo no RH_LOTACAO. */
  descLotacao: string | null;
  /** Sigla da unidade (ex: "NUTEC", "SETSIS"). */
  siglaLotacao: string | null;
}

/**
 * Busca a lotação atual do servidor no SARH via `RH_FUNCIONARIO`.
 *
 * Fonte: `SARH.RH_FUNCIONARIO.FUNC_LOTA_COD_LOTACAO` — campo mestre do
 * registro do servidor, atualizado pelo RH a cada movimentação. É mais
 * confiável do que `SERV_LOTACAO` (que acumula linhas sem DT_SAIDA).
 *
 * Retorna `null` se o servidor não existir no SARH, se a lotação for nula,
 * ou se o Oracle estiver indisponível (o chamador deve tratar o null
 * silenciosamente — nunca bloquear o login).
 */
export async function buscarLotacaoAtualPorMatricula(
  matricula: string,
): Promise<SarhLotacaoServidor | null> {
  try {
    const result = await executeSicamQuery<{
      COD_LOTA: number | null;
      DESC_LOTA: string | null;
      SIGLA_LOTA: string | null;
    }>(
      `SELECT f.FUNC_LOTA_COD_LOTACAO  AS COD_LOTA,
              rl.LOTA_DSC_LOTACAO       AS DESC_LOTA,
              rl.LOTA_SIGLA_LOTACAO     AS SIGLA_LOTA
         FROM SARH.RH_FUNCIONARIO f
         LEFT JOIN SARH.RH_LOTACAO rl
                ON rl.LOTA_COD_LOTACAO = f.FUNC_LOTA_COD_LOTACAO
               AND rl.LOTA_DAT_FIM IS NULL
        WHERE UPPER(f.FUNC_MATRICULA_FOLHA) = UPPER(:matricula)
          AND f.FUNC_LOTA_COD_LOTACAO IS NOT NULL
        FETCH FIRST 1 ROW ONLY`,
      { matricula },
    );

    const row = (result.rows ?? [])[0];
    if (!row || row.COD_LOTA == null) return null;

    return {
      codLotacao: row.COD_LOTA,
      descLotacao: row.DESC_LOTA ?? null,
      siglaLotacao: row.SIGLA_LOTA ?? null,
    };
  } catch (err) {
    sarhLogger.warn({ matricula, err }, "SARH indisponível ao buscar lotação — provisionamento continua sem unidade");
    return null;
  }
}
