import { test, expect } from "@playwright/test";
import { loginAs, queryDb } from "./helpers";

test.describe("Meus Patrimônios", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "AP20153");
    await page.goto("/patrimonio");
  });

  test("deve exibir heading Meus Patrimônios", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Meus Patrimônios" }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("deve exibir lista de tombos ou empty state", async ({ page }) => {
    const [row] = await queryDb<{ cnt: string }>(`
      SELECT COUNT(t.id)::text AS cnt
      FROM "Tombo" t
      JOIN "Usuario" u ON u."unidadeId" = t."unidadeId"
      WHERE u.matricula = 'AP20153'
    `);
    const count = parseInt(row?.cnt ?? "0", 10);

    if (count > 0) {
      await expect(page.locator("table, [data-testid='patrimonio-list']")).toBeVisible({
        timeout: 10_000,
      });
    } else {
      await expect(
        page.getByText(/nenhum|sem patrimônios|não há/i),
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  test("deve exibir badge de pendentes de confirmação quando houver", async ({
    page,
  }) => {
    const [row] = await queryDb<{ cnt: string }>(`
      SELECT COUNT(m.id)::text AS cnt
      FROM "Movimentacao" m
      JOIN "Usuario" u ON u."unidadeId" = m."unidadeDestinoId"
      WHERE u.matricula = 'AP20153'
        AND m.status = 'PENDENTE_CONFIRMACAO'
        AND m."tokenExpiraEm" > NOW()
    `);
    const pendentes = parseInt(row?.cnt ?? "0", 10);

    if (pendentes > 0) {
      await expect(
        page.getByText(new RegExp(`${pendentes}|pendente`, "i")),
      ).toBeVisible({ timeout: 10_000 });
    }
    await expect(page.getByRole("heading", { name: "Meus Patrimônios" })).toBeVisible();
  });

  test("deve filtrar patrimônios por busca quando houver tombos", async ({
    page,
  }) => {
    const rows = await queryDb<{ numero: string }>(`
      SELECT t.numero
      FROM "Tombo" t
      JOIN "Usuario" u ON u."unidadeId" = t."unidadeId"
      WHERE u.matricula = 'AP20153'
      LIMIT 1
    `);

    if (rows.length === 0) {
      test.skip();
      return;
    }

    const numero = rows[0].numero;
    const searchInput = page.getByPlaceholder(/buscar|pesquisar/i);
    await expect(searchInput).toBeVisible({ timeout: 8_000 });
    await searchInput.fill(numero);

    await expect(page.getByRole("cell", { name: numero })).toBeVisible({ timeout: 8_000 });
  });
});
