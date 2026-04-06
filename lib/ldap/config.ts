import type { PerfilUsuario } from "@/lib/generated/prisma/client";

const PERFIS_VALIDOS: PerfilUsuario[] = [
  "TECNICO_TI",
  "SERVIDOR_RESPONSAVEL",
  "SERVIDOR_SEMAP",
  "GESTOR_ADMIN",
];

let warnedMissingLdapInDev = false;

export function isLdapConfigured(): boolean {
  return Boolean(process.env.LDAP_URL?.trim());
}

export function warnDevIfLdapDisabled(): void {
  if (
    process.env.NODE_ENV === "development" &&
    !isLdapConfigured() &&
    !warnedMissingLdapInDev
  ) {
    warnedMissingLdapInDev = true;
    console.warn(
      "[AUTH] LDAP_URL não definido — login aceita qualquer senha para usuários ativos no banco (apenas desenvolvimento).",
    );
  }
}

export type LdapUsernameCase = "upper" | "lower" | "none";

export function normalizeUsernameForLdap(matricula: string): string {
  const trimmed = matricula.trim();
  const mode = (process.env.LDAP_USERNAME_CASE ?? "upper") as LdapUsernameCase;
  if (mode === "lower") return trimmed.toLowerCase();
  if (mode === "none") return trimmed;
  return trimmed.toUpperCase();
}

export function getLdapBindConfig(): {
  url: string;
  bindDn: string;
  bindPassword: string;
  searchBase: string;
  searchFilterTemplate: string;
} | null {
  const url = process.env.LDAP_URL?.trim() ?? "";
  if (!url) return null;

  const bindDn = process.env.LDAP_BIND_DN?.trim() ?? "";
  const bindPassword = process.env.LDAP_BIND_PASSWORD ?? "";
  const searchBase = process.env.LDAP_SEARCH_BASE?.trim() ?? "";
  const searchFilterTemplate =
    process.env.LDAP_SEARCH_FILTER?.trim() ??
    "(sAMAccountName={{username}})";

  if (!bindDn || !searchBase) {
    if (process.env.NODE_ENV === "development") {
      console.error(
        "[LDAP] LDAP_URL definido mas faltam LDAP_BIND_DN ou LDAP_SEARCH_BASE",
      );
    }
    return null;
  }

  return {
    url,
    bindDn,
    bindPassword,
    searchBase,
    searchFilterTemplate,
  };
}

export function getLdapClientTimeouts(): {
  timeout: number;
  connectTimeout: number;
} {
  const timeoutMs = Number(process.env.LDAP_TIMEOUT_MS ?? "10000");
  const connectTimeoutMs = Number(
    process.env.LDAP_CONNECT_TIMEOUT_MS ?? "8000",
  );
  return {
    timeout: Number.isFinite(timeoutMs) ? timeoutMs : 10000,
    connectTimeout: Number.isFinite(connectTimeoutMs) ? connectTimeoutMs : 8000,
  };
}

export function getLdapTlsRejectUnauthorized(): boolean {
  const raw = process.env.LDAP_TLS_REJECT_UNAUTHORIZED;
  if (raw === undefined || raw === "") return true;
  return raw !== "false" && raw !== "0";
}

/** Perfil atribuído ao criar `Usuario` no primeiro login (LDAP). */
export function getLdapDefaultProvisionPerfil(): PerfilUsuario {
  const raw = process.env.LDAP_DEFAULT_PROVISION_PERFIL?.trim();
  if (raw && PERFIS_VALIDOS.includes(raw as PerfilUsuario)) {
    return raw as PerfilUsuario;
  }
  return "SERVIDOR_RESPONSAVEL";
}
