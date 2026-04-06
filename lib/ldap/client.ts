import { Client } from "ldapts";
import {
  getLdapBindConfig,
  getLdapClientTimeouts,
  getLdapTlsRejectUnauthorized,
} from "@/lib/ldap/config";

export function createLdapClient(): Client {
  const cfg = getLdapBindConfig();
  if (!cfg) {
    throw new Error("LDAP não configurado");
  }
  const { timeout, connectTimeout } = getLdapClientTimeouts();
  const rejectUnauthorized = getLdapTlsRejectUnauthorized();

  return new Client({
    url: cfg.url,
    timeout,
    connectTimeout,
    tlsOptions: {
      rejectUnauthorized,
      minVersion: "TLSv1.2",
    },
  });
}
