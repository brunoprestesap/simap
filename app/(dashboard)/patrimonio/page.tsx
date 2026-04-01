import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { contarPendentesConfirmacao } from "@/server/queries/patrimonio";
import { PatrimonioList } from "@/components/views/PatrimonioList";

export default async function PatrimonioPage() {
  const user = await requireAuth();

  // Find the user's associated servidor/unidade
  const servidor = await prisma.servidor.findFirst({
    where: { matricula: user.matricula, ativo: true },
    include: {
      unidade: { select: { id: true, descricao: true } },
    },
  });

  if (!servidor) {
    return (
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-foreground">
          Meus Patrimônios
        </h2>
        <p className="text-sm text-muted-foreground">
          Você não está vinculado a nenhuma unidade. Contate o administrador.
        </p>
      </div>
    );
  }

  const pendentesConfirmacao = await contarPendentesConfirmacao(servidor.unidadeId);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">
        Meus Patrimônios
      </h2>
      <PatrimonioList
        unidadeId={servidor.unidadeId}
        unidadeNome={servidor.unidade.descricao}
        pendentesConfirmacao={pendentesConfirmacao}
      />
    </div>
  );
}
