// Sem `import "server-only"` aqui porque o pacote quebra no ambiente do
// Vitest (jsdom). A proteção contra uso client-side vem de
// `lib/sicam-oracle/client.ts` que importa oracledb (não bundlável no client).
import { executeSicamQuery } from "@/lib/sicam-oracle";
import { logger } from "@/lib/logger";

const sicamQueriesLogger = logger.child({ module: "sicam-queries" });

/**
 * Tombo retornado pelas queries do SICAM Oracle. Os campos espelham o que o
 * SIMAP consome historicamente do CSV legado, com a diferença de que `numero`
 * sempre vem sem zeros à esquerda (NUMBER no Oracle).
 *
 * Notas:
 * - `nomeResponsavel` NÃO vem do SICAM — em [docs/SICAM_SCHEMA.md] foi
 *   observado que `TERMO.NO_RECEB` é nullable e frequentemente vazio. Use
 *   o serviço LDAP (`lib/ldap/directory-email.ts` ou similar) para resolver
 *   o nome via `matriculaResponsavel`.
 * - `dataTermo` e `termoAssinado` são metadados — `termoAssinado=false` indica
 *   que o termo de responsabilidade ainda é rascunho mas os dados de
 *   lotação/responsável já são considerados válidos pelo SIMAP.
 */
export interface SicamTombo {
  numero: string;
  descricaoMaterial: string;
  tipoTombo: string;
  codigoFornecedor: string | null;
  nomeFornecedor: string | null;
  /** Identificadores do TERMO atual do tombo na tabela TOMBO Oracle. Null em raros tombos sem TERMO. */
  nuTermo: number | null;
  anTermo: number | null;
  tiTermo: number | null;
  codLotacao: number | null;
  codSetor: number | null;
  nomeSetor: string | null;
  matriculaResponsavel: string | null;
  dataTermo: Date | null;
  termoAssinado: boolean;
  /** Descrição longa da lotação, vinda de SARH.RH_LOTACAO.LOTA_DSC_LOTACAO. Null quando a lotação não tem cadastro no SARH. */
  descLotacao: string | null;
  /** Sigla da lotação, vinda de SARH.RH_LOTACAO.LOTA_SIGLA_LOTACAO. */
  siglaLotacao: string | null;
}

interface SicamTomboRow {
  NU_TOMBO: string;
  DESCRICAO_MATERIAL: string;
  TI_TOMBO: string;
  CO_FORN: string | null;
  NO_FORN: string | null;
  NU_TERMO_ATUAL: number | null;
  AN_TERMO_ATUAL: number | null;
  TI_TERMO_ATUAL: number | null;
  COD_LOTACAO: number | null;
  COD_SETOR: number | null;
  NOME_SETOR: string | null;
  MATRICULA_RESPONSAVEL: string | null;
  DT_TERMO: Date | null;
  FG_ASSINADO: string | null;
  DESC_LOTACAO: string | null;
  SIGLA_LOTACAO: string | null;
}

// Colunas selecionadas — ficam em uma constante porque são usadas em duas
// queries com JOIN levemente diferente (LEFT vs INNER no TERMO).
// SARH.RH_LOTACAO (mesmo servidor Oracle, mesmo usuário) fornece a descrição
// longa da lotação via LOTA_COD_LOTACAO = tr.CO_LOTA.
const TOMBO_COLUMNS_SQL = `
  TO_CHAR(t.NU_TOMBO) AS NU_TOMBO,
  m.DE_MAT            AS DESCRICAO_MATERIAL,
  t.TI_TOMBO,
  t.CO_FORN,
  t.NO_FORN,
  t.NU_TERMO          AS NU_TERMO_ATUAL,
  t.AN_TERMO          AS AN_TERMO_ATUAL,
  t.TI_TERMO          AS TI_TERMO_ATUAL,
  tr.CO_LOTA          AS COD_LOTACAO,
  tr.CO_SETOR         AS COD_SETOR,
  ps.NO_SETOR         AS NOME_SETOR,
  tr.NU_MATR_RESP_TOMBO AS MATRICULA_RESPONSAVEL,
  tr.DT_TERMO,
  tr.FG_ASSINADO,
  rl.LOTA_DSC_LOTACAO   AS DESC_LOTACAO,
  rl.LOTA_SIGLA_LOTACAO AS SIGLA_LOTACAO
`;

