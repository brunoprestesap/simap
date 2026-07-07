import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { executarSincronizacaoSicam } from "@/server/services/sicam-sync";
import { SicamOracleError } from "@/lib/sicam-oracle/errors";

const SETE_DIAS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * POST /api/cron/sicam-sync
 *
 * Endpoint chamado pelo cron do VPS às 2h diariamente.
 * Requer header `Authorization: Bearer <CRON_SECRET>`.
 *
 * Determina o modo automaticamente:
 * - DIFERENCIAL quando há um sync CONCLUIDA nos últimos 7 dias.
 * - COMPLETA caso contrário (primeiro sync, ou gap > 7 dias por falhas consecutivas).
 *
 * Não usa `export const runtime = 'edge'` — mantém Node.js para oracledb.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const secret = env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const ultimoConcluido = await prisma.sincronizacaoSicam.findFirst({
      where: { status: "CONCLUIDA" },
      orderBy: { finalizadoEm: "desc" },
      select: { finalizadoEm: true },
    });

    const agora = Date.now();
    const fazerDiferencial =
      ultimoConcluido?.finalizadoEm != null &&
      agora - ultimoConcluido.finalizadoEm.getTime() < SETE_DIAS_MS;

    const modo = fazerDiferencial ? ("DIFERENCIAL" as const) : ("COMPLETA" as const);
    const desde = fazerDiferencial ? ultimoConcluido!.finalizadoEm! : undefined;

    const resultado = await executarSincronizacaoSicam({ automatica: true, modo, desde });

    return NextResponse.json({ ok: true, modo, ...resultado });
  } catch (err) {
    const oraCode = err instanceof SicamOracleError ? err.oraCode : null;
    const mensagem = err instanceof Error ? err.message : "Erro desconhecido";

    return NextResponse.json(
      { ok: false, error: mensagem, oraCode },
      { status: 500 },
    );
  }
}
