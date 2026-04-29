import { buildSearchFilter } from "@/lib/ldap/filter";
import {
  getLdapBindConfig,
  isLdapConfigured,
  normalizeUsernameForLdap,
} from "@/lib/ldap/config";
import { createLdapClient } from "@/lib/ldap/client";
import { pickMailFromEntry } from "@/lib/ldap/entry-attr";
import { ldapLogger } from "@/lib/logger";

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
    ldapLogger.error({ err: e }, "filtro e-mail inválido");
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
    ldapLogger.warn({ matricula, err }, "falha ao buscar e-mail");
    return null;
  } finally {
    await client.unbind().catch(() => {});
  }
}