function normalizeNumero(input: string | number): number {
  if (typeof input === "number") {
    if (!Number.isInteger(input) || input <= 0) {
      throw new Error(`Número de tombo inválido: ${input}`);
    }
    return input;
  }
  const trimmed = input.trim().replace(/^0+/, "");
  if (!/^\d+$/.test(trimmed) || trimmed.length === 0) {
    throw new Error(`Número de tombo inválido: "${input}"`);
  }
  return Number(trimmed);
}

function mapTomboRow(row: SicamTomboRow): SicamTombo {
  return {
    numero: String(row.NU_TOMBO),
    descricaoMaterial: row.DESCRICAO_MATERIAL,
    tipoTombo: row.TI_TOMBO,
    codigoFornecedor: row.CO_FORN,
    nomeFornecedor: row.NO_FORN,
    nuTermo: row.NU_TERMO_ATUAL ?? null,
    anTermo: row.AN_TERMO_ATUAL ?? null,
    tiTermo: row.TI_TERMO_ATUAL ?? null,
    codLotacao: row.COD_LOTACAO,
    codSetor: row.COD_SETOR,
    nomeSetor: row.NOME_SETOR,
    matriculaResponsavel: row.MATRICULA_RESPONSAVEL,
    dataTermo: row.DT_TERMO,
    termoAssinado: row.FG_ASSINADO === "S",
    descLotacao: row.DESC_LOTACAO ?? null,
    siglaLotacao: row.SIGLA_LOTACAO ?? null,
  };
}

/**
 * Busca um tombo no SICAM Oracle pelo número (NUMBER no Oracle, string no
 * SIMAP — a função aceita ambos).
 *
 * Retorna `null` quando:
 * - o tombo não existe;
 * - é do tipo livro (`TI_TOMBO = 'L'`) — gerenciado em módulo separado do SICAM;
 * - foi baixado/saiu (`IN_SAIDA = 2`).
 *
 * Quando o tombo não tem termo de responsabilidade associado (~0,02% dos
 * casos na base JFAP), `codLotacao`, `codSetor`, `nomeSetor` e
 * `matriculaResponsavel` vêm null — o caller decide se mostra "Lotação não
 * definida" ou ignora o registro.
 */
export interface BuscarTomboSicamOptions {
  /** Override do timeout padrão de query. Útil para fluxos sensíveis a latência (scan). */
  timeoutMs?: number;
}

export async function buscarTomboSicam(
  numero: string | number,
  options: BuscarTomboSicamOptions = {},
): Promise<SicamTombo | null> {
  const nuTombo = normalizeNumero(numero);

  const sql = `
    SELECT ${TOMBO_COLUMNS_SQL}
    FROM TOMBO t
      INNER JOIN MATERIAL m
        ON m.CO_MAT = t.CO_MAT
      LEFT JOIN TERMO tr
        ON tr.NU_TERMO = t.NU_TERMO
       AND tr.AN_TERMO = t.AN_TERMO
       AND tr.TI_TERMO = t.TI_TERMO
      LEFT JOIN PATRIMONIO_SETOR ps
        ON ps.CO_LOTA  = tr.CO_LOTA
       AND ps.CO_SETOR = tr.CO_SETOR
      LEFT JOIN SARH.RH_LOTACAO rl
        ON rl.LOTA_COD_LOTACAO = tr.CO_LOTA
       AND rl.LOTA_DAT_FIM IS NULL
    WHERE t.NU_TOMBO  = :nuTombo
      AND t.TI_TOMBO != 'L'
      AND t.IN_SAIDA  = 1
  `;

  const result = await executeSicamQuery<SicamTomboRow>(
    sql,
    { nuTombo },
    options.timeoutMs ? { timeoutMs: options.timeoutMs } : {},
  );
  const row = result.rows?.[0];
  if (!row) {
    sicamQueriesLogger.debug({ nuTombo }, "Tombo não encontrado no SICAM");
    return null;
  }
  return mapTomboRow(row);
}

