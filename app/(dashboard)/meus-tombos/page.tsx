import { requireAuth } from "@/lib/auth-guard";
import { MeusTombosList } from "@/components/views/MeusTombosList";
import { EmptyState } from "@/components/common/EmptyState";

export default async function MeusTombosPage() {
  const user = await requireAuth();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Meus tombos</h2>
        <p className="text-sm text-muted-foreground">
          Bens patrimoniais vinculados à sua matrícula
        </p>
      </div>
      {user.matricula ? (
        <MeusTombosList userId={user.id} matricula={user.matricula} />
      ) : (
        <EmptyState
          titulo="Matrícula não cadastrada"
          mensagem="Seu usuário não possui matrícula vinculada. Contate o administrador do sistema."
        />
      )}
    </div>
  );
}
