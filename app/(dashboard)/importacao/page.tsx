import { requireRole } from "@/lib/auth-guard";
import { ImportacaoWizard } from "./ImportacaoWizard";

export default async function ImportacaoPage() {
  await requireRole(["GESTOR_ADMIN"]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Importação CSV do SICAM
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Importe a base de tombos patrimoniais a partir do arquivo CSV exportado
          do SICAM.
        </p>
      </div>

      <ImportacaoWizard />
    </div>
  );
}