// =====================================================================
// Snapshot real-time (Fase 3) — consulta SICAM com graceful degradation
// e compara com o cache local do SIMAP.
// =====================================================================

export type TomboDivergencia =
  | "unidade"
  | "setor"
  | "responsavel"
  | "descricao";

export type SnapshotSicamStatus = "ok" | "indisponivel" | "nao_encontrado";

export interface SnapshotSicamResult {
  /** Estado da consulta — "ok" quando dados foram retornados. */
  status: SnapshotSicamStatus;
  /** Instante da consulta — render renderiza como "Atualizado há X". */
  consultadoEm: Date;
  /** Mensagem amigável quando status = "indisponivel" (Oracle fora, timeout, etc). */
  errorMessage?: string;
  /** Código ORA-xxxxx quando aplicável — útil para diagnóstico em logs. */
  oraCode?: number | null;
  /** Dados do SICAM quando status = "ok". */
  dados?: SicamTombo;
  /** Diferenças detectadas em relação ao cache local. Vazio quando dados batem. */
  divergencias?: TomboDivergencia[];
}

export interface TomboLocalParaComparacao {
  numero: string;
  descricaoMaterial?: string | null;
  unidade?: { codigo: string } | null;
  setor?: { codigo?: string | null } | null;
  usuarioResponsavel?: { matricula: string } | null;
  matriculaResponsavel?: string | null;
}

/**
 * Compara cache local SIMAP com snapshot SICAM. Retorna lista de campos
 * divergentes. Tolerante a nulls — campos ausentes não contam como divergência.
 */
export function compararLocalComSicam(
  local: TomboLocalParaComparacao,
  sicam: SicamTombo,
): TomboDivergencia[] {
  const divergencias: TomboDivergencia[] = [];

  if (sicam.codLotacao !== null && local.unidade) {
    if (String(sicam.codLotacao) !== local.unidade.codigo) {
      divergencias.push("unidade");
    }
  }

  if (sicam.codSetor !== null && local.setor?.codigo) {
    if (String(sicam.codSetor) !== local.setor.codigo) {
      divergencias.push("setor");
    }
  }

  if (sicam.matriculaResponsavel) {
    const localMat =
      local.usuarioResponsavel?.matricula ?? local.matriculaResponsavel ?? null;
    if (localMat && localMat !== sicam.matriculaResponsavel) {
      divergencias.push("responsavel");
    }
  }

  if (
    local.descricaoMaterial &&
    sicam.descricaoMaterial &&
    local.descricaoMaterial.trim() !== sicam.descricaoMaterial.trim()
  ) {
    divergencias.push("descricao");
  }

  return divergencias;
}

export interface BuscarSnapshotSicamOptions extends BuscarTomboSicamOptions {
  /** Cache local para cálculo de divergências; quando omitido, `divergencias` vem vazio. */
  local?: TomboLocalParaComparacao | null;
}

/**
 * Consulta o SICAM para um tombo e produz um snapshot com graceful degradation:
 *
 * - **ok**: SICAM respondeu e o tombo existe ativo. `dados` preenchido.
 * - **nao_encontrado**: SICAM respondeu, mas o tombo não está lá (foi baixado,
 *   é livro, ou nunca existiu). `dados` ausente.
 * - **indisponivel**: SICAM falhou (rede, timeout, ORA-xxxxx). `errorMessage`
 *   e `oraCode` preenchidos quando disponíveis.
 *
 * **Nunca lança** — caller renderiza o `status` para o usuário.
 */
