import { requireAuth } from "@/lib/auth-guard";
import { NovaMovimentacaoWizard } from "./NovaMovimentacaoWizard";
import { listarUnidadesAtivas } from "@/server/queries/unidade";

export default async function NovaMovimentacaoPage() {
  const user = await requireAuth();

  const unidadesIniciais = await listarUnidadesAtivas();

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-20">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Nova Movimentação
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Registre a saída física dos bens capturando os tombos e definindo o destino.
          </p>
        </div>
      </header>

      <NovaMovimentacaoWizard
        tecnicoNome={user.nome}
        unidadesIniciais={unidadesIniciais}
      />
    </div>
  );
}
