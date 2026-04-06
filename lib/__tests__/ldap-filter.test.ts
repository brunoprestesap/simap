import { describe, it, expect } from "vitest";
import { escapeLdapFilter, buildSearchFilter } from "@/lib/ldap/filter";

describe("escapeLdapFilter", () => {
  it("escapa caracteres especiais RFC 4515", () => {
    expect(escapeLdapFilter("foo*bar")).toBe("foo\\2abar");
    expect(escapeLdapFilter("a)b")).toBe("a\\29b");
    expect(escapeLdapFilter("x(y")).toBe("x\\28y");
    expect(escapeLdapFilter("b\\ack")).toBe("b\\5cack");
  });
});

describe("buildSearchFilter", () => {
  it("substitui {{username}} com valor escapado", () => {
    expect(
      buildSearchFilter("(sAMAccountName={{username}})", "AP*01"),
    ).toBe("(sAMAccountName=AP\\2a01)");
  });

  it("exige placeholder {{username}}", () => {
    expect(() => buildSearchFilter("(uid=x)", "a")).toThrow(
      'LDAP_SEARCH_FILTER deve conter o placeholder "{{username}}"',
    );
  });
});
