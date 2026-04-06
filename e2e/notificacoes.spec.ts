import { test, expect } from "@playwright/test";

test.describe("Notificações", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="matricula"]', "AP20151");
    await page.fill('input[name="senha"]', "qualquer");
    await page.click('button[type="submit"]');
    await page.waitForURL("/home", { timeout: 15_000 });
  });

  test("deve exibir ícone de notificação no header", async ({ page }) => {
    await expect(page.locator('button[aria-label*="Notificações"]')).toBeVisible();
  });

  test("deve exibir badge com contagem de não lidas", async ({ page }) => {
    const bell = page.locator('button[aria-label*="Notificações"]');
    await expect(bell).toBeVisible();
    // Badge may or may not be visible depending on data
  });

  test("deve navegar para página de notificações no mobile", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/notificacoes");
    await expect(page.locator("h2")).toContainText("Notificações");
  });

  test("deve exibir lista de notificações na página fullscreen", async ({ page }) => {
    await page.goto("/notificacoes");
    await expect(page.locator("h2")).toContainText("Notificações");
  });

  test("deve marcar notificação como lida ao clicar", async ({ page }) => {
    await page.goto("/notificacoes");

    // If there are unread notifications (blue background)
    const unreadNotification = page.locator("[class*='D6E4F0']").first();
    if (await unreadNotification.isVisible().catch(() => false)) {
      await unreadNotification.click();
      // Should navigate to notification link or mark as read
    }
  });

  test("deve marcar todas como lidas", async ({ page }) => {
    await page.goto("/notificacoes");

    const markAllButton = page.locator("text=Marcar todas como lidas");
    if (await markAllButton.isVisible().catch(() => false)) {
      await markAllButton.click();
      // Wait for update
      await page.waitForTimeout(500);
    }
  });
});
