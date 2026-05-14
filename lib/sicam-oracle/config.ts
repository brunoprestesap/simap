import { logger } from "@/lib/logger";

export interface SicamOracleConfig {
  user: string;
  password: string;
  connectString: string;
  poolMin: number;
  poolMax: number;
  poolIncrement: number;
  poolTimeout: number;
  queryTimeoutMs: number;
  schemaOwner: string | null;
  /**
   * Caminho para o Oracle Instant Client. Quando definido, o driver inicializa
   * em **Thick mode** (necessário para autenticar contra Oracle com password
   * verifier legado 10G — erro NJS-116). Se null/undefined, opera em Thin mode.
   */
  instantClientDir: string | null;
  /**
   * Diretório com sqlnet.ora/tnsnames.ora dedicado ao SIMAP. Isola o app do
   * TNS_ADMIN global do sistema (que pode estar configurado para outras apps).
   * Default em produção: deploy/oracle-config relativo ao cwd.
   */
  configDir: string | null;
}

const DEFAULTS = {
  poolMin: 1,
  poolMax: 4,
  poolIncrement: 1,
  poolTimeout: 60,
  queryTimeoutMs: 5000,
} as const;

function readNumber(
  raw: string | undefined,
  fallback: number,
  min: number,
): number {
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min) return fallback;
  return Math.floor(n);
}

export function isSicamOracleConfigured(): boolean {
  return Boolean(
    process.env.SICAM_ORACLE_USER?.trim() &&
      process.env.SICAM_ORACLE_PASSWORD &&
      process.env.SICAM_ORACLE_CONNECT_STRING?.trim(),
  );
}

export function getSicamOracleConfig(): SicamOracleConfig | null {
  const user = process.env.SICAM_ORACLE_USER?.trim() ?? "";
  const password = process.env.SICAM_ORACLE_PASSWORD ?? "";
  const connectString = process.env.SICAM_ORACLE_CONNECT_STRING?.trim() ?? "";

  if (!user || !password || !connectString) {
    if (
      process.env.SICAM_ORACLE_USER ||
      process.env.SICAM_ORACLE_PASSWORD ||
      process.env.SICAM_ORACLE_CONNECT_STRING
    ) {
      logger.warn(
        { module: "sicam-oracle" },
        "SICAM Oracle parcialmente configurado — defina SICAM_ORACLE_USER, SICAM_ORACLE_PASSWORD e SICAM_ORACLE_CONNECT_STRING.",
      );
    }
    return null;
  }

  const poolMin = readNumber(process.env.SICAM_ORACLE_POOL_MIN, DEFAULTS.poolMin, 0);
  const poolMaxRaw = readNumber(
    process.env.SICAM_ORACLE_POOL_MAX,
    DEFAULTS.poolMax,
    1,
  );
  const poolMax = Math.max(poolMaxRaw, poolMin || 1);
  const poolIncrement = readNumber(
    process.env.SICAM_ORACLE_POOL_INCREMENT,
    DEFAULTS.poolIncrement,
    1,
  );
  const poolTimeout = readNumber(
    process.env.SICAM_ORACLE_POOL_TIMEOUT,
    DEFAULTS.poolTimeout,
    0,
  );
  const queryTimeoutMs = readNumber(
    process.env.SICAM_ORACLE_QUERY_TIMEOUT_MS,
    DEFAULTS.queryTimeoutMs,
    100,
  );

  const schemaOwner = process.env.SICAM_ORACLE_SCHEMA_OWNER?.trim()?.toUpperCase() || null;
  const instantClientDir =
    process.env.SICAM_ORACLE_INSTANT_CLIENT_DIR?.trim() || null;
  const configDir = process.env.SICAM_ORACLE_CONFIG_DIR?.trim() || null;

  return {
    user,
    password,
    connectString,
    poolMin,
    poolMax,
    poolIncrement,
    poolTimeout,
    queryTimeoutMs,
    schemaOwner,
    instantClientDir,
    configDir,
  };
}

export function describeSicamOracleConfigForUi():
  | { configured: false; missingVars: string[] }
  | {
      configured: true;
      user: string;
      connectString: string;
      poolMin: number;
      poolMax: number;
      schemaOwner: string | null;
      driverMode: "thin" | "thick";
      instantClientDir: string | null;
      configDir: string | null;
    } {
  const cfg = getSicamOracleConfig();
  if (!cfg) {
    const missingVars: string[] = [];
    if (!process.env.SICAM_ORACLE_USER?.trim()) missingVars.push("SICAM_ORACLE_USER");
    if (!process.env.SICAM_ORACLE_PASSWORD) missingVars.push("SICAM_ORACLE_PASSWORD");
    if (!process.env.SICAM_ORACLE_CONNECT_STRING?.trim()) missingVars.push("SICAM_ORACLE_CONNECT_STRING");
    return { configured: false, missingVars };
  }
  return {
    configured: true,
    user: cfg.user,
    connectString: cfg.connectString,
    poolMin: cfg.poolMin,
    poolMax: cfg.poolMax,
    schemaOwner: cfg.schemaOwner,
    driverMode: cfg.instantClientDir ? "thick" : "thin",
    instantClientDir: cfg.instantClientDir,
    configDir: cfg.configDir,
  };
}
