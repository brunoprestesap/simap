# E2E Playwright — Cobertura dos Principais Fluxos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expandir a suite E2E existente com helpers compartilhados, fluxo completo de criação/confirmação/SICAM e cobertura básica das páginas não testadas.

**Architecture:** Módulo `e2e/helpers.ts` centraliza `loginAs` e queries de DB. Arquivos existentes recebem novos testes assertivos (sem `if (await isVisible())`). Quatro novos spec files cobrem home por perfil, patrimônio, tombos e histórico.

**Tech Stack:** Playwright, pg (já em uso), dotenv/config (já em uso), Next.js App Router, Prisma (PostgreSQL).

---

## Arquivos

| Arquivo | Ação |
|---------|------|
| `e2e/helpers.ts` | Criar |
| `e2e/movimentacao.spec.ts` | Adicionar teste de fluxo completo |
| `e2e/confirmacao.spec.ts` | Adicionar teste de confirmação completa; importar helpers |
| `e2e/backlog.spec.ts` | Substituir teste SICAM condicional por assertivo |
| `e2e/login.spec.ts` | Adicionar teste de logout |
| `e2e/home.spec.ts` | Criar — 4 perfis |
| `e2e/patrimonio.spec.ts` | Criar |
| `e2e/tombos.spec.ts` | Criar |
| `e2e/historico.spec.ts` | Criar |

---

## Task 1: Criar `e2e/helpers.ts`

**Files:**
- Create: `e2e/helpers.ts`

- [ ] **Step 1: Criar o arquivo**

```typescript
// e2e/helpers.ts
import "dotenv/config";
import type { Page } from "@playwright/test";
import pg from "pg";

export async function loginAs(
  page: Page,
  matricula: string,
  senha = "senha123",
): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Matrícula").fill(matricula);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("/home", { timeout: 15_000 });
}

export async function queryDb<T>(
  sql: string,
  params?: unknown[],
): Promise<T[]> {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
  });
  await client.connect();
  try {
    const result = await client.query<T>(sql, params);
    return result.rows;
  } finally {
    await client.end();
  }
}

export async function getTomboDisponivel(): Promise<string | null> {
  const rows = await queryDb<{ numero: string }>(`
    SELECT t.numero
    FROM "Tombo" t
    WHERE NOT EXISTS (
      SELECT 1 FROM "ItemMovimentacao" i
      JOIN "Movimentacao" m ON m.id = i."movimentacaoId"
      WHERE i."tomboId" = t.id
        AND m.status IN ('PENDENTE_CONFIRMACAO', 'CONFIRMADA_ORIGEM')
    )
    ORDER BY t.numero ASC
    LIMIT 1
  `);
  return rows[0]?.numero ?? null;
}

export async function buscarMovimentacaoPendente(
  matricula: string,
): Promise<string | null> {
  const rows = await queryDb<{ id: string }>(
    `
    SELECT m.id
    FROM "Movimentacao" m
    JOIN "Usuario" s ON s."unidadeId" = m."unidadeDestinoId" AND s.ativo = true
    WHERE s.matricula = $1
      AND m.status = 'PENDENTE_CONFIRMACAO'
      AND m."tokenExpiraEm" > NOW()
    ORDER BY m."createdAt" DESC
    LIMIT 1
  `,
    [matricula],
  );
  return rows[0]?.id ?? null;
}

export async function getMovimentacaoConfirmada(): Promise<string | null> {
  const rows = await queryDb<{ id: string }>(`
    SELECT id FROM "Movimentacao"
    WHERE status = 'CONFIRMADA_ORIGEM'
    ORDER BY "createdAt" DESC
    LIMIT 1
  `);
  return rows[0]?.id ?? null;
}

export async function getUnidadeDestino(
  excluirUnidadeId?: string,
): Promise<{ id: string; codigo: string } | null> {
  const rows = excluirUnidadeId
    ? await queryDb<{ id: string; codigo: string }>(
        `
    SELECT u.id, u.codigo
    FROM "Unidade" u
    WHERE u.ativo = true AND u.id != $1
      AND EXISTS (SELECT 1 FROM "Setor" s WHERE s."unidadeId" = u.id)
    ORDER BY u.codigo ASC
    LIMIT 1
  `,
        [excluirUnidadeId],
      )
    : await queryDb<{ id: string; codigo: string }>(`
    SELECT u.id, u.codigo
    FROM "Unidade" u
    WHERE u.ativo = true
      AND EXISTS (SELECT 1 FROM "Setor" s WHERE s."unidadeId" = u.id)
    ORDER BY u.codigo ASC
    LIMIT 1
  `);
  return rows[0] ?? null;
}
```

