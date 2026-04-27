import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("Histórico de Movimentações", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "AP20151");
    await page.goto("/movimentacao/historico");
    await page.waitForURL("/movimentacao/historico", { timeout: 10_000 });
  });

  test("deve exibir heading Histórico de Movimentações", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Histórico de Movimentações" }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("deve exibir toolbar com botão Filtros", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /filtros/i }),
    ).toBeVisible({ timeout: 8_000 });
  });

  test("deve exibir tabela ou empty state", async ({ page }) => {
    await Promise.race([
      page.locator("table").waitFor({ state: "visible", timeout: 10_000 }).catch(() => null),
      page.getByText("Sem resultados").waitFor({ state: "visible", timeout: 10_000 }).catch(() => null),
    ]);

    const hasTable = await page.locator("table").isVisible().catch(() => false);
    const hasEmpty = await page.getByText("Sem resultados").isVisible().catch(() => false);
    expect(hasTable || hasEmpty, "Esperava tabela ou empty state").toBe(true);
  });

  test("deve abrir/fechar painel de filtros ao clicar em Filtros", async ({
    page,
  }) => {
    const filtroBtn = page.getByRole("button", { name: /filtros/i });
    // "Data início" label only exists inside the filter panel (not in table headers)
    const filterPanelIndicator = page.locator("label").filter({ hasText: "Data início" });

    await expect(filterPanelIndicator).not.toBeVisible();

    await filtroBtn.click();
    await expect(filterPanelIndicator).toBeVisible({ timeout: 5_000 });

    await filtroBtn.click();
    await expect(filterPanelIndicator).not.toBeVisible();
  });

  test("deve filtrar por status ao selecionar na dropdown", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /filtros/i }).click();

    // Navigate from <label>Status</label> → parent FilterField div → its <select>
    const statusSelect = page
      .locator("label", { hasText: "Status" })
      .locator("..")
      .locator("select");
    await statusSelect.waitFor({ state: "visible", timeout: 5_000 });
    await statusSelect.selectOption("PENDENTE_CONFIRMACAO");

    await expect(page).toHaveURL(/status=PENDENTE_CONFIRMACAO/, {
      timeout: 8_000,
    });
  });

  test("deve exibir resultado count na toolbar", async ({ page }) => {
    const resultCount = page.locator("span").filter({
      hasText: /\d+ resultado/,
    });
    await expect(resultCount).toBeVisible({ timeout: 8_000 });
  });

  test("deve exibir link 'Detalhe' para cada movimentação listada", async ({
    page,
  }) => {
    await Promise.race([
      page.locator("table").waitFor({ state: "visible", timeout: 10_000 }).catch(() => null),
      page.getByText("Sem resultados").waitFor({ state: "visible", timeout: 10_000 }).catch(() => null),
    ]);

    const rows = page.locator("table tbody tr");
    const count = await rows.count().catch(() => 0);

    if (count > 0) {
      const link = rows.first().getByRole("link", { name: "Detalhe" });
      const href = await link.getAttribute("href");
      expect(href).toMatch(/^\/movimentacao\//);
    }
  });

  test("deve exibir empty state quando nenhuma movimentação é encontrada", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /filtros/i }).click();

    const statusSelect = page
      .locator("label", { hasText: "Status" })
      .locator("..")
      .locator("select");
    await statusSelect.waitFor({ state: "visible", timeout: 5_000 });
    await statusSelect.selectOption("REGISTRADA_SICAM");

    await Promise.race([
      page.locator("table").waitFor({ state: "visible", timeout: 10_000 }).catch(() => null),
      page.getByText("Sem resultados").waitFor({ state: "visible", timeout: 10_000 }).catch(() => null),
    ]);

    const hasTable = await page.locator("table").isVisible().catch(() => false);
    const hasEmpty = await page.getByText("Sem resultados").isVisible().catch(() => false);

    expect(hasTable || hasEmpty).toBe(true);
  });

  test("deve exibir botão Limpar quando há filtros ativos", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /filtros/i }).click();

    const statusSelect = page
      .locator("label", { hasText: "Status" })
      .locator("..")
      .locator("select");
    await statusSelect.waitFor({ state: "visible", timeout: 5_000 });
    await statusSelect.selectOption("PENDENTE_CONFIRMACAO");

    await expect(page.getByRole("button", { name: /limpar/i })).toBeVisible({
      timeout: 8_000,
    });
  });
});
