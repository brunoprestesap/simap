import type { Entry } from "ldapts";

function bufferToString(v: Buffer | string): string {
  return Buffer.isBuffer(v) ? v.toString("utf8") : v;
}

/** Primeiro valor legível de um atributo em Entry (ldapts). */
export function firstEntryAttribute(
  entry: Entry,
  name: string,
): string | null {
  const v = entry[name];
  if (v == null) return null;
  if (typeof v === "string") return v || null;
  if (Buffer.isBuffer(v)) {
    const s = v.toString("utf8");
    return s || null;
  }
  if (Array.isArray(v) && v.length > 0) {
    const first = v[0];
    const s = bufferToString(first as Buffer | string);
    return s || null;
  }
  return null;
}

export function pickMailFromEntry(entry: Entry): string | null {
  const mail = firstEntryAttribute(entry, "mail");
  if (mail) return mail;
  const upn = firstEntryAttribute(entry, "userPrincipalName");
  if (upn && upn.includes("@")) return upn;
  return null;
}

/** Nome amigável para provisionamento (AD costuma expor displayName ou cn). */
export function pickDisplayNameFromEntry(entry: Entry): string | null {
  const display = firstEntryAttribute(entry, "displayName");
  if (display) return display;
  const cn = firstEntryAttribute(entry, "cn");
  if (cn) return cn;
  const gn = firstEntryAttribute(entry, "givenName");
  const sn = firstEntryAttribute(entry, "sn");
  if (gn || sn) {
    const full = [gn, sn].filter(Boolean).join(" ").trim();
    if (full) return full;
  }
  return null;
}
