import { test, expect } from "@playwright/test";

test.describe("Admin CRUD", () => {
  test.beforeEach(async ({ page }) => {
    // Login as GESTOR_ADMIN
    await page.goto("/login");
    await page.fill('input[name="matricula"]', "ADMIN001");
    await page.fill('input[name="senha"]', "senha123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");
  });

  test("deve navegar para admin e exibir tabs", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL("/admin/unidades");
    await expect(page.locator("text=Administração")).toBeVisible();
    await expect(page.locator("text=Unidades")).toBeVisible();
    await expect(page.locator("text=Setores")).toBeVisible();
    await expect(page.locator("text=Responsáveis")).toBeVisible();
    await expect(page.locator("text=Perfis")).toBeVisible();
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

    // Navigate to Setores
    await page.click("text=Setores");
    await expect(page).toHaveURL("/admin/setores");

    // Navigate to Responsáveis
    await page.click("text=Responsáveis");
    await expect(page).toHaveURL("/admin/responsaveis");

    // Navigate to Perfis
    await page.click("text=Perfis");
    await expect(page).toHaveURL("/admin/perfis");
  });
});