export async function buscarSnapshotSicam(
  numero: string | number,
  options: BuscarSnapshotSicamOptions = {},
): Promise<SnapshotSicamResult> {
  const consultadoEm = new Date();
  const { local, ...queryOptions } = options;

  try {
    const dados = await buscarTomboSicam(numero, queryOptions);
    if (!dados) {
      return { status: "nao_encontrado", consultadoEm };
    }
    const divergencias = local ? compararLocalComSicam(local, dados) : [];
    return { status: "ok", consultadoEm, dados, divergencias };
  } catch (err) {
    const oraCode =
      typeof err === "object" &&
      err !== null &&
      "oraCode" in err &&
      typeof (err as { oraCode?: unknown }).oraCode === "number"
        ? (err as { oraCode: number }).oraCode
        : null;
    const errorMessage =
      err instanceof Error ? err.message : "Erro desconhecido";
    sicamQueriesLogger.warn(
      { err, numero, oraCode },
      "SICAM indisponível para snapshot",
    );
    return { status: "indisponivel", consultadoEm, errorMessage, oraCode };
  }
}

export interface ListarTombosPorLotacaoOptions {
  pagina?: number;
  porPagina?: number;
}

export interface ListarTombosPorLotacaoResult {
  tombos: SicamTombo[];
  total: number;
  pagina: number;
  porPagina: number;
  totalPaginas: number;
}

export interface ListarTodosTombosAtivosOptions {
  pagina?: number;
  porPagina?: number;
  /** Override do timeout do oracledb. Padrão: usa o do config. */
  timeoutMs?: number;
}

export interface ListarTombosAtivosResult {
  tombos: SicamTombo[];
  total: number;
  pagina: number;
  porPagina: number;
  totalPaginas: number;
}

/**
 * Lista todos os tombos ativos do SICAM, paginados, sem filtro de lotação.
 * Usado pelo **sync** (Fase 4) que substitui o CSV import — iteramos páginas
 * sequenciais até esgotar o universo (~7-8k tombos típicos).
 *
 * Usa INNER JOIN com TERMO para garantir que cada tombo retornado tem
 * lotação/setor/responsável atribuídos (o caso ~0,02% sem termo é ignorado
 * no sync por não ter dados de localização viáveis).
 */
export async function listarTodosTombosAtivos(
  options: ListarTodosTombosAtivosOptions = {},
): Promise<ListarTombosAtivosResult> {
  const pagina = Math.max(Math.floor(options.pagina ?? 1), 1);
  const porPagina = Math.min(
    Math.max(Math.floor(options.porPagina ?? 500), 1),
    1000,
  );
  const offset = (pagina - 1) * porPagina;

  const queryOptions = options.timeoutMs
    ? { timeoutMs: options.timeoutMs }
    : {};

  const countSql = `
    SELECT COUNT(*) AS TOTAL
    FROM TOMBO t
      INNER JOIN TERMO tr
        ON tr.NU_TERMO = t.NU_TERMO
       AND tr.AN_TERMO = t.AN_TERMO
       AND tr.TI_TERMO = t.TI_TERMO
    WHERE t.TI_TOMBO != 'L'
      AND t.IN_SAIDA  = 1
  `;
  const countResult = await executeSicamQuery<{ TOTAL: number }>(
    countSql,
    {},
    queryOptions,
  );
  const total = countResult.rows?.[0]?.TOTAL ?? 0;

  if (total === 0) {
    return { tombos: [], total: 0, pagina, porPagina, totalPaginas: 0 };
  }

  const dataSql = `
    SELECT ${TOMBO_COLUMNS_SQL}
    FROM TOMBO t
      INNER JOIN MATERIAL m
        ON m.CO_MAT = t.CO_MAT
      INNER JOIN TERMO tr
        ON tr.NU_TERMO = t.NU_TERMO
       AND tr.AN_TERMO = t.AN_TERMO
       AND tr.TI_TERMO = t.TI_TERMO
      LEFT JOIN PATRIMONIO_SETOR ps
        ON ps.CO_LOTA  = tr.CO_LOTA
       AND ps.CO_SETOR = tr.CO_SETOR
      LEFT JOIN SARH.RH_LOTACAO rl
        ON rl.LOTA_COD_LOTACAO = tr.CO_LOTA
       AND rl.LOTA_DAT_FIM IS NULL
    WHERE t.TI_TOMBO != 'L'
      AND t.IN_SAIDA  = 1
    ORDER BY t.NU_TOMBO
    OFFSET :offset ROWS FETCH NEXT :porPagina ROWS ONLY
  `;
  const dataResult = await executeSicamQuery<SicamTomboRow>(
    dataSql,
    { offset, porPagina },
    queryOptions,
  );

  const tombos = (dataResult.rows ?? []).map(mapTomboRow);
  return {
    tombos,
    total,
    pagina,
    porPagina,
    totalPaginas: Math.ceil(total / porPagina),
  };
}

