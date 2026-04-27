import { prisma } from "@/lib/prisma";
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { formatDateTimeBR } from "@/lib/format";
import { ConfirmacaoButton } from "./ConfirmacaoButton";

export default async function ConfirmarPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const movimentacao = await prisma.movimentacao.findUnique({
    where: { tokenConfirmacao: token },
    include: {
      unidadeOrigem: true,
      unidadeDestino: true,
      tecnico: true,
      itens: {
        include: {
          tombo: true,
        },
      },
    },
  });

  // Token not found
  if (!movimentacao) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
        <h2 className="mt-4 text-lg font-semibold text-foreground">
          Link inválido
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Este link de confirmação não foi encontrado.
        </p>
      </div>
    );
  }

  // Already confirmed
  if (movimentacao.status !== "PENDENTE_CONFIRMACAO") {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-secondary" />
        <h2 className="mt-4 text-lg font-semibold text-foreground">
          Movimentação já confirmada
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {movimentacao.confirmadoPorNome && (
            <>
              Confirmada por <strong>{movimentacao.confirmadoPorNome}</strong>
            </>
          )}
          {movimentacao.confirmadoEm && (
            <>
              {" "}
              em{" "}
              {formatDateTimeBR(movimentacao.confirmadoEm)}
            </>
          )}
        </p>
      </div>
    );
  }

  // Token expired
  if (new Date() > movimentacao.tokenExpiraEm) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <Clock className="mx-auto h-12 w-12 text-jf-warning" />
        <h2 className="mt-4 text-lg font-semibold text-foreground">
          Este link expirou
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          O prazo para confirmação desta movimentação expirou. Entre em contato
          com a SEMAP para mais informações.
        </p>
      </div>
    );
  }

  // Valid — show confirmation card
  const dataFormatada = formatDateTimeBR(movimentacao.createdAt);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Confirmação de Entrada
        </h2>

        {/* Origin → Destination */}
        <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3 mb-4">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Origem</p>
            <p className="text-sm font-semibold text-foreground">
              {movimentacao.unidadeOrigem.descricao}
            </p>
          </div>
          <span className="text-primary font-bold">→</span>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Destino</p>
            <p className="text-sm font-semibold text-foreground">
              {movimentacao.unidadeDestino.descricao}
            </p>
          </div>
        </div>

        {/* Info */}
        <div className="text-xs text-muted-foreground space-y-1 mb-4">
          <p>
            <strong>Técnico:</strong> {movimentacao.tecnico.nome}
          </p>
          <p>
            <strong>Data:</strong> {dataFormatada}
          </p>
        </div>

        {/* Tombos list */}
        <div className="border border-border rounded-lg divide-y divide-border">
          {movimentacao.itens.map((item) => (
            <div key={item.id} className="px-3 py-2.5">
              <p className="text-sm font-bold font-mono">
                {item.tombo.numero}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.tombo.descricaoMaterial}
              </p>
            </div>
          ))}
        </div>
      </div>

      <ConfirmacaoButton
        token={token}
        totalTombos={movimentacao.itens.length}
      />
    </div>
  );
}
