import { test, expect } from "@playwright/test";
import "dotenv/config";
import { loginAs, buscarMovimentacaoPendente } from "./helpers";

test.describe("Confirmação Pública", () => {
  test("deve exibir erro para token inválido", async ({ page }) => {
    await page.goto("/confirmar/token-invalido-123");

    await expect(page.getByText("Link inválido")).toBeVisible({ timeout: 10000 });
  });

  test("deve exibir erro para token expirado ou inexistente", async ({
    page,
  }) => {
    await page.goto("/confirmar/token-expirado-ou-invalido");
    await expect(page.getByText("Link inválido")).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Confirmação Interna", () => {
  test("deve renderizar botão para usuário autorizado do destino", async ({
    page,
  }) => {
    const movimentacaoId = await buscarMovimentacaoPendente("AP20153");
    expect(movimentacaoId).toBeTruthy();

    await loginAs(page, "AP20153");
    await page.goto(`/movimentacao/${movimentacaoId}`);
    await expect(
      page.getByRole("button", { name: "Confirmar movimentação" }),
    ).toBeVisible();
  });

  test("deve exibir aviso quando usuário não tem permissão para confirmar", async ({
    page,
  }) => {
    const movimentacaoId = await buscarMovimentacaoPendente("AP20153");
    expect(movimentacaoId).toBeTruthy();

    await loginAs(page, "AP20159");
    await page.goto(`/movimentacao/${movimentacaoId}`);
    await expect(
      page.getByText(
        "Esta movimentação está pendente, mas sua conta não possui permissão para confirmar o recebimento.",
      ),
    ).toBeVisible();
  });

  test("deve confirmar movimentação com sucesso e atualizar status", async ({
    page,
  }) => {
    const movimentacaoId = await buscarMovimentacaoPendente("AP20153");
    expect(
      movimentacaoId,
      "Nenhuma movimentação pendente para AP20153",
    ).toBeTruthy();

    await loginAs(page, "AP20153");
    await page.goto(`/movimentacao/${movimentacaoId}`);

    const confirmarBtn = page.getByRole("button", {
      name: "Confirmar movimentação",
    });
    await expect(confirmarBtn).toBeVisible({ timeout: 10_000 });
    await confirmarBtn.click();

    // Aguardar re-render após router.refresh()
    await expect(page.getByText("Confirmada")).toBeVisible({
      timeout: 15_000,
    });
    await expect(confirmarBtn).not.toBeVisible({ timeout: 10_000 });
  });
});