- [ ] **Step 2: Verificar que compila sem erros**

```bash
npx playwright test e2e/health.spec.ts --project=chromium
```

Esperado: `1 passed`

- [ ] **Step 3: Commit**

```bash
git add e2e/helpers.ts
git commit -m "test(e2e): adicionar helpers compartilhados (loginAs, queryDb, helpers de DB)"
```

---

## Task 2: Completar `e2e/movimentacao.spec.ts` — fluxo completo de criação

**Files:**
- Modify: `e2e/movimentacao.spec.ts`

**Contexto:** O seed cria tombos com `AP20151` (TECNICO_TI) na unidade NTI. O wizard de nova movimentação tem 2 passos: (1) capturar tombos, (2) confirmar destino + setor. Ao submeter com sucesso, a tela mostra "Movimentação registrada com sucesso" — não há redirect.

- [ ] **Step 1: Adicionar imports do helpers**

No topo de `e2e/movimentacao.spec.ts`, substituir os imports existentes:

```typescript
import "dotenv/config";
import { test, expect } from "@playwright/test";
import pg from "pg";
import { loginAs, getTomboDisponivel, queryDb, getUnidadeDestino } from "./helpers";
```

- [ ] **Step 2: Remover a função `getTomboDisponivel` inline**

Apagar as linhas com a definição da função `getTomboDisponivel` local (ela existe inline no arquivo — do `async function getTomboDisponivel()` até o `}` que a fecha), pois agora vem do helpers.

- [ ] **Step 3: Atualizar o `beforeEach` para usar `loginAs`**

Substituir o bloco `beforeEach` existente:

```typescript
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "AP20151");
  });
```

- [ ] **Step 4: Adicionar teste de fluxo completo**

Ao final do `test.describe("Nova Movimentação")`, antes do `});` de fechamento, adicionar:

```typescript
  test("deve completar fluxo completo de criação de movimentação", async ({
    page,
  }) => {
    const tombo = await getTomboDisponivel();
    expect(tombo, "Nenhum tombo disponível no banco").toBeTruthy();

    const [ntiUnit] = await queryDb<{ id: string }>(
      `SELECT id FROM "Unidade" WHERE codigo = 'NTI' LIMIT 1`,
    );
    const unidadeDestino = await getUnidadeDestino(ntiUnit?.id);
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
    // Os botões do dropdown têm o código da unidade como texto interno
    const unitBtn = page
      .getByRole("button", { name: new RegExp(unidadeDestino!.codigo) })
      .first();
    await expect(unitBtn).toBeVisible({ timeout: 5_000 });
    await unitBtn.click();

    // Passo 3: selecionar setor (aguardar label aparecer após fetch)
    await expect(page.getByText("Setor de destino")).toBeVisible({
      timeout: 8_000,
    });
    await page.locator("select").selectOption({ index: 1 });

    // Passo 4: confirmar e verificar tela de sucesso
    await page
      .getByRole("button", { name: "Confirmar Movimentação" })
      .click();
    await expect(
      page.getByText("Movimentação registrada com sucesso"),
    ).toBeVisible({ timeout: 15_000 });
  });
```

- [ ] **Step 5: Executar os testes do arquivo**

```bash
npx playwright test e2e/movimentacao.spec.ts --project=chromium
```

Esperado: todos os testes passam (3 total).

- [ ] **Step 6: Commit**

```bash
git add e2e/movimentacao.spec.ts
git commit -m "test(e2e): completar fluxo de criação de movimentação até tela de sucesso"
```

---

## Task 3: Completar `e2e/confirmacao.spec.ts` — confirmação completa

**Files:**
- Modify: `e2e/confirmacao.spec.ts`

**Contexto:** `ConfirmacaoInternaButton` chama `confirmarMovimentacaoLogada`, atualiza o status via `router.refresh()`. Não há dialog — o clique no botão confirma diretamente. O botão exibe "Confirmar movimentação" (m minúsculo).

- [ ] **Step 1: Atualizar imports**

Substituir os imports no topo de `e2e/confirmacao.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";
import "dotenv/config";
import { loginAs, buscarMovimentacaoPendente } from "./helpers";
```

- [ ] **Step 2: Remover função `buscarMovimentacaoPendentePorMatriculaDestino` inline**

Apagar toda a função `buscarMovimentacaoPendentePorMatriculaDestino` (definição local com `pg.Client`), pois `buscarMovimentacaoPendente` do helpers é equivalente.

- [ ] **Step 3: Atualizar referências à função removida**

