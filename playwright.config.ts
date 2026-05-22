import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  globalSetup: "./e2e/global-setup.ts",
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // 1 retry local absorve flakes de compilação sob demanda do dev server
  // quando vários workers competem por CPU; CI mantém 2.
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    // Apenas Chromium no projeto local/CI: WebKit exige `npx playwright install webkit`.
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    // E2E usa login só-banco (sem AD); evita falhar quando .env tem LDAP_URL.
    // E2E_DISABLE_RATE_LIMIT: a suíte loga dezenas de vezes pelo mesmo IP
    // (localhost) e estouraria o limiter por IP em lib/auth.ts. Só tem efeito
    // fora de produção.
    env: { ...process.env, LDAP_URL: "", E2E_DISABLE_RATE_LIMIT: "1" },
  },
});
