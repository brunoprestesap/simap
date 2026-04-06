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

    expect(tomboDisponivel).toBeTruthy();

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
});