Em todos os usos de `buscarMovimentacaoPendentePorMatriculaDestino("AP20153")`, substituir por `buscarMovimentacaoPendente("AP20153")`.

- [ ] **Step 4: Adicionar teste de confirmação completa**

Ao final do `test.describe("Confirmação Interna")`, antes do `});` de fechamento, adicionar:

```typescript
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
    await expect(confirmarBtn).not.toBeVisible();
  });
```

- [ ] **Step 5: Executar os testes do arquivo**

```bash
npx playwright test e2e/confirmacao.spec.ts --project=chromium
```

Esperado: todos os testes passam.

- [ ] **Step 6: Commit**

```bash
git add e2e/confirmacao.spec.ts
git commit -m "test(e2e): adicionar confirmação completa e usar helpers compartilhados"
```

---

## Task 4: Atualizar `e2e/backlog.spec.ts` — registro SICAM assertivo

**Files:**
- Modify: `e2e/backlog.spec.ts`

**Contexto:** O botão "Registrar no SICAM" abre um sheet com campos `#protocolo` e `#dataRegistro`. O toast de sucesso exibe "Registrado no SICAM com sucesso". O teste atual é condicional (`if (await registerButton.isVisible())`).

- [ ] **Step 1: Adicionar import de helpers**

No topo de `e2e/backlog.spec.ts`, adicionar:

```typescript
import { getMovimentacaoConfirmada } from "./helpers";
```

- [ ] **Step 2: Substituir o teste condicional pelo assertivo**

Localizar e substituir o teste `"deve registrar movimentação no SICAM com sucesso"` inteiro:

```typescript
  test("deve registrar movimentação no SICAM com sucesso", async ({ page }) => {
    const movId = await getMovimentacaoConfirmada();
    expect(movId, "Nenhuma movimentação CONFIRMADA_ORIGEM no banco").toBeTruthy();

    // O beforeEach já está em /backlog; se não houver o item visível
    // na paginação, filtramos pelo status para garantir que aparece.
    await page.goto("/backlog?status=CONFIRMADA_ORIGEM");
    await page.waitForURL(/status=CONFIRMADA_ORIGEM/, { timeout: 10_000 });

    const registerButton = page
      .getByRole("button", { name: "Registrar no SICAM" })
      .first();
    await expect(registerButton).toBeVisible({ timeout: 10_000 });
    await registerButton.click();

    await expect(
      page.getByRole("heading", { name: "Registrar no SICAM" }),
    ).toBeVisible({ timeout: 5_000 });

    const hoje = new Date().toISOString().split("T")[0];
    await page.fill("#protocolo", "2026/E2E-TEST");
    await page.fill("#dataRegistro", hoje);

    await page.getByRole("button", { name: "Confirmar Registro" }).click();

    await expect(
      page.getByText("Registrado no SICAM com sucesso"),
    ).toBeVisible({ timeout: 10_000 });
  });
```

- [ ] **Step 3: Executar os testes do arquivo**

```bash
npx playwright test e2e/backlog.spec.ts --project=chromium
```

Esperado: todos os testes passam.

- [ ] **Step 4: Commit**

```bash
git add e2e/backlog.spec.ts
git commit -m "test(e2e): tornar teste de registro SICAM assertivo com query de banco"
```

---

## Task 5: Adicionar teste de logout em `e2e/login.spec.ts`

**Files:**
- Modify: `e2e/login.spec.ts`

**Contexto:** O botão de logout está na sidebar com `aria-label="Sair"`. Ao clicar, `signOut({ callbackUrl: "/login" })` redireciona para `/login`.

- [ ] **Step 1: Adicionar import de helpers**

No topo de `e2e/login.spec.ts`, adicionar:

```typescript
import { loginAs } from "./helpers";
```

- [ ] **Step 2: Adicionar teste de logout**

Ao final do arquivo, depois do último `});`, adicionar:

```typescript
test.describe("Logout", () => {
  test("deve fazer logout com sucesso", async ({ page }) => {
    await loginAs(page, "AP20151");
    await expect(page).toHaveURL("/home");

    // Sidebar: botão com aria-label="Sair"
    await page.getByRole("button", { name: "Sair" }).click();

    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    // Garantir que não está mais autenticado
    await page.goto("/home");
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});
```

- [ ] **Step 3: Executar**

```bash
npx playwright test e2e/login.spec.ts --project=chromium
```

Esperado: todos os testes passam.

- [ ] **Step 4: Commit**

```bash
git add e2e/login.spec.ts
git commit -m "test(e2e): adicionar teste de logout via sidebar"
```

