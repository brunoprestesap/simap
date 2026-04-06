import { describe, it, expect, afterEach, vi } from "vitest";
import { getLdapDefaultProvisionPerfil } from "@/lib/ldap/config";

describe("getLdapDefaultProvisionPerfil", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("retorna SERVIDOR_RESPONSAVEL por padrão", () => {
    vi.stubEnv("LDAP_DEFAULT_PROVISION_PERFIL", undefined);
    expect(getLdapDefaultProvisionPerfil()).toBe("SERVIDOR_RESPONSAVEL");
  });

  it("aceita perfil válido da env", () => {
    vi.stubEnv("LDAP_DEFAULT_PROVISION_PERFIL", "TECNICO_TI");
    expect(getLdapDefaultProvisionPerfil()).toBe("TECNICO_TI");
  });

  it("ignora valor inválido e usa padrão", () => {
    vi.stubEnv("LDAP_DEFAULT_PROVISION_PERFIL", "INVALIDO");
    expect(getLdapDefaultProvisionPerfil()).toBe("SERVIDOR_RESPONSAVEL");
  });
});
