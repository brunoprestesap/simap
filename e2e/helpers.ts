// e2e/helpers.ts
import "dotenv/config";
import type { Page } from "@playwright/test";
import type { QueryResultRow } from "pg";
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

export async function queryDb<T extends QueryResultRow>(
  sql: string,
  params?: unknown[],
): Promise<T[]> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL não definida");
  const client = new pg.Client({ connectionString });
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
