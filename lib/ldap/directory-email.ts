import { buildSearchFilter } from "@/lib/ldap/filter";
import {
  getLdapBindConfig,
  isLdapConfigured,
  normalizeUsernameForLdap,
} from "@/lib/ldap/config";
import { createLdapClient } from "@/lib/ldap/client";
import { pickMailFromEntry } from "@/lib/ldap/entry-attr";

/**
 * Obtém e-mail (mail ou userPrincipalName) no diretório para a matrícula.
 * Retorna null se LDAP indisponível, filtro inválido ou entrada sem mail.
 */
export async function findDirectoryEmailByMatricula(
  matricula: string,
): Promise<string | null> {
  if (!isLdapConfigured()) return null;

  const ldapCfg = getLdapBindConfig();
  if (!ldapCfg) return null;

  const loginUser = normalizeUsernameForLdap(matricula);
  let filter: string;
  try {
    filter = buildSearchFilter(ldapCfg.searchFilterTemplate, loginUser);
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.error("[LDAP] filtro e-mail:", e);
    }
    return null;
  }

  const client = createLdapClient();
  try {
    await client.bind(ldapCfg.bindDn, ldapCfg.bindPassword);
    const { searchEntries } = await client.search(ldapCfg.searchBase, {
      scope: "sub",
      filter,
      attributes: ["mail", "userPrincipalName"],
      sizeLimit: 2,
    });
    if (searchEntries.length !== 1) return null;
    return pickMailFromEntry(searchEntries[0]);
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[LDAP] falha ao buscar e-mail:", matricula, err);
    }
    return null;
  } finally {
    await client.unbind().catch(() => {});
  }
}
