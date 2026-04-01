import { requireRole } from "@/lib/auth-guard";
import { TombosList } from "@/components/views/TombosList";

export default async function TombosPage() {
  await requireRole(["TECNICO_TI", "SERVIDOR_SEMAP"]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Tombos</h2>
        <p className="text-sm text-muted-foreground">
          Consulta e gerenciamento de tombos patrimoniais
        </p>
      </div>
      <TombosList />
    </div>
  );
}
