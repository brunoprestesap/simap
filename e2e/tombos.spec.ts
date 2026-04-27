import { test, expect } from "@playwright/test";
import { loginAs, getTomboDisponivel } from "./helpers";

test.describe("Tombos", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "AP20151");
    await page.goto("/tombos");
  });

  test("deve exibir heading Tombos", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Tombos" }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("deve buscar tombo por número e exibir resultado", async ({ page }) => {
    const numero = await getTomboDisponivel();
    expect(numero, "Nenhum tombo no banco").toBeTruthy();

    const searchInput = page.getByPlaceholder(/buscar|pesquisar|tombo/i);
    await expect(searchInput).toBeVisible({ timeout: 8_000 });
    await searchInput.fill(numero!);

    await expect(page.getByRole("cell", { name: numero! })).toBeVisible({ timeout: 8_000 });
  });
});

test.describe("Tombos — controle de acesso", () => {
  test("deve redirecionar GESTOR_ADMIN para /home", async ({ page }) => {
    await loginAs(page, "AP20159");
    await page.goto("/tombos");
    await expect(page).toHaveURL(/\/home/, { timeout: 10_000 });
  });

  test("deve redirecionar SERVIDOR_RESPONSAVEL para /home", async ({ page }) => {
    await loginAs(page, "AP20153");
    await page.goto("/tombos");
    await expect(page).toHaveURL(/\/home/, { timeout: 10_000 });
  });
});
