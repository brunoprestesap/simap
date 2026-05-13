import { requireRole } from "@/lib/auth-guard";
import { listarUnidadesAtivas, listarTodasUnidades } from "@/server/queries/unidade";
import { prisma } from "@/lib/prisma";
import { MovimentacaoLoteView } from "@/components/views/MovimentacaoLoteView";
import type { UnidadeResumo } from "@/lib/movimentacao-types";

export const metadata = { title: "Movimentação em Lote — SIMAP" };

export default async function MovimentacaoLotePage() {
  const user = await requireRole(["SERVIDOR_SEMAP", "SERVIDOR_RESPONSAVEL"]);

  const [unidadesAtivas, todasUnidades] = await Promise.all([
    listarUnidadesAtivas(),
    listarTodasUnidades(),
  ]);

  let unidadeFixa: UnidadeResumo | undefined;
  if (user.perfil === "SERVIDOR_RESPONSAVEL") {
    const usuario = await prisma.usuario.findUnique({
      where: { id: user.id },
      select: { unidade: { select: { id: true, codigo: true, descricao: true } } },
    });
    unidadeFixa = usuario?.unidade ?? undefined;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Movimentação em Lote</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Selecione os tombos e registre a movimentação para outra unidade.
        </p>
      </div>
      <MovimentacaoLoteView
        perfilAtual={user.perfil as "SERVIDOR_SEMAP" | "SERVIDOR_RESPONSAVEL"}
        unidadesAtivas={unidadesAtivas}
        todasUnidades={todasUnidades}
        unidadeFixa={unidadeFixa}
      />
    </div>
  );
}
