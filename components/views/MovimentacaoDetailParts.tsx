import type { buscarMovimentacaoDetalhada } from "@/server/queries/movimentacao";
import { formatDateBR } from "@/lib/format";
import { User } from "lucide-react";

export type MovimentacaoDetalhada = NonNullable<
  Awaited<ReturnType<typeof buscarMovimentacaoDetalhada>>
>;

function DataField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      <p className="text-sm text-foreground">{children}</p>
    </div>
  );
}

export function MovimentacaoDataCard({ mov }: { mov: MovimentacaoDetalhada }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 md:p-6 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <DataField label="Unidade de Origem">
          {mov.unidadeOrigem.descricao}{" "}
          <span className="text-muted-foreground font-mono text-xs">
            ({mov.unidadeOrigem.codigo})
          </span>
        </DataField>

        <DataField label="Unidade de Destino">
          {mov.unidadeDestino.descricao}{" "}
          <span className="text-muted-foreground font-mono text-xs">
            ({mov.unidadeDestino.codigo})
          </span>
        </DataField>

        <DataField label="Técnico Responsável">
          <span className="flex items-center gap-1">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            {mov.tecnico.nome}{" "}
            <span className="text-muted-foreground font-mono text-xs">
              ({mov.tecnico.matricula})
            </span>
          </span>
        </DataField>

        {mov.confirmadoPorNome && (
          <DataField label="Confirmado por">
            {mov.confirmadoPorNome}
            {mov.confirmadoEm && (
              <span className="text-muted-foreground text-xs ml-1">
                em {formatDateBR(mov.confirmadoEm)}
              </span>
            )}
          </DataField>
        )}

        {mov.protocoloSicam && (
          <>
            <DataField label="Protocolo SICAM">
              <span className="font-mono">{mov.protocoloSicam}</span>
            </DataField>
            <DataField label="Registrado SICAM por">
              {mov.registradoSicamPor?.nome || "—"}
              {mov.dataRegistroSicam && (
                <span className="text-muted-foreground text-xs ml-1">
                  em {formatDateBR(mov.dataRegistroSicam)}
                </span>
              )}
            </DataField>
          </>
        )}

        {mov.observacoesSicam && (
          <DataField label="Observações SICAM" className="sm:col-span-2">
            {mov.observacoesSicam}
          </DataField>
        )}
      </div>
    </div>
  );
}

export function TombosTable({
  itens,
}: {
  itens: MovimentacaoDetalhada["itens"];
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 md:p-6">
      <h3 className="text-sm font-semibold text-foreground mb-3">
        Tombos ({itens.length})
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="pb-2 text-left font-medium text-muted-foreground">
                Nº Tombo
              </th>
              <th className="pb-2 text-left font-medium text-muted-foreground">
                Descrição
              </th>
              <th className="pb-2 text-left font-medium text-muted-foreground">
                Setor
              </th>
              <th className="pb-2 text-left font-medium text-muted-foreground">
                Responsável
              </th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <tr
                key={item.id}
                className="border-b border-border last:border-0"
              >
                <td className="py-2.5 font-mono">{item.tombo.numero}</td>
                <td className="py-2.5">{item.tombo.descricaoMaterial}</td>
                <td className="py-2.5 text-muted-foreground">
                  {item.tombo.setor?.nome || "—"}
                </td>
                <td className="py-2.5 text-muted-foreground">
                  {item.tombo.servidorResponsavel?.nome ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
