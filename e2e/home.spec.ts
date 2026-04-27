import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("Home — TECNICO_TI", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "AP20151");
  });

  test("deve exibir saudação com primeiro nome", async ({ page }) => {
    await expect(page.getByText("Olá, Carlos")).toBeVisible({ timeout: 10_000 });
  });

  test("deve exibir ação rápida de Registrar saída", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: /Registrar saída/i }),
    ).toBeVisible();
  });

  test("deve exibir card de Movimentações recentes", async ({ page }) => {
    await expect(page.getByText("Movimentações recentes")).toBeVisible({
      timeout: 10_000,
    });
  });
});

test.describe("Home — SERVIDOR_RESPONSAVEL", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "AP20153");
  });

  test("deve exibir saudação com primeiro nome", async ({ page }) => {
    await expect(page.getByText("Olá, Roberto")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("deve exibir link para Meus Patrimônios", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: /Patrimônios|Meus Patrimônios/i }).first(),
    ).toBeVisible();
  });

  test("deve exibir KPI de Pendentes de confirmação", async ({ page }) => {
    await expect(page.getByText("Pendentes de confirmação")).toBeVisible({
      timeout: 10_000,
    });
  });
});

test.describe("Home — SERVIDOR_SEMAP", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "AP20157");
  });

  test("deve exibir saudação com primeiro nome", async ({ page }) => {
    await expect(page.getByText("Olá, Fernando")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("deve exibir link para Backlog SEMAP", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: /Backlog SEMAP|Backlog/i }).first(),
    ).toBeVisible();
  });
});

test.describe("Home — GESTOR_ADMIN", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "AP20159");
  });

  test("deve exibir saudação com primeiro nome", async ({ page }) => {
    await expect(page.getByText("Olá, Ricardo")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("deve exibir link para Dashboard", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: /Dashboard/i }).first(),
    ).toBeVisible();
  });

  test("deve exibir link para Backlog", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: /Backlog/i }).first(),
    ).toBeVisible();
  });
});
