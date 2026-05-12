import "server-only";
import oracledb, {
  type BindParameters,
  type Connection,
  type ExecuteOptions,
  type Pool,
  type Result,
} from "oracledb";
import { logger } from "@/lib/logger";
import { getSicamOracleConfig, isSicamOracleConfigured } from "./config";
import { SicamOracleError, wrapSicamOracleError } from "./errors";
import { assertSafeOracleIdentifier } from "./identifier";

// Pool em escopo de módulo + globalThis (Next.js Turbopack pode reusar o módulo
// durante HMR; o globalThis preserva o pool e evita esgotar conexões no Oracle).
const globalForSicam = globalThis as unknown as {
  __sicamOraclePool?: Pool | undefined;
  __sicamOraclePoolPromise?: Promise<Pool> | undefined;
  __sicamOracleThickInitialized?: boolean | undefined;
};

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.autoCommit = false;
oracledb.fetchAsString = [oracledb.CLOB];

const sicamLogger = logger.child({ module: "sicam-oracle" });

function ensureThickModeInitialized(
  instantClientDir: string,
  configDir: string | null,
): void {
  // initOracleClient é process-wide e idempotente: chamar duas vezes com o
  // mesmo libDir é OK, mas com libDir diferente lança DPI-1047. Por isso o flag.
  if (globalForSicam.__sicamOracleThickInitialized) return;
  try {
    // configDir isola o SIMAP do TNS_ADMIN global do sistema. Sem ele, qualquer
    // sqlnet.ora externo (wallet, SSL, NAMES.DIRECTORY_PATH) pode interferir e
    // quebrar a resolução do Easy Connect (ORA-12154).
    oracledb.initOracleClient({
      libDir: instantClientDir,
      ...(configDir ? { configDir } : {}),
    });
    globalForSicam.__sicamOracleThickInitialized = true;
    sicamLogger.info(
      { instantClientDir, configDir: configDir ?? "<usando TNS_ADMIN do sistema>" },
      "Oracle Instant Client carregado (Thick mode)",
    );
  } catch (e) {
    throw wrapSicamOracleError(
      `Falha ao carregar Oracle Instant Client em "${instantClientDir}". Verifique o caminho e a arquitetura (x64).`,
      e,
    );
  }
}

type SessionCallback = (
  connection: Connection,
  requestedTag: string,
  callback: (error?: unknown) => void,
) => void;

function buildCurrentSchemaCallback(schemaOwner: string): SessionCallback {
  // Validação aqui evita injection se SICAM_ORACLE_SCHEMA_OWNER for alterado
  // por um operador descuidado para algo não-identificador.
  const safeOwner = assertSafeOracleIdentifier(schemaOwner, "schemaOwner");
  const sql = `ALTER SESSION SET CURRENT_SCHEMA = "${safeOwner}"`;

  return (connection, _requestedTag, cb) => {
    connection
      .execute(sql)
      .then(() => cb())
      .catch((err: unknown) => {
        sicamLogger.error(
          { err, schemaOwner: safeOwner },
          "Falha ao setar CURRENT_SCHEMA na sessão SICAM Oracle",
        );
        cb(err);
      });
  };
}

async function createPool(): Promise<Pool> {
  const cfg = getSicamOracleConfig();
  if (!cfg) {
    throw new SicamOracleError(
      "SICAM Oracle não configurado (SICAM_ORACLE_USER/PASSWORD/CONNECT_STRING ausentes).",
    );
  }

  if (cfg.instantClientDir) {
    ensureThickModeInitialized(cfg.instantClientDir, cfg.configDir);
  }

  // sessionCallback roda a cada getConnection() em Thick mode. Como o ALTER
  // SESSION é idempotente e barato (sub-ms), aceita-se o overhead para evitar
  // o trabalho de tagging. Em Thin mode o callback é ignorado pelo driver.
  const schemaOwner = cfg.schemaOwner;
  const sessionCallback = schemaOwner
    ? buildCurrentSchemaCallback(schemaOwner)
    : undefined;

  try {
    const pool = await oracledb.createPool({
      user: cfg.user,
      password: cfg.password,
      connectString: cfg.connectString,
      poolMin: cfg.poolMin,
      poolMax: cfg.poolMax,
      poolIncrement: cfg.poolIncrement,
      poolTimeout: cfg.poolTimeout,
      poolAlias: "sicam",
      ...(sessionCallback ? { sessionCallback } : {}),
    });
    sicamLogger.info(
      {
        connectString: cfg.connectString,
        user: cfg.user,
        poolMin: cfg.poolMin,
        poolMax: cfg.poolMax,
      },
      "Pool SICAM Oracle inicializado",
    );
    return pool;
  } catch (e) {
    throw wrapSicamOracleError("Falha ao abrir pool do SICAM Oracle.", e);
  }
}

export async function getSicamOraclePool(): Promise<Pool> {
  if (globalForSicam.__sicamOraclePool) return globalForSicam.__sicamOraclePool;
  if (globalForSicam.__sicamOraclePoolPromise)
    return globalForSicam.__sicamOraclePoolPromise;

  const promise = createPool()
    .then((pool) => {
      globalForSicam.__sicamOraclePool = pool;
      globalForSicam.__sicamOraclePoolPromise = undefined;
      return pool;
    })
    .catch((err) => {
      globalForSicam.__sicamOraclePoolPromise = undefined;
      throw err;
    });

  globalForSicam.__sicamOraclePoolPromise = promise;
  return promise;
}

export async function closeSicamOraclePool(): Promise<void> {
  const pool = globalForSicam.__sicamOraclePool;
  if (!pool) return;
  globalForSicam.__sicamOraclePool = undefined;
  try {
    await pool.close(10);
    sicamLogger.info("Pool SICAM Oracle fechado");
  } catch (e) {
    sicamLogger.error({ err: e }, "Erro ao fechar pool SICAM Oracle");
  }
}

export interface SicamQueryOptions extends ExecuteOptions {
  /** Override do timeout padrão em ms (config SICAM_ORACLE_QUERY_TIMEOUT_MS). */
  timeoutMs?: number;
}

export async function executeSicamQuery<T = Record<string, unknown>>(
  sql: string,
  binds: BindParameters = {},
  options: SicamQueryOptions = {},
): Promise<Result<T>> {
  if (!isSicamOracleConfigured()) {
    throw new SicamOracleError("SICAM Oracle não configurado.");
  }

  const cfg = getSicamOracleConfig();
  const timeoutMs = options.timeoutMs ?? cfg?.queryTimeoutMs ?? 5000;

  const pool = await getSicamOraclePool();
  const conn = await pool.getConnection();
  try {
    conn.callTimeout = timeoutMs;
    const { timeoutMs: _omit, ...execOptions } = options;
    const result = await conn.execute<T>(sql, binds, execOptions);
    return result;
  } catch (e) {
    sicamLogger.warn({ err: e, sql: trimSql(sql) }, "Falha na consulta SICAM Oracle");
    throw wrapSicamOracleError("Falha ao consultar SICAM Oracle.", e);
  } finally {
    try {
      await conn.close();
    } catch (releaseErr) {
      sicamLogger.error(
        { err: releaseErr },
        "Falha ao devolver conexão ao pool SICAM Oracle",
      );
    }
  }
}

function trimSql(sql: string): string {
  return sql.replace(/\s+/g, " ").trim().slice(0, 200);
}
