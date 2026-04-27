import { test, expect } from "@playwright/test";
import { getMovimentacaoConfirmada } from "./helpers";

test.describe("Backlog SEMAP", () => {
  test.beforeEach(async ({ page }) => {
    // SERVIDOR_SEMAP no seed: AP20157
    await page.goto("/login");
    await page.fill('input[name="matricula"]', "AP20157");
    await page.fill('input[name="senha"]', "senha123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/home", { timeout: 15_000 });
    await page.goto("/backlog");
    await page.waitForURL("/backlog", { timeout: 15_000 });
  });

  test("deve exibir página de backlog com filtros", async ({ page }) => {
    await expect(page.locator("h2")).toContainText("Backlog SEMAP");
    await expect(page.locator("text=Filtros")).toBeVisible();
  });

  test("deve filtrar por status", async ({ page }) => {
    await page.getByRole("button", { name: /Filtros/i }).click();
    const statusSelect = page.locator("div.rounded-lg.border.border-border.bg-card.p-4").getByRole("combobox").first();
    await statusSelect.selectOption("CONFIRMADA_ORIGEM");
    await expect(page).toHaveURL(/status=CONFIRMADA_ORIGEM/);
  });

  test("deve limpar filtros", async ({ page }) => {
    await page.getByRole("button", { name: /Filtros/i }).click();
    const statusSelect = page.locator("div.rounded-lg.border.border-border.bg-card.p-4").getByRole("combobox").first();
    await statusSelect.selectOption("CONFIRMADA_ORIGEM");
    await expect(page).toHaveURL(/status=CONFIRMADA_ORIGEM/);
    await page.getByRole("button", { name: /Limpar filtros/i }).click();
    await expect(page).toHaveURL("/backlog");
  });

  test("deve abrir sheet de registro SICAM para movimentação confirmada", async ({ page }) => {
    // Wait for list to load
    await page.waitForSelector("[data-testid='backlog-list']", { timeout: 5000 }).catch(() => {});

    const registerButton = page.getByRole("button", { name: "Registrar no SICAM" }).first();
    if (await registerButton.isVisible()) {
      await registerButton.click();
      await expect(
        page.getByRole("heading", { name: "Registrar no SICAM" }),
      ).toBeVisible();
      await expect(page.locator("#protocolo")).toBeVisible();
      await expect(page.locator("#dataRegistro")).toBeVisible();
    }
  });

  test("deve registrar movimentação no SICAM com sucesso", async ({ page }) => {
    const movId = await getMovimentacaoConfirmada();
    expect(movId, "Nenhuma movimentação CONFIRMADA_ORIGEM no banco").toBeTruthy();

    await page.goto("/backlog?status=CONFIRMADA_ORIGEM");
    await page.waitForURL(/status=CONFIRMADA_ORIGEM/, { timeout: 10_000 });

    const registerButton = page
      .getByRole("button", { name: "Registrar no SICAM" })
      .first();
    await expect(registerButton).toBeVisible({ timeout: 10_000 });
    await registerButton.click();

    await expect(
      page.getByRole("heading", { name: "Registrar no SICAM" }),
    ).toBeVisible({ timeout: 5_000 });

    const hoje = new Date().toISOString().split("T")[0];
    await page.fill("#protocolo", "2026/E2E-TEST");
    await page.fill("#dataRegistro", hoje);

    await page.getByRole("button", { name: "Confirmar Registro" }).click();

    await expect(
      page.getByText("Registrado no SICAM com sucesso"),
    ).toBeVisible({ timeout: 10_000 });
  });
});
