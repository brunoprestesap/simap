import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

// Create a test CSV file
const CSV_CONTENT =
  "Número Tombo;Descrição Material;Código Fornecedor;Nome Fornecedor;Código Lotação;Descrição Lotação;Código Setor;Nome Setor;Matrícula Responsável;Nome Responsável;Saída\n" +
  "999001;Monitor Teste E2E;F9999;Fornecedor Teste;NTI;Núcleo de TI;NTI-INFRA;Infraestrutura;AP20151;Carlos Silva;\n" +
  "999002;Notebook Teste E2E;F9999;Fornecedor Teste;NTI;Núcleo de TI;NTI-SIST;Sistemas;AP20152;Ana Souza;";

test.describe("Importação CSV", () => {
  test.beforeEach(async ({ page }) => {
    // Login como GESTOR_ADMIN (seed: AP20159)
    await page.goto("/login");
    await page.fill('input[name="matricula"]', "AP20159");
    await page.fill('input[name="senha"]', "senha123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/home", { timeout: 15_000 });
  });

  test("deve fazer upload e preview de CSV", async ({ page }) => {
    await page.goto("/importacao");

    await expect(page.getByText("Importação CSV do SICAM")).toBeVisible();

    // Create temp CSV file
    const tmpDir = path.join(__dirname, "..", "tmp");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const csvPath = path.join(tmpDir, "test-import.csv");
    // Write as Latin-1
    const buffer = Buffer.from(CSV_CONTENT, "latin1");
    fs.writeFileSync(csvPath, buffer);

    // Upload via file input
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);

    // Should move to step 2 (preview)
    await expect(page.getByText("Válidos")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("999001")).toBeVisible();

    // Cleanup
    fs.unlinkSync(csvPath);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
