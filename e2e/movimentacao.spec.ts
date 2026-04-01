import "dotenv/config";
import { test, expect } from "@playwright/test";
import pg from "pg";

async function getTomboDisponivel() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  try {
    const result = await client.query<{ numero: string }>(
      `
        SELECT t.numero
        FROM "Tombo" t
        WHERE NOT EXISTS (
          SELECT 1
          FROM "ItemMovimentacao" i
          JOIN "Movimentacao" m ON m.id = i."movimentacaoId"
          WHERE i."tomboId" = t.id
            AND m.status IN ('PENDENTE_CONFIRMACAO', 'CONFIRMADA_ORIGEM')
        )
        ORDER BY t.numero ASC
        LIMIT 1
      `,
    );

    return result.rows[0]?.numero ?? null;
  } finally {
    await client.end();
  }
}

test.describe("Nova Movimentação", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Matrícula").fill("AP20151");
    await page.getByLabel("Senha").fill("qualquer");
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL(/\/(home|movimentacao)/, { timeout: 10000 });
  });

  test("deve exibir a tela de nova movimentação com scanner e input manual", async ({
    page,
  }) => {
    await page.goto("/movimentacao/nova");

    // Camera likely not available in CI, but manual mode should be available
    await expect(page.getByText("Digitar manualmente")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Tombos escaneados")).toBeVisible();
  });

  test("deve adicionar tombo manualmente e avançar", async ({ page }) => {
    await page.goto("/movimentacao/nova");
    const tomboDisponivel = await getTomboDisponivel();

    expect(tomboDisponivel).toBeTruthy();

    // Switch to manual mode
    await page.getByText("Digitar manualmente").click();

    // Type a tombo number available in the current database state
    await page.getByPlaceholder("Nº do tombo").fill(tomboDisponivel!);
    await page.getByRole("button").filter({ hasText: "" }).last().click();

    // Should show the tombo in the list
    await expect(page.getByText(tomboDisponivel!)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("1 tombo")).toBeVisible();

    // Advance button should be enabled
    const avancarBtn = page.getByRole("button", { name: "Avançar" });
    await expect(avancarBtn).toBeEnabled();
    await avancarBtn.click();

    await expect(
      page.getByRole("heading", { name: "Confirmar Movimentação" }),
    ).toBeVisible();
    await expect(page.getByText("Tombos selecionados (1)")).toBeVisible();
  });
});
