import { requireRole } from "@/lib/auth-guard";
import { listarHistoricoImportacoes } from "@/server/queries/importacao";
import { EmptyState } from "@/components/common/EmptyState";
import { formatDateTimeBR } from "@/lib/format";

export default async function HistoricoImportacoesPage() {
  await requireRole(["GESTOR_ADMIN"]);

  const importacoes = await listarHistoricoImportacoes();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Histórico de importações
        </h2>
        <p className="text-sm text-muted-foreground">
          Registro de todos os arquivos CSV importados
        </p>
      </div>

      {importacoes.length === 0 ? (
        <EmptyState
          titulo="Nenhuma importação"
          mensagem="Nenhum arquivo CSV foi importado ainda."
          ctaLabel="Importar CSV"
          ctaHref="/importacao"
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                  Data
                </th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                  Importado por
                </th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                  Arquivo
                </th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                  Novos
                </th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                  Atualizados
                </th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                  Erros
                </th>
              </tr>
            </thead>
            <tbody>
              {importacoes.map((imp) => (
                <tr
                  key={imp.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateTimeBR(imp.createdAt)}
                  </td>
                  <td className="px-4 py-3">{imp.importadoPor.nome}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {imp.nomeArquivo}
                  </td>
                  <td className="px-4 py-3 text-right text-secondary font-medium">
                    {imp.novos}
                  </td>
                  <td className="px-4 py-3 text-right text-primary font-medium">
                    {imp.atualizados}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {imp.erros > 0 ? (
                      <span className="text-destructive">{imp.erros}</span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
