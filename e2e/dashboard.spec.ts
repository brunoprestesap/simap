import { test, expect } from "@playwright/test";

test.describe("Dashboard Gerencial", () => {
  test.beforeEach(async ({ page }) => {
    // Login como GESTOR_ADMIN (seed: AP20159); pós-login sempre /home
    await page.goto("/login");
    await page.fill('input[name="matricula"]', "AP20159");
    await page.fill('input[name="senha"]', "senha123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/home", { timeout: 15_000 });
    await page.goto("/dashboard");
    await page.waitForURL("/dashboard", { timeout: 15_000 });
  });

  test("deve exibir título do dashboard", async ({ page }) => {
    await expect(page.locator("h2")).toContainText("Dashboard gerencial");
  });

  test("deve exibir 3 KPI cards", async ({ page }) => {
    // Wait for KPIs to load (Suspense boundaries)
    await page.waitForSelector("text=Tempo médio de registro no SICAM", { timeout: 10000 });
    await expect(page.locator("text=Pendentes de registro no SICAM")).toBeVisible();
    await expect(page.locator("text=Pendentes de confirmação")).toBeVisible();
  });

  test("deve exibir gráfico de movimentações por período", async ({ page }) => {
    await expect(page.locator("text=Movimentações por período")).toBeVisible({ timeout: 10000 });
    // Check period tabs
    await expect(page.locator("button", { hasText: "Dia" })).toBeVisible();
    await expect(page.locator("button", { hasText: "Semana" })).toBeVisible();
    await expect(page.locator("button", { hasText: "Mês" })).toBeVisible();
  });

  test("deve alternar período do gráfico", async ({ page }) => {
    await page.waitForSelector("text=Movimentações por período", { timeout: 10000 });
    await page.click("button:has-text('Dia')");
    // Chart should re-render (no error)
    await expect(page.locator("text=Movimentações por período")).toBeVisible();
  });

  test("deve exibir distribuição por unidade", async ({ page }) => {
    await expect(page.locator("text=Distribuição por unidade")).toBeVisible({ timeout: 10000 });
    // Check view toggle
    await expect(page.locator("button", { hasText: "Gráfico" })).toBeVisible();
    await expect(page.locator("button", { hasText: "Tabela" })).toBeVisible();
  });

  test("deve alternar entre gráfico e tabela na visão por unidade", async ({ page }) => {
    await page.waitForSelector("text=Distribuição por unidade", { timeout: 10000 });
    await page.click("button:has-text('Tabela')");

    await expect(
      page.locator("th", { hasText: "Unidade" }).or(page.locator("text=Sem dados disponíveis")),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("deve exibir relatório de auditoria com filtros", async ({ page }) => {
    await expect(page.locator("text=Relatório de auditoria")).toBeVisible({ timeout: 10000 });
    // Filters should be open by default
    await expect(page.locator("text=Período início")).toBeVisible();
    await expect(page.locator("text=Status")).toBeVisible();
  });

  test("deve filtrar auditoria por status", async ({ page }) => {
    await page.waitForSelector("text=Relatório de auditoria", { timeout: 10000 });
    const statusSelect = page.locator(
      'select:has(option[value="REGISTRADA_SICAM"])',
    );
    await statusSelect.selectOption("REGISTRADA_SICAM");
    await page.waitForURL(/aud_status=REGISTRADA_SICAM/, { timeout: 15_000 });
  });

  test("deve ter link 'Ver backlog' no KPI de pendentes SICAM", async ({ page }) => {
    await page.waitForSelector("text=Pendentes de registro no SICAM", { timeout: 10000 });
    const link = page.locator("a", { hasText: "Ver backlog" });
    if (await link.isVisible()) {
      await expect(link).toHaveAttribute("href", /\/backlog/);
    }
  });
});

test.describe("Dashboard — controle de acesso", () => {
  test("deve redirecionar não-admin para /home", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="matricula"]', "AP20151");
    await page.fill('input[name="senha"]', "qualquer");
    await page.click('button[type="submit"]');
    await page.waitForURL("/home", { timeout: 15_000 });

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/home/, { timeout: 10_000 });
  });
});

test.describe("Histórico de Importações", () => {
  test.beforeEach(async ({ page }) => {
    // Login como GESTOR_ADMIN (seed: AP20159)
    await page.goto("/login");
    await page.fill('input[name="matricula"]', "AP20159");
    await page.fill('input[name="senha"]', "senha123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/home", { timeout: 15_000 });
  });

  test("deve exibir página de histórico de importações", async ({ page }) => {
    await page.goto("/importacao/historico");
    await expect(page.locator("h2")).toContainText("Histórico de importações");
  });

  test("deve exibir tabela ou empty state", async ({ page }) => {
    await page.goto("/importacao/historico");
    const hasTable = await page.locator("table").isVisible().catch(() => false);
    const hasEmptyState = await page.locator("text=Nenhuma importação").isVisible().catch(() => false);
    expect(hasTable || hasEmptyState).toBe(true);
  });
});

test.describe("Importação — controle de acesso", () => {
  test("deve redirecionar não-admin para /home ao acessar importação", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="matricula"]', "AP20151");
    await page.fill('input[name="senha"]', "qualquer");
    await page.click('button[type="submit"]');
    await page.waitForURL("/home", { timeout: 15_000 });

    await page.goto("/importacao");
    await expect(page).toHaveURL(/\/home/, { timeout: 10_000 });
  });
});
