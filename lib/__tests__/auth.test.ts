import { describe, it, expect } from "vitest";
import { getHomeByPerfil } from "@/lib/profile-home";

describe("getHomeByPerfil", () => {
  it("deve redirecionar TECNICO_TI para /home", () => {
    expect(getHomeByPerfil("TECNICO_TI")).toBe("/home");
  });

  it("deve redirecionar SERVIDOR_RESPONSAVEL para /home", () => {
    expect(getHomeByPerfil("SERVIDOR_RESPONSAVEL")).toBe("/home");
  });

  it("deve redirecionar SERVIDOR_SEMAP para /home", () => {
    expect(getHomeByPerfil("SERVIDOR_SEMAP")).toBe("/home");
  });

  it("deve redirecionar GESTOR_ADMIN para /home", () => {
    expect(getHomeByPerfil("GESTOR_ADMIN")).toBe("/home");
  });
});
