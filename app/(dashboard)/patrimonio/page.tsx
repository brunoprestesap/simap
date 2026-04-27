import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { contarPendentesConfirmacao } from "@/server/queries/patrimonio";
import { PatrimonioList } from "@/components/views/PatrimonioList";

export default async function PatrimonioPage() {
  const user = await requireAuth();

  const usuarioLote = await prisma.usuario.findFirst({
    where: { matricula: user.matricula, ativo: true, unidadeId: { not: null } },
    include: {
      unidade: { select: { id: true, descricao: true } },
    },
  });

  if (!usuarioLote?.unidadeId || !usuarioLote.unidade) {
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

  const pendentesConfirmacao = await contarPendentesConfirmacao(usuarioLote.unidadeId);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">
        Meus Patrimônios
      </h2>
      <PatrimonioList
        unidadeId={usuarioLote.unidadeId}
        unidadeNome={usuarioLote.unidade.descricao}
        pendentesConfirmacao={pendentesConfirmacao}
      />
    </div>
  );
}
