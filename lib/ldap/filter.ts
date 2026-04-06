/**
 * RFC 4515 — escape valores dentro de filtros LDAP (mitiga injeção de filtro).
 */
export function escapeLdapFilter(value: string): string {
  return value
    .replaceAll("\\", "\\5c")
    .replaceAll("*", "\\2a")
    .replaceAll("(", "\\28")
    .replaceAll(")", "\\29")
    .replaceAll("\0", "\\00");
}

export function buildSearchFilter(
  template: string,
  loginUsername: string,
): string {
  const token = "{{username}}";
  if (!template.includes(token)) {
    throw new Error(
      `LDAP_SEARCH_FILTER deve conter o placeholder "${token}" (ex.: (sAMAccountName={{username}}))`,
    );
  }
  const safe = escapeLdapFilter(loginUsername);
  return template.replaceAll(token, safe);
}
