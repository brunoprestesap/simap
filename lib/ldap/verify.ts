import { InvalidCredentialsError } from "ldapts";
import { buildSearchFilter } from "@/lib/ldap/filter";
import { getLdapBindConfig, normalizeUsernameForLdap } from "@/lib/ldap/config";
import { createLdapClient } from "@/lib/ldap/client";
import { pickDisplayNameFromEntry } from "@/lib/ldap/entry-attr";

export type LdapAuthenticateResult =
  | { ok: true; displayName: string | null }
  | { ok: false };

/**
 * Autentica no AD e devolve nome do diretório para provisionamento no primeiro login.
 */
export async function authenticateLdap(
  matricula: string,
  password: string,
): Promise<LdapAuthenticateResult> {
  const ldapCfg = getLdapBindConfig();
  if (!ldapCfg) return { ok: false };

  const loginUser = normalizeUsernameForLdap(matricula);
  let filter: string;
  try {
    filter = buildSearchFilter(ldapCfg.searchFilterTemplate, loginUser);
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.error("[LDAP] filtro inválido:", e);
    }
    return { ok: false };
  }

  const client = createLdapClient();
  try {
    await client.bind(ldapCfg.bindDn, ldapCfg.bindPassword);

    const { searchEntries } = await client.search(ldapCfg.searchBase, {
      scope: "sub",
      filter,
      attributes: ["dn", "displayName", "cn", "givenName", "sn"],
      sizeLimit: 2,
    });

    if (searchEntries.length !== 1) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[LDAP] busca por matrícula não retornou exatamente uma entrada:",
          loginUser,
          "count=",
          searchEntries.length,
        );
      }
      return { ok: false };
    }

    const entry = searchEntries[0];
    const displayName = pickDisplayNameFromEntry(entry);
    const userDn = entry.dn;
    await client.bind(userDn, password);
    return { ok: true, displayName };
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      if (err instanceof InvalidCredentialsError) {
        console.warn("[LDAP] credenciais inválidas (bind usuário ou serviço)");
      } else {
        console.warn("[LDAP] erro na verificação:", err);
      }
    }
    return { ok: false };
  } finally {
    await client.unbind().catch(() => {});
  }
}

/**
 * Valida matrícula + senha contra o AD (busca com conta de serviço + bind do usuário).
 */
export async function verifyLdapPassword(
  matricula: string,
  password: string,
): Promise<boolean> {
  const r = await authenticateLdap(matricula, password);
  return r.ok;
}
