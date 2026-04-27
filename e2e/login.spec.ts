import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("Login", () => {
  test("deve exibir a página de login", async ({ page }) => {
    await page.goto("/login");

    await expect(
      page.getByRole("heading", { name: "Acessar SIMAP" }),
    ).toBeVisible();
    await expect(page.getByLabel("Matrícula")).toBeVisible();
    await expect(page.getByLabel("Senha")).toBeVisible();
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  });

  test("deve redirecionar para login quando não autenticado", async ({
    page,
  }) => {
    await page.goto("/home");

    // Should be redirected to login
    await expect(page).toHaveURL(/\/login/);
  });

  test("deve exibir erro com credenciais inválidas", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Matrícula").fill("INVALIDO");
    await page.getByLabel("Senha").fill("senha123");
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(
      page.getByText("Matrícula ou senha incorretos"),
    ).toBeVisible();
  });

  test("deve fazer login com matrícula válida e redirecionar para home", async ({
    page,
  }) => {
    await page.goto("/login");

    await page.getByLabel("Matrícula").fill("AP20151");
    await page.getByLabel("Senha").fill("qualquer");
    await page.getByRole("button", { name: "Entrar" }).click();

    // Técnico TI → /home
    await expect(page).toHaveURL(/\/home/, { timeout: 10000 });
    await expect(page.getByText("Olá, Carlos")).toBeVisible();
  });
});

test.describe("Logout", () => {
  test("deve fazer logout com sucesso", async ({ page }) => {
    await loginAs(page, "AP20151");
    await expect(page).toHaveURL("/home");

    // Sidebar: botão com aria-label="Sair"
    await page.getByRole("button", { name: "Sair" }).click();

    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    // Garantir que não está mais autenticado
    await page.goto("/home", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});
