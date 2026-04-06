import { test, expect } from "@playwright/test";

test.describe("Admin CRUD", () => {
  test.beforeEach(async ({ page }) => {
    // Login como GESTOR_ADMIN (seed: AP20159)
    await page.goto("/login");
    await page.fill('input[name="matricula"]', "AP20159");
    await page.fill('input[name="senha"]', "senha123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/home", { timeout: 15_000 });
    await page.goto("/admin/unidades");
    await page.waitForURL("/admin/unidades");
  });

  test("deve navegar para admin e exibir tabs", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL("/admin/unidades");
    await expect(
      page.getByRole("heading", { name: "Administração" }),
    ).toBeVisible();
    const nav = page.locator("nav").filter({ has: page.getByRole("link") });
    await expect(nav.getByRole("link", { name: "Unidades" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Setores" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Responsáveis" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Perfis" })).toBeVisible();
  });

  test("deve criar nova unidade", async ({ page }) => {
    await page.goto("/admin/unidades");

    // Click "Nova Unidade"
    await page.click("text=Nova Unidade");

    // Fill form
    await page.fill("#codigo", "TEST-E2E");
    await page.fill("#descricao", "Unidade de Teste E2E");

    // Submit
    await page.click("text=Criar");

    // Wait for sheet to close and verify
    await page.waitForTimeout(500);
    await expect(page.locator("text=TEST-E2E")).toBeVisible();
  });

  test("deve editar unidade existente", async ({ page }) => {
    await page.goto("/admin/unidades");

    // Click edit on first row
    const editButton = page.locator('button[aria-label="Editar"]').first();
    if (await editButton.isVisible()) {
      await editButton.click();

      // Modify description
      await page.fill("#descricao", "Descrição Atualizada E2E");
      await page.click("text=Salvar");
      await page.waitForTimeout(500);
    }
  });

  test("deve desativar unidade com confirmação", async ({ page }) => {
    await page.goto("/admin/unidades");

    const deactivateButton = page.locator('button[aria-label="Desativar"]').first();
    if (await deactivateButton.isVisible()) {
      await deactivateButton.click();

      // Verify confirmation modal
      await expect(page.locator("text=Desativar Unidade")).toBeVisible();
      await expect(page.locator("text=Tem certeza")).toBeVisible();

      // Cancel first
      await page.click("text=Cancelar");
    }
  });

  test("deve navegar entre tabs admin", async ({ page }) => {
    await page.goto("/admin/unidades");
    const nav = page.locator("nav").filter({ has: page.getByRole("link") });

    await nav.getByRole("link", { name: "Setores" }).click();
    await expect(page).toHaveURL("/admin/setores");

    await nav.getByRole("link", { name: "Responsáveis" }).click();
    await expect(page).toHaveURL("/admin/responsaveis");

    await nav.getByRole("link", { name: "Perfis" }).click();
    await expect(page).toHaveURL("/admin/perfis");
  });
});