---

## Task 6: Criar `e2e/home.spec.ts` — home por perfil

**Files:**
- Create: `e2e/home.spec.ts`

**Contexto:** Cada perfil renderiza uma view diferente:
- TECNICO_TI (AP20151 — Carlos): link "Registrar saída" → `/movimentacao/nova`; card "Movimentações recentes"
- SERVIDOR_RESPONSAVEL (AP20153 — Roberto): link → `/patrimonio`; KPI "Pendentes de confirmação"
- SERVIDOR_SEMAP (AP20157 — Fernando): link → `/backlog`; texto "Backlog SEMAP"
- GESTOR_ADMIN (AP20159 — Ricardo): link → `/dashboard`; link → `/backlog`

- [ ] **Step 1: Criar arquivo**

```typescript
// e2e/home.spec.ts
import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("Home — TECNICO_TI", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "AP20151");
  });

  test("deve exibir saudação com primeiro nome", async ({ page }) => {
    await expect(page.getByText("Olá, Carlos")).toBeVisible({ timeout: 10_000 });
  });

  test("deve exibir ação rápida de Registrar saída", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: /Registrar saída/i }),
    ).toBeVisible();
  });

  test("deve exibir card de Movimentações recentes", async ({ page }) => {
    await expect(page.getByText("Movimentações recentes")).toBeVisible({
      timeout: 10_000,
    });
  });
});

test.describe("Home — SERVIDOR_RESPONSAVEL", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "AP20153");
  });

  test("deve exibir saudação com primeiro nome", async ({ page }) => {
    await expect(page.getByText("Olá, Roberto")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("deve exibir link para Meus Patrimônios", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: /Patrimônios|Meus Patrimônios/i }).first(),
    ).toBeVisible();
  });

  test("deve exibir KPI de Pendentes de confirmação", async ({ page }) => {
    await expect(page.getByText("Pendentes de confirmação")).toBeVisible({
      timeout: 10_000,
    });
  });
});

test.describe("Home — SERVIDOR_SEMAP", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "AP20157");
  });

  test("deve exibir saudação com primeiro nome", async ({ page }) => {
    await expect(page.getByText("Olá, Fernando")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("deve exibir link para Backlog SEMAP", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: /Backlog SEMAP|Backlog/i }).first(),
    ).toBeVisible();
  });
});

test.describe("Home — GESTOR_ADMIN", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "AP20159");
  });

  test("deve exibir saudação com primeiro nome", async ({ page }) => {
    await expect(page.getByText("Olá, Ricardo")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("deve exibir link para Dashboard", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: /Dashboard/i }).first(),
    ).toBeVisible();
  });

  test("deve exibir link para Backlog", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: /Backlog/i }).first(),
    ).toBeVisible();
  });
});
```

- [ ] **Step 2: Executar**

```bash
npx playwright test e2e/home.spec.ts --project=chromium
```

Esperado: todos os testes passam.

- [ ] **Step 3: Commit**

```bash
git add e2e/home.spec.ts
git commit -m "test(e2e): cobrir home page para os 4 perfis de usuário"
```

---

## Task 7: Criar `e2e/patrimonio.spec.ts`

**Files:**
- Create: `e2e/patrimonio.spec.ts`

**Contexto:** Página `/patrimonio` é acessível para qualquer usuário autenticado. Exibe tombos da unidade do usuário. AP20153 (Roberto) está na unidade `vara1`.

- [ ] **Step 1: Criar arquivo**

```typescript
// e2e/patrimonio.spec.ts
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
    // Descobrir a unidade de AP20153 e contar os tombos dela
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
      // Badge ou aviso com contagem de pendentes
      await expect(
        page.getByText(new RegExp(`${pendentes}|pendente`, "i")),
      ).toBeVisible({ timeout: 10_000 });
    }
    // Se zero, apenas verificar que a página carregou sem erro
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

    await expect(page.getByText(numero)).toBeVisible({ timeout: 8_000 });
  });
});
```

- [ ] **Step 2: Executar**

```bash
npx playwright test e2e/patrimonio.spec.ts --project=chromium
```

Esperado: todos os testes passam.

- [ ] **Step 3: Commit**

```bash
git add e2e/patrimonio.spec.ts
git commit -m "test(e2e): cobrir página Meus Patrimônios com testes assertivos"
```

---

## Task 8: Criar `e2e/tombos.spec.ts`

**Files:**
- Create: `e2e/tombos.spec.ts`

**Contexto:** Página `/tombos` requer `TECNICO_TI` ou `SERVIDOR_SEMAP`. GESTOR_ADMIN é redirecionado para `/home`.

