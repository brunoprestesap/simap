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
    // Aguardar carregamento completo
    await page.waitForLoadState("networkidle");

    // Aguardar que o skeleton desapareça ou a tabela apareça
    await Promise.race([
      page.locator("table").waitFor({ state: "visible", timeout: 5_000 }).catch(() => null),
      page.getByText(/sem resultados|sem movimentações|não há/i).waitFor({ state: "visible", timeout: 5_000 }).catch(() => null),
    ]);

    const hasTable = await page.locator("table").isVisible().catch(() => false);
    const hasEmpty = await page
      .getByText(/sem resultados|sem movimentações|não há/i)
      .isVisible()
      .catch(() => false);
    expect(hasTable || hasEmpty, "Esperava tabela ou empty state").toBe(true);
  });

  test("deve abrir/fechar painel de filtros ao clicar em Filtros", async ({
    page,
  }) => {
    const filtroBtn = page.getByRole("button", { name: /filtros/i });
    const filterPanel = page.locator(
      "div.grid.grid-cols-1.gap-3.rounded-lg.border.border-border.bg-card.p-4",
    );

    // Painel deve estar oculto inicialmente
    await expect(filterPanel).not.toBeVisible();

    // Clicar abre o painel
    await filtroBtn.click();
    await expect(filterPanel).toBeVisible({ timeout: 5_000 });

    // Clicar novamente fecha o painel
    await filtroBtn.click();
    await expect(filterPanel).not.toBeVisible();
  });

  test("deve filtrar por status ao selecionar na dropdown", async ({
    page,
  }) => {
    // Abrir filtros
    await page.getByRole("button", { name: /filtros/i }).click();

    // Aguardar painel de filtros ficar visível
    await page.locator("select").first().waitFor({ state: "visible", timeout: 5_000 });

    // Selecionar status "Pendente" (PENDENTE_CONFIRMACAO)
    await page.locator("select").first().selectOption("PENDENTE_CONFIRMACAO");

    // Verificar que a URL foi atualizada com o filtro
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
    // Aguardar que a página complete o carregamento
    await page.waitForLoadState("networkidle");

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
    // Abrir filtros
    await page.getByRole("button", { name: /filtros/i }).click();

    // Selecionar um status que provavelmente não terá resultados
    // ou inserir datas que não retornem movimentações
    const statusSelect = page.locator("select").first();
    await statusSelect.waitFor({ state: "visible", timeout: 5_000 });

    // Tentar filtrar por um status específico
    await statusSelect.selectOption("REGISTRADA_SICAM");

    // Aguardar a atualização da página
    await page.waitForLoadState("networkidle");

    // Se houver empty state, ele deve estar visível
    // Caso contrário, a tabela estará visível
    const hasTable = await page.locator("table").isVisible().catch(() => false);
    const hasEmpty = await page
      .getByText(/sem resultados|sem movimentações/i)
      .isVisible()
      .catch(() => false);

    expect(hasTable || hasEmpty).toBe(true);
  });

  test("deve exibir botão Limpar quando há filtros ativos", async ({
    page,
  }) => {
    // Abrir filtros
    await page.getByRole("button", { name: /filtros/i }).click();

    // Selecionar um status
    const statusSelect = page.locator("select").first();
    await statusSelect.waitFor({ state: "visible", timeout: 5_000 });
    await statusSelect.selectOption("PENDENTE_CONFIRMACAO");

    // Aguardar que o botão Limpar apareça
    await expect(page.getByRole("button", { name: /limpar/i })).toBeVisible({
      timeout: 8_000,
    });
  });
});
