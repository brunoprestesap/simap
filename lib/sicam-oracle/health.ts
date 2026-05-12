import "server-only";
import { executeSicamQuery } from "./client";
import { getSicamOracleConfig } from "./config";
import { assertSafeOracleIdentifier } from "./identifier";

export interface SicamHealth {
  ok: boolean;
  latencyMs: number | null;
  serverVersion: string | null;
  error: string | null;
  oraCode: number | null;
}

export type SicamObjectType = "TABLE" | "VIEW";

export interface SicamObjectSummary {
  owner: string;
  objectName: string;
  objectType: SicamObjectType;
  numRows: number | null;
}

export interface SicamColumnSummary {
  columnName: string;
  dataType: string;
  dataLength: number | null;
  nullable: boolean;
  columnId: number;
}

export async function pingSicam(): Promise<SicamHealth> {
  const startedAt = Date.now();
  try {
    const result = await executeSicamQuery<{ BANNER: string }>(
      "SELECT BANNER FROM V$VERSION WHERE ROWNUM = 1",
      {},
      { timeoutMs: 3000 },
    );
    const serverVersion = result.rows?.[0]?.BANNER ?? null;
    return {
      ok: true,
      latencyMs: Date.now() - startedAt,
      serverVersion,
      error: null,
      oraCode: null,
    };
  } catch (e) {
    return parseProbeError(e, Date.now() - startedAt);
  }
}

function parseProbeError(err: unknown, latencyMs: number): SicamHealth {
  const message =
    err instanceof Error ? err.message : typeof err === "string" ? err : "Erro desconhecido";
  const oraCode =
    typeof err === "object" && err !== null && "oraCode" in err
      ? ((err as { oraCode?: unknown }).oraCode as number | null) ?? null
      : null;
  return {
    ok: false,
    latencyMs,
    serverVersion: null,
    error: message,
    oraCode,
  };
}

export interface ListObjectsOptions {
  search?: string;
  owner?: string;
  limit?: number;
  /** Filtra por tipo de objeto. Default: ambos (tabelas e views). */
  objectType?: SicamObjectType | "ALL";
}

/**
 * Lista tabelas e/ou views no schema, com filtros opcionais.
 *
 * Faz UNION ALL de ALL_TABLES e ALL_VIEWS porque o SIMAP precisa descobrir
 * tanto tabelas base quanto views denormalizadas (V_*, VW_*). NUM_ROWS é
 * sempre NULL para views.
 */
export async function listSicamObjects(
  options: ListObjectsOptions = {},
): Promise<SicamObjectSummary[]> {
  const cfg = getSicamOracleConfig();
  const ownerFilter = options.owner ?? cfg?.schemaOwner ?? null;
  const limit = Math.min(Math.max(options.limit ?? 200, 1), 1000);
  const search = options.search?.trim().toUpperCase();
  const objectType = options.objectType ?? "ALL";

  const binds: Record<string, string | number> = { limit };
  const baseConditions: string[] = [];

  if (ownerFilter) {
    baseConditions.push("owner = :ownerFilter");
    binds.ownerFilter = ownerFilter.toUpperCase();
  }

  if (search) {
    baseConditions.push("object_name LIKE :search");
    binds.search = `%${search}%`;
  }

  const baseWhere = baseConditions.length
    ? `WHERE ${baseConditions.join(" AND ")}`
    : "";

  const tablesQuery = `
    SELECT owner, table_name AS object_name, 'TABLE' AS object_type, num_rows
    FROM all_tables
    ${baseWhere.replace(/object_name/g, "table_name")}
  `;

  const viewsQuery = `
    SELECT owner, view_name AS object_name, 'VIEW' AS object_type, CAST(NULL AS NUMBER) AS num_rows
    FROM all_views
    ${baseWhere.replace(/object_name/g, "view_name")}
  `;

  let sourceSql: string;
  if (objectType === "TABLE") {
    sourceSql = tablesQuery;
  } else if (objectType === "VIEW") {
    sourceSql = viewsQuery;
  } else {
    sourceSql = `${tablesQuery}\n      UNION ALL\n      ${viewsQuery}`;
  }

  const sql = `
    SELECT owner, object_name, object_type, num_rows
    FROM (
      SELECT owner, object_name, object_type, num_rows
      FROM (${sourceSql})
      ORDER BY owner, object_name
    )
    WHERE ROWNUM <= :limit
  `;

  const result = await executeSicamQuery<{
    OWNER: string;
    OBJECT_NAME: string;
    OBJECT_TYPE: SicamObjectType;
    NUM_ROWS: number | null;
  }>(sql, binds);

  return (result.rows ?? []).map((r) => ({
    owner: r.OWNER,
    objectName: r.OBJECT_NAME,
    objectType: r.OBJECT_TYPE,
    numRows: r.NUM_ROWS ?? null,
  }));
}

/**
 * Inspeciona colunas de uma tabela ou view. ALL_TAB_COLUMNS cobre ambos os
 * tipos automaticamente — não é preciso decidir antes.
 */
export async function describeSicamObject(
  objectName: string,
  ownerOverride?: string,
): Promise<SicamColumnSummary[]> {
  const safeName = assertSafeOracleIdentifier(objectName, "objectName");
  const cfg = getSicamOracleConfig();
  const owner = ownerOverride ?? cfg?.schemaOwner ?? null;

  const binds: Record<string, string> = { objectName: safeName };
  let ownerCondition = "";
  if (owner) {
    ownerCondition = "AND owner = :ownerFilter";
    binds.ownerFilter = assertSafeOracleIdentifier(owner, "schemaOwner");
  }

  const sql = `
    SELECT column_name, data_type, data_length, nullable, column_id
    FROM all_tab_columns
    WHERE table_name = :objectName
      ${ownerCondition}
    ORDER BY column_id
  `;

  const result = await executeSicamQuery<{
    COLUMN_NAME: string;
    DATA_TYPE: string;
    DATA_LENGTH: number | null;
    NULLABLE: string;
    COLUMN_ID: number;
  }>(sql, binds);

  return (result.rows ?? []).map((r) => ({
    columnName: r.COLUMN_NAME,
    dataType: r.DATA_TYPE,
    dataLength: r.DATA_LENGTH ?? null,
    nullable: r.NULLABLE === "Y",
    columnId: r.COLUMN_ID,
  }));
}
