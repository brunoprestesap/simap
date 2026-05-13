/**
 * Diagnóstico de uma unidade: compara Oracle (SICAM + SARH) com o Postgres local.
 * Uso: npx tsx scripts/diagnose-unidade.ts <codigo>
 * Exemplo: npx tsx scripts/diagnose-unidade.ts 269
 */
import "dotenv/config";
import oracledb from "oracledb";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

const codigo = process.argv[2];
if (!codigo || !/^\d+$/.test(codigo)) {
  console.error("Uso: npx tsx scripts/diagnose-unidade.ts <codigo-numerico>");
  process.exit(1);
}
const codNum = Number(codigo);

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const instantClientDir = process.env.SICAM_ORACLE_INSTANT_CLIENT_DIR?.trim() || null;
  const configDir = process.env.SICAM_ORACLE_CONFIG_DIR?.trim() || null;

  if (instantClientDir) {
    oracledb.initOracleClient({
      libDir: instantClientDir,
      ...(configDir ? { configDir } : {}),
    });
    console.log(`[Oracle] Thick mode — Instant Client: ${instantClientDir}`);
  } else {
    console.log("[Oracle] Thin mode");
  }

  oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

  const connectString = process.env.SICAM_ORACLE_CONNECT_STRING!;
  const user = process.env.SICAM_ORACLE_USER!;
  const password = process.env.SICAM_ORACLE_PASSWORD!;

  let conn: oracledb.Connection | null = null;
  try {
    conn = await oracledb.getConnection({ user, password, connectString });
    await conn.execute(`ALTER SESSION SET CURRENT_SCHEMA = SICAM`);
    console.log(`\n[Oracle] Conectado como ${user} → CURRENT_SCHEMA=SICAM\n`);

    // ── 1. SICAM: tombos com CO_LOTA = <codigo> ──────────────────────────────
    const sicamRes = await conn.execute<{ TOTAL: number }>(
      `SELECT COUNT(*) AS TOTAL FROM TERMO tr WHERE tr.CO_LOTA = :cod`,
      { cod: codNum },
    );
    const totalTombos = (sicamRes.rows?.[0] as { TOTAL: number })?.TOTAL ?? 0;
    console.log(`[SICAM] TERMO.CO_LOTA = ${codNum} → ${totalTombos} registro(s) encontrado(s)`);

    // ── 2. SARH: RH_LOTACAO para o código ───────────────────────────────────
    const sarhRes = await conn.execute<{
      LOTA_COD_LOTACAO: number;
      LOTA_DSC_LOTACAO: string | null;
      LOTA_SIGLA_LOTACAO: string | null;
      LOTA_DAT_FIM: Date | null;
    }>(
      `SELECT LOTA_COD_LOTACAO, LOTA_DSC_LOTACAO, LOTA_SIGLA_LOTACAO, LOTA_DAT_FIM
         FROM SARH.RH_LOTACAO
        WHERE LOTA_COD_LOTACAO = :cod`,
      { cod: codNum },
    );

    if (!sarhRes.rows || sarhRes.rows.length === 0) {
      console.log(`[SARH]  RH_LOTACAO → NENHUM registro para código ${codNum}`);
    } else {
      for (const row of sarhRes.rows) {
        const r = row as {
          LOTA_COD_LOTACAO: number;
          LOTA_DSC_LOTACAO: string | null;
          LOTA_SIGLA_LOTACAO: string | null;
          LOTA_DAT_FIM: Date | null;
        };
        console.log(`[SARH]  LOTA_COD_LOTACAO : ${r.LOTA_COD_LOTACAO}`);
        console.log(`[SARH]  LOTA_DSC_LOTACAO  : ${r.LOTA_DSC_LOTACAO ?? "(null)"}`);
        console.log(`[SARH]  LOTA_SIGLA_LOTACAO: ${r.LOTA_SIGLA_LOTACAO ?? "(null)"}`);
        console.log(`[SARH]  LOTA_DAT_FIM      : ${r.LOTA_DAT_FIM ? r.LOTA_DAT_FIM.toISOString() : "(null = ativa)"}`);
      }
    }

    // ── 3. Subquery ROW_NUMBER — simula o JOIN usado pelo SIMAP ──────────────
    const sarhJoinRes = await conn.execute<{
      LOTA_COD_LOTACAO: number;
      LOTA_DSC_LOTACAO: string | null;
      LOTA_SIGLA_LOTACAO: string | null;
    }>(
      `SELECT rl.LOTA_COD_LOTACAO, rl.LOTA_DSC_LOTACAO, rl.LOTA_SIGLA_LOTACAO
         FROM (
           SELECT LOTA_COD_LOTACAO, LOTA_DSC_LOTACAO, LOTA_SIGLA_LOTACAO,
                  ROW_NUMBER() OVER (PARTITION BY LOTA_COD_LOTACAO
                                    ORDER BY LOTA_DAT_FIM DESC NULLS FIRST) rn
           FROM SARH.RH_LOTACAO
         ) rl
        WHERE rl.rn = 1 AND rl.LOTA_COD_LOTACAO = :cod`,
      { cod: codNum },
    );
    const joinRow = (sarhJoinRes.rows?.[0] as { LOTA_COD_LOTACAO: number; LOTA_DSC_LOTACAO: string | null; LOTA_SIGLA_LOTACAO: string | null } | undefined);
    if (joinRow) {
      console.log(`[SARH]  JOIN ROW_NUMBER → DSC="${joinRow.LOTA_DSC_LOTACAO}", SIGLA="${joinRow.LOTA_SIGLA_LOTACAO}"`);
    } else {
      console.log(`[SARH]  JOIN ROW_NUMBER → NENHUM resultado (código ${codNum} não existe no SARH)`);
    }

    // ── 4. SARH: verificar se existem registros históricos (DAT_FIM não null)
    const sarhHist = await conn.execute<{ TOTAL: number; MAX_FIM: Date | null }>(
      `SELECT COUNT(*) AS TOTAL, MAX(LOTA_DAT_FIM) AS MAX_FIM
         FROM SARH.RH_LOTACAO
        WHERE LOTA_COD_LOTACAO = :cod
          AND LOTA_DAT_FIM IS NOT NULL`,
      { cod: codNum },
    );
    const histRow = (sarhHist.rows?.[0] as { TOTAL: number; MAX_FIM: Date | null } | undefined);
    if (histRow && histRow.TOTAL > 0) {
      console.log(`[SARH]  Registros históricos (DAT_FIM IS NOT NULL): ${histRow.TOTAL} (último encerrado em ${histRow.MAX_FIM?.toISOString()})`);
    }

  } finally {
    if (conn) await conn.close();
  }

  // ── 4. Postgres local: unidade com codigo = '<codigo>' ────────────────────
  console.log("");
  const unidade = await prisma.unidade.findUnique({
    where: { codigo },
    include: {
      setores: { select: { id: true, codigo: true, nome: true }, take: 5 },
      _count: { select: { setores: true, tombos: true } },
    },
  });

  if (!unidade) {
    console.log(`[SIMAP] Unidade codigo="${codigo}" → NÃO encontrada no Postgres`);
  } else {
    console.log(`[SIMAP] id        : ${unidade.id}`);
    console.log(`[SIMAP] codigo    : ${unidade.codigo}`);
    console.log(`[SIMAP] descricao : ${unidade.descricao}`);
    console.log(`[SIMAP] ativo     : ${unidade.ativo}`);
    console.log(`[SIMAP] tombos    : ${unidade._count.tombos}`);
    console.log(`[SIMAP] setores   : ${unidade._count.setores}`);
    if (unidade.setores.length > 0) {
      console.log(`[SIMAP] primeiros setores:`);
      for (const s of unidade.setores) {
        console.log(`          ${s.codigo} — ${s.nome}`);
      }
    }
  }

  await prisma.$disconnect();

  // ── Conclusão ─────────────────────────────────────────────────────────────
  console.log("\n── Diagnóstico ──────────────────────────────────────────────");
  if (!unidade) {
    console.log("Unidade não existe no SIMAP. Rode o sync para criá-la.");
  } else if (unidade.descricao === codigo) {
    console.log(
      "descricao == codigo → unidade foi criada/sincronizada SEM descrição SARH.",
    );
    console.log(
      "Provável causa: SARH.RH_LOTACAO não tem registro ativo para esse código.",
    );
    console.log(
      "Ação: verifique se o resultado SARH acima retornou alguma linha.",
    );
  } else {
    console.log(`descricao já está enriquecida: "${unidade.descricao}"`);
    console.log("Nenhuma ação necessária.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
