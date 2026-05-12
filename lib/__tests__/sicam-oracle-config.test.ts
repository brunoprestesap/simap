import { describe, it, expect, afterEach, vi } from "vitest";
import {
  getSicamOracleConfig,
  isSicamOracleConfigured,
} from "@/lib/sicam-oracle/config";

function stubFullConfig() {
  vi.stubEnv("SICAM_ORACLE_USER", "simap_ro");
  vi.stubEnv("SICAM_ORACLE_PASSWORD", "pwd-123");
  vi.stubEnv("SICAM_ORACLE_CONNECT_STRING", "oradb.jfap.intra:1521/SICAM");
}

describe("getSicamOracleConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("retorna null quando não há credenciais", () => {
    vi.stubEnv("SICAM_ORACLE_USER", undefined);
    vi.stubEnv("SICAM_ORACLE_PASSWORD", undefined);
    vi.stubEnv("SICAM_ORACLE_CONNECT_STRING", undefined);
    expect(getSicamOracleConfig()).toBeNull();
    expect(isSicamOracleConfigured()).toBe(false);
  });

  it("retorna null e loga se configuração parcial (apenas user)", () => {
    vi.stubEnv("SICAM_ORACLE_USER", "simap_ro");
    vi.stubEnv("SICAM_ORACLE_PASSWORD", undefined);
    vi.stubEnv("SICAM_ORACLE_CONNECT_STRING", undefined);
    expect(getSicamOracleConfig()).toBeNull();
    expect(isSicamOracleConfigured()).toBe(false);
  });

  it("retorna config completo com defaults", () => {
    stubFullConfig();
    const cfg = getSicamOracleConfig();
    expect(cfg).not.toBeNull();
    expect(cfg!.user).toBe("simap_ro");
    expect(cfg!.connectString).toBe("oradb.jfap.intra:1521/SICAM");
    expect(cfg!.poolMin).toBe(1);
    expect(cfg!.poolMax).toBe(4);
    expect(cfg!.poolIncrement).toBe(1);
    expect(cfg!.poolTimeout).toBe(60);
    expect(cfg!.queryTimeoutMs).toBe(5000);
    expect(cfg!.schemaOwner).toBeNull();
  });

  it("aplica overrides numéricos válidos", () => {
    stubFullConfig();
    vi.stubEnv("SICAM_ORACLE_POOL_MIN", "2");
    vi.stubEnv("SICAM_ORACLE_POOL_MAX", "8");
    vi.stubEnv("SICAM_ORACLE_QUERY_TIMEOUT_MS", "9000");
    const cfg = getSicamOracleConfig();
    expect(cfg!.poolMin).toBe(2);
    expect(cfg!.poolMax).toBe(8);
    expect(cfg!.queryTimeoutMs).toBe(9000);
  });

  it("garante poolMax >= poolMin mesmo quando env inverte os valores", () => {
    stubFullConfig();
    vi.stubEnv("SICAM_ORACLE_POOL_MIN", "10");
    vi.stubEnv("SICAM_ORACLE_POOL_MAX", "3");
    const cfg = getSicamOracleConfig();
    expect(cfg!.poolMin).toBe(10);
    expect(cfg!.poolMax).toBeGreaterThanOrEqual(cfg!.poolMin);
  });

  it("ignora valores numéricos inválidos e usa default", () => {
    stubFullConfig();
    vi.stubEnv("SICAM_ORACLE_QUERY_TIMEOUT_MS", "abc");
    const cfg = getSicamOracleConfig();
    expect(cfg!.queryTimeoutMs).toBe(5000);
  });

  it("normaliza schemaOwner em uppercase", () => {
    stubFullConfig();
    vi.stubEnv("SICAM_ORACLE_SCHEMA_OWNER", "sicam");
    const cfg = getSicamOracleConfig();
    expect(cfg!.schemaOwner).toBe("SICAM");
  });

  it("instantClientDir é null por padrão (Thin mode)", () => {
    stubFullConfig();
    vi.stubEnv("SICAM_ORACLE_INSTANT_CLIENT_DIR", undefined);
    const cfg = getSicamOracleConfig();
    expect(cfg!.instantClientDir).toBeNull();
  });

  it("instantClientDir é preservado quando definido (Thick mode)", () => {
    stubFullConfig();
    vi.stubEnv(
      "SICAM_ORACLE_INSTANT_CLIENT_DIR",
      "C:\\oracle\\instantclient_23_4",
    );
    const cfg = getSicamOracleConfig();
    expect(cfg!.instantClientDir).toBe("C:\\oracle\\instantclient_23_4");
  });

  it("ignora instantClientDir vazio ou só espaços", () => {
    stubFullConfig();
    vi.stubEnv("SICAM_ORACLE_INSTANT_CLIENT_DIR", "   ");
    const cfg = getSicamOracleConfig();
    expect(cfg!.instantClientDir).toBeNull();
  });

  it("configDir é null por padrão", () => {
    stubFullConfig();
    vi.stubEnv("SICAM_ORACLE_CONFIG_DIR", undefined);
    const cfg = getSicamOracleConfig();
    expect(cfg!.configDir).toBeNull();
  });

  it("configDir é preservado para isolar TNS_ADMIN do sistema", () => {
    stubFullConfig();
    vi.stubEnv(
      "SICAM_ORACLE_CONFIG_DIR",
      "C:\\projetos\\simap\\deploy\\oracle-config",
    );
    const cfg = getSicamOracleConfig();
    expect(cfg!.configDir).toBe(
      "C:\\projetos\\simap\\deploy\\oracle-config",
    );
  });

  it("isSicamOracleConfigured retorna true com config completo", () => {
    stubFullConfig();
    expect(isSicamOracleConfigured()).toBe(true);
  });
});