// =====================================================================
// Histórico de transferências (Onda 2) — busca eventos de transferência
// de tombos registrados na base Oracle SICAM.
//
// Fonte: HISTORICO_ITEM_TERMO WHERE FG_TRANSFERENCIA = 'S'.
// Fonte de histórico confirmada em 2026-05-12: HISTORICO_TOMBO WHERE TIPO_OPERACAO='E'
// JOIN TERMO. HISTORICO_ITEM_TERMO tem apenas 1 tombo ativo; HISTORICO_TOMBO tem 3.219.
// =====================================================================

/**
 * Estado histórico de um tombo no SICAM: um TERMO anterior ao atual.
 * Fonte: HISTORICO_TOMBO (TIPO_OPERACAO='E') + JOIN TERMO + PATRIMONIO_SETOR.
 */
export interface SicamTermoHistorico {
  nuTombo: string;
  nuTermo: number;
  anTermo: number;
  tiTermo: number;
  dtTermo: Date | null;
  codLotacao: number | null;
  codSetor: number | null;
  nomeSetor: string | null;
  matriculaResp: string | null;
}

interface SicamTermoHistoricoRow {
  NU_TOMBO: string;
  NU_TERMO: number;
  AN_TERMO: number;
  TI_TERMO: number;
  DT_TERMO: Date | null;
  COD_LOTACAO: number | null;
  COD_SETOR: number | null;
  NOME_SETOR: string | null;
  MATRICULA_RESP: string | null;
}

function mapTermoHistoricoRow(row: SicamTermoHistoricoRow): SicamTermoHistorico {
  return {
    nuTombo: String(row.NU_TOMBO),
    nuTermo: Number(row.NU_TERMO),
    anTermo: Number(row.AN_TERMO),
    tiTermo: Number(row.TI_TERMO),
    dtTermo: row.DT_TERMO ?? null,
    codLotacao: row.COD_LOTACAO ?? null,
    codSetor: row.COD_SETOR ?? null,
    nomeSetor: row.NOME_SETOR ?? null,
    matriculaResp: row.MATRICULA_RESP ?? null,
  };
}

// Limite máximo de placeholders por sub-lote (ORA-01795: max 1000 in IN clause).
const TRANSFERENCIA_BATCH_SIZE = 100;

/**
 * Busca o histórico de termos de um lote de tombos no SICAM Oracle.
 *
 * Fonte: `HISTORICO_TOMBO WHERE TIPO_OPERACAO='E' AND NU_TOMBO IN (...)` JOIN TERMO.
 * Deduplica por (NU_TOMBO, NU_TERMO, AN_TERMO, TI_TERMO) — um tombo pode ter
 * múltiplas linhas 'E' para o mesmo TERMO se foi editado sem transferência.
 * Sub-lotes de 100 para respeitar limite de IN clause Oracle.
 *
 * Retorna `Map<nuTombo, SicamTermoHistorico[]>`. Tombos sem histórico ficam ausentes.
 */