- [ ] **Step 1: Criar arquivo**

```typescript
// e2e/tombos.spec.ts
import { test, expect } from "@playwright/test";
import { loginAs, getTomboDisponivel } from "./helpers";

test.describe("Tombos", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "AP20151");
    await page.goto("/tombos");
  });

  test("deve exibir heading Tombos", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Tombos" }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("deve buscar tombo por número e exibir resultado", async ({ page }) => {
    const numero = await getTomboDisponivel();
    expect(numero, "Nenhum tombo no banco").toBeTruthy();

    const searchInput = page.getByPlaceholder(/buscar|pesquisar|tombo/i);
    await expect(searchInput).toBeVisible({ timeout: 8_000 });
    await searchInput.fill(numero!);

    await expect(page.getByText(numero!)).toBeVisible({ timeout: 8_000 });
  });
});

test.describe("Tombos — controle de acesso", () => {
  test("deve redirecionar GESTOR_ADMIN para /home", async ({ page }) => {
    await loginAs(page, "AP20159");
    await page.goto("/tombos");
    await expect(page).toHaveURL(/\/home/, { timeout: 10_000 });
  });

  test("deve redirecionar SERVIDOR_RESPONSAVEL para /home", async ({ page }) => {
    await loginAs(page, "AP20153");
    await page.goto("/tombos");
    await expect(page).toHaveURL(/\/home/, { timeout: 10_000 });
  });
});
```

- [ ] **Step 2: Executar**

```bash
npx playwright test e2e/tombos.spec.ts --project=chromium
```

Esperado: todos os testes passam.

- [ ] **Step 3: Commit**

```bash
git add e2e/tombos.spec.ts
git commit -m "test(e2e): cobrir página Tombos e controle de acesso por perfil"
```

---

## Task 9: Criar `e2e/historico.spec.ts`

**Files:**
- Create: `e2e/historico.spec.ts`

**Contexto:** Página `/movimentacao/historico` é acessível para qualquer usuário autenticado. Filtragem por status via query param `status=`.

- [ ] **Step 1: Criar arquivo**

```typescript
// e2e/historico.spec.ts
import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("Histórico de Movimentações", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "AP20151");
    await page.goto("/movimentacao/historico");
    await page.waitForURL("/movimentacao/historico", { timeout: 10_000 });
  });

  test("deve exibir heading Histórico de Movimentações", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Histórico de Movimentações" }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("deve exibir tabela ou empty state", async ({ page }) => {
    const hasTable = await page.locator("table").isVisible().catch(() => false);
    const hasEmpty = await page
      .getByText(/nenhuma|sem movimentações|não há/i)
      .isVisible()
      .catch(() => false);
    expect(hasTable || hasEmpty, "Esperava tabela ou empty state").toBe(true);
  });

  test("deve filtrar por status PENDENTE_CONFIRMACAO", async ({ page }) => {
    // Localizar o select de status — pode ser <select> ou combobox
    const statusSelect = page.locator("select").first();
    await expect(statusSelect).toBeVisible({ timeout: 8_000 });
    await statusSelect.selectOption("PENDENTE_CONFIRMACAO");

    await expect(page).toHaveURL(/status=PENDENTE_CONFIRMACAO/, {
      timeout: 8_000,
    });
  });

  test("deve exibir link de detalhe para cada movimentação listada", async ({
    page,
  }) => {
    const rows = page.locator("table tbody tr");
    const count = await rows.count().catch(() => 0);
    if (count > 0) {
      // Primeira linha deve ter link para /movimentacao/[id]
      const link = rows.first().getByRole("link");
      const href = await link.getAttribute("href");
      expect(href).toMatch(/\/movimentacao\//);
    }
  });
});
```

- [ ] **Step 2: Executar**

```bash
npx playwright test e2e/historico.spec.ts --project=chromium
```

Esperado: todos os testes passam.

- [ ] **Step 3: Commit**

```bash
git add e2e/historico.spec.ts
git commit -m "test(e2e): cobrir página Histórico de Movimentações"
```

---

## Task 10: Executar suite completa e verificar

- [ ] **Step 1: Executar todos os testes E2E**

```bash
npx playwright test --project=chromium
```

Esperado: todos os testes passam. Se algum falhar por falta de dados de seed, rodar:

```bash
npx prisma db seed
```

e repetir.

- [ ] **Step 2: Commit final se necessário**

Se houver ajustes de último momento:

```bash
git add -p
git commit -m "test(e2e): ajustes finais na suite de testes"
```
