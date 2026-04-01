import { requireAuth } from "@/lib/auth-guard";
import { HistoricoMovimentacoes } from "@/components/views/HistoricoMovimentacoes";

export default async function HistoricoPage() {
  await requireAuth();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Histórico de Movimentações
        </h2>
        <p className="text-sm text-muted-foreground">
          Consulte todas as movimentações registradas no sistema
        </p>
      </div>
      <HistoricoMovimentacoes />
    </div>
  );
}
