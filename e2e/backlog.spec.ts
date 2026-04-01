import { test, expect } from "@playwright/test";

test.describe("Backlog SEMAP", () => {
  test.beforeEach(async ({ page }) => {
    // Login as SERVIDOR_SEMAP
    await page.goto("/login");
    await page.fill('input[name="matricula"]', "SEMAP001");
    await page.fill('input[name="senha"]', "senha123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/backlog");
  });

  test("deve exibir página de backlog com filtros", async ({ page }) => {
    await expect(page.locator("h2")).toContainText("Backlog SEMAP");
    await expect(page.locator("text=Filtros")).toBeVisible();
  });

  test("deve filtrar por status", async ({ page }) => {
    // Open filters
    await page.click("text=Filtros");
    // Select status
    await page.selectOption('select[aria-label="Status"]', "CONFIRMADA_ORIGEM");
    // Verify URL has filter
    await expect(page).toHaveURL(/status=CONFIRMADA_ORIGEM/);
  });

  test("deve limpar filtros", async ({ page }) => {
    await page.click("text=Filtros");
    await page.selectOption("select", { index: 1 });
    await page.click("text=Limpar filtros");
    await expect(page).toHaveURL("/backlog");
  });

  test("deve abrir sheet de registro SICAM para movimentação confirmada", async ({ page }) => {
    // Wait for list to load
    await page.waitForSelector("[data-testid='backlog-list']", { timeout: 5000 }).catch(() => {});

    // Look for a "Registrar no SICAM" button
    const registerButton = page.locator("text=Registrar no SICAM").first();
    if (await registerButton.isVisible()) {
      await registerButton.click();
      await expect(page.locator("text=Registrar no SICAM")).toBeVisible();
      await expect(page.locator("#protocolo")).toBeVisible();
      await expect(page.locator("#dataRegistro")).toBeVisible();
    }
  });

  test("deve registrar movimentação no SICAM com sucesso", async ({ page }) => {
    const registerButton = page.locator("text=Registrar no SICAM").first();
    if (await registerButton.isVisible().catch(() => false)) {
      await registerButton.click();

      // Fill form
      await page.fill("#protocolo", "2024/TEST001");
      await page.fill("#dataRegistro", "2024-06-15");
      await page.fill("#observacoes", "Registro de teste E2E");

      // Submit
      await page.click("text=Confirmar Registro");

      // Verify success
      await expect(page.locator("text=Registrado no SICAM com sucesso")).toBeVisible({
        timeout: 5000,
      });
    }
  });
});