export async function buscarHistoricoTermosBatch(
  numeros: string[],
  options: { timeoutMs?: number } = {},
): Promise<Map<string, SicamTermoHistorico[]>> {
  if (numeros.length === 0) return new Map();

  const resultado = new Map<string, SicamTermoHistorico[]>();

  for (let i = 0; i < numeros.length; i += TRANSFERENCIA_BATCH_SIZE) {
    const sublote = numeros.slice(i, i + TRANSFERENCIA_BATCH_SIZE);

    const placeholders = sublote.map((_, idx) => `:b${idx}`).join(",");
    const binds: Record<string, number> = Object.fromEntries(
      sublote.map((n, idx) => [`b${idx}`, Number(n)]),
    );

    // TERMO pode não ter o registro histórico (foi sobrescrito).
    // HISTORICO_TERMO (auditoria de TERMO) é usado como fallback via COALESCE.
    const sql = `
      SELECT
        TO_CHAR(ht.NU_TOMBO)                                      AS NU_TOMBO,
        ht.NU_TERMO,
        ht.AN_TERMO,
        ht.TI_TERMO,
        COALESCE(tr.DT_TERMO,    htr.DT_TERMO)                    AS DT_TERMO,
        COALESCE(tr.CO_LOTA,     htr.CO_LOTA)                     AS COD_LOTACAO,
        COALESCE(tr.CO_SETOR,    htr.CO_SETOR)                    AS COD_SETOR,
        COALESCE(ps.NO_SETOR,    ps2.NO_SETOR)                    AS NOME_SETOR,
        COALESCE(tr.NU_MATR_RESP_TOMBO, htr.NU_MATR_RESP_TOMBO)  AS MATRICULA_RESP
      FROM (
        SELECT TO_CHAR(NU_TOMBO) AS NU_TOMBO, NU_TERMO, AN_TERMO, TI_TERMO,
               MAX(DT_CRIACAO) AS DT_CRIACAO
        FROM HISTORICO_TOMBO
        WHERE NU_TOMBO IN (${placeholders})
          AND TIPO_OPERACAO = 'E'
          AND NU_TERMO IS NOT NULL
        GROUP BY TO_CHAR(NU_TOMBO), NU_TERMO, AN_TERMO, TI_TERMO
      ) ht
      LEFT JOIN TERMO tr
        ON tr.NU_TERMO = ht.NU_TERMO
       AND tr.AN_TERMO = ht.AN_TERMO
       AND tr.TI_TERMO = ht.TI_TERMO
      LEFT JOIN (
        SELECT NU_TERMO, AN_TERMO, TI_TERMO,
               MAX(CO_LOTA)             AS CO_LOTA,
               MAX(CO_SETOR)            AS CO_SETOR,
               MAX(DT_TERMO)            AS DT_TERMO,
               MAX(NU_MATR_RESP_TOMBO)  AS NU_MATR_RESP_TOMBO
        FROM HISTORICO_TERMO
        WHERE CO_LOTA IS NOT NULL
        GROUP BY NU_TERMO, AN_TERMO, TI_TERMO
      ) htr
        ON htr.NU_TERMO = ht.NU_TERMO
       AND htr.AN_TERMO = ht.AN_TERMO
       AND htr.TI_TERMO = ht.TI_TERMO
      LEFT JOIN PATRIMONIO_SETOR ps
        ON ps.CO_LOTA  = tr.CO_LOTA
       AND ps.CO_SETOR = tr.CO_SETOR
      LEFT JOIN PATRIMONIO_SETOR ps2
        ON ps2.CO_LOTA  = htr.CO_LOTA
       AND ps2.CO_SETOR = htr.CO_SETOR
      ORDER BY ht.NU_TOMBO, ht.DT_CRIACAO DESC NULLS LAST
    `;

    const result = await executeSicamQuery<SicamTermoHistoricoRow>(
      sql,
      binds,
      options.timeoutMs ? { timeoutMs: options.timeoutMs } : {},
    );

    for (const row of result.rows ?? []) {
      const termo = mapTermoHistoricoRow(row);
      const lista = resultado.get(termo.nuTombo) ?? [];
      lista.push(termo);
      resultado.set(termo.nuTombo, lista);
    }
  }

  return resultado;
}

