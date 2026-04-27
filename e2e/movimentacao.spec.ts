import "dotenv/config";
import { test, expect } from "@playwright/test";
import { loginAs, getTomboDisponivel, queryDb, getUnidadeDestino } from "./helpers";

test.describe("Nova Movimentação", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "AP20151");
  });

  test("deve exibir a tela de nova movimentação com scanner e input manual", async ({
    page,
  }) => {
    await page.goto("/movimentacao/nova");

    await expect(page.getByRole("button", { name: "Scanner" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole("button", { name: "Manual" })).toBeVisible();
    await expect(page.getByText("Captura de Tombos")).toBeVisible();
    await expect(page.getByText("Lote Atual")).toBeVisible();
  });

  test("deve adicionar tombo manualmente e avançar", async ({ page }) => {
    await page.goto("/movimentacao/nova");
    const tomboDisponivel = await getTomboDisponivel();

    expect(tomboDisponivel, "Nenhum tombo disponível no banco").toBeTruthy();

    await page.getByRole("button", { name: "Manual" }).click();

    await page.getByPlaceholder("Nº do tombo").fill(tomboDisponivel!);
    await page.getByRole("button", { name: "Adicionar" }).click();

    await expect(page.getByText(tomboDisponivel!, { exact: true })).toBeVisible({ timeout: 10_000 });

    const avancarBtn = page.getByRole("button", { name: "Avançar" });
    await expect(avancarBtn).toBeEnabled();
    await avancarBtn.click();

    await expect(page.getByRole("heading", { name: "Confirmar Destino" })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Tombos a Movimentar")).toBeVisible({ timeout: 5_000 });
  });

  test("deve completar fluxo completo de criação de movimentação", async ({
    page,
  }) => {
    const tombo = await getTomboDisponivel();
    expect(tombo, "Nenhum tombo disponível no banco").toBeTruthy();

    const [ntiUnit] = await queryDb<{ id: string }>(
      `SELECT id FROM "Unidade" WHERE codigo = 'NTI' LIMIT 1`,
    );
    expect(ntiUnit, "Unidade NTI não encontrada no banco").toBeTruthy();
    const unidadeDestino = await getUnidadeDestino(ntiUnit.id);
    expect(unidadeDestino, "Nenhuma unidade destino disponível").toBeTruthy();

    await page.goto("/movimentacao/nova");

    // Passo 1: adicionar tombo manualmente
    await page.getByRole("button", { name: "Manual" }).click();
    await page.getByPlaceholder("Nº do tombo").fill(tombo!);
    await page.getByRole("button", { name: "Adicionar" }).click();
    await expect(page.getByText(tombo!, { exact: true })).toBeVisible({
      timeout: 10_000,
    });

    const avancarBtn = page.getByRole("button", { name: "Avançar" });
    await expect(avancarBtn).toBeEnabled();
    await avancarBtn.click();
    await expect(
      page.getByRole("heading", { name: "Confirmar Destino" }),
    ).toBeVisible({ timeout: 10_000 });

    // Passo 2: selecionar unidade de destino
    const searchInput = page.getByPlaceholder("Buscar unidade...");
    await searchInput.click();
    await searchInput.fill(unidadeDestino!.codigo);
    // Aguardar dropdown e clicar no botão da unidade
    const dropdownContainer = page.locator("div").filter({
      has: page.getByPlaceholder("Buscar unidade..."),
    });
    const unitBtn = dropdownContainer.getByRole("button", {
      name: new RegExp(unidadeDestino!.codigo),
    });
    await expect(unitBtn).toBeVisible({ timeout: 5_000 });
    await unitBtn.click();

    // Passo 3: selecionar setor (aguardar label aparecer após fetch assíncrono)
    await expect(page.getByText("Setor de destino")).toBeVisible({
      timeout: 8_000,
    });
    // Aguardar select estar disponível e selecionar a segunda opção (índice 1)
    const setorSelect = page.locator("select").first();
    await expect(setorSelect).toBeVisible({ timeout: 5_000 });
    await setorSelect.selectOption({ index: 1 });

    // Passo 4: confirmar e verificar tela de sucesso
    await page
      .getByRole("button", { name: "Confirmar Movimentação" })
      .click();
    await expect(
      page.getByText("Movimentação registrada com sucesso"),
    ).toBeVisible({ timeout: 15_000 });
  });
});