/**
 * Lista tombos ativos vinculados a uma lotação no SICAM, com paginação
 * server-side. Usa INNER JOIN com TERMO — o caso ~0,02% sem termo não
 * aparece (sem termo, não há vínculo de lotação a filtrar).
 *
 * Pensado para alimentar:
 * - tela "Meus patrimônios" do servidor responsável (overlay real-time),
 * - sync periódico que substitui o CSV (Fase 4 da integração).
 */
export async function listarTombosPorLotacao(
  codLotacao: number,
  options: ListarTombosPorLotacaoOptions = {},
): Promise<ListarTombosPorLotacaoResult> {
  if (!Number.isInteger(codLotacao) || codLotacao <= 0) {
    throw new Error(`codLotacao inválido: ${codLotacao}`);
  }
  const pagina = Math.max(Math.floor(options.pagina ?? 1), 1);
  const porPagina = Math.min(
    Math.max(Math.floor(options.porPagina ?? 20), 1),
    100,
  );
  const offset = (pagina - 1) * porPagina;

  const countSql = `
    SELECT COUNT(*) AS TOTAL
    FROM TOMBO t
      INNER JOIN TERMO tr
        ON tr.NU_TERMO = t.NU_TERMO
       AND tr.AN_TERMO = t.AN_TERMO
       AND tr.TI_TERMO = t.TI_TERMO
    WHERE tr.CO_LOTA  = :codLotacao
      AND t.TI_TOMBO != 'L'
      AND t.IN_SAIDA  = 1
  `;
  const countResult = await executeSicamQuery<{ TOTAL: number }>(countSql, {
    codLotacao,
  });
  const total = countResult.rows?.[0]?.TOTAL ?? 0;

  if (total === 0) {
    return { tombos: [], total: 0, pagina, porPagina, totalPaginas: 0 };
  }

  const dataSql = `
    SELECT ${TOMBO_COLUMNS_SQL}
    FROM TOMBO t
      INNER JOIN MATERIAL m
        ON m.CO_MAT = t.CO_MAT
      INNER JOIN TERMO tr
        ON tr.NU_TERMO = t.NU_TERMO
       AND tr.AN_TERMO = t.AN_TERMO
       AND tr.TI_TERMO = t.TI_TERMO
      LEFT JOIN PATRIMONIO_SETOR ps
        ON ps.CO_LOTA  = tr.CO_LOTA
       AND ps.CO_SETOR = tr.CO_SETOR
      LEFT JOIN SARH.RH_LOTACAO rl
        ON rl.LOTA_COD_LOTACAO = tr.CO_LOTA
       AND rl.LOTA_DAT_FIM IS NULL
    WHERE tr.CO_LOTA  = :codLotacao
      AND t.TI_TOMBO != 'L'
      AND t.IN_SAIDA  = 1
    ORDER BY t.NU_TOMBO
    OFFSET :offset ROWS FETCH NEXT :porPagina ROWS ONLY
  `;
  const dataResult = await executeSicamQuery<SicamTomboRow>(dataSql, {
    codLotacao,
    offset,
    porPagina,
  });

  const tombos = (dataResult.rows ?? []).map(mapTomboRow);
  return {
    tombos,
    total,
    pagina,
    porPagina,
    totalPaginas: Math.ceil(total / porPagina),
  };
}
