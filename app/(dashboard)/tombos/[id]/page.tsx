import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth-guard";
import { buscarTomboDetalhe } from "@/server/queries/tombo";
import type { TomboDetalhe } from "@/server/queries/tombo";
import { nomeResponsavelExibicao } from "@/lib/tombo-responsavel";
import { formatDateBR } from "@/lib/format";
import { MOVIMENTACAO_STATUS_EM_ANDAMENTO } from "@/lib/movimentacao-status";

const STATUS_LABEL: Record<string, string> = {
  PENDENTE_CONFIRMACAO: "Movimentação registrada",
  CONFIRMADA_ORIGEM: "Confirmada na origem",
  REGISTRADA_SICAM: "Registrada no SICAM",
  NAO_CONFIRMADA: "Não confirmada",
};

const STATUS_DOT_COLOR: Record<string, string> = {
  PENDENTE_CONFIRMACAO: "bg-jf-warning",
  CONFIRMADA_ORIGEM: "bg-primary",
  REGISTRADA_SICAM: "bg-secondary",
  NAO_CONFIRMADA: "bg-destructive",
};

function InfoSection({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <p className="px-4 pb-2 pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {titulo}
      </p>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-border px-4 py-2.5">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium text-foreground">
        {value}
      </span>
    </div>
  );
}

function HeroCard({
  tombo,
  emMovimentacao,
}: {
  tombo: TomboDetalhe;
  emMovimentacao: boolean;
}) {
  const statusLabel = !tombo.ativo
    ? "Inativo"
    : emMovimentacao
      ? "Em movimentação"
      : "Ativo";

  return (
    <div className="rounded-2xl bg-primary p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="font-mono text-2xl font-extrabold leading-none text-white">
          {tombo.numero}
        </span>
        <span className="shrink-0 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold text-white">
          {statusLabel}
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-white/80">
        {tombo.descricaoMaterial}
      </p>
    </div>
  );
}

function MovimentacaoHistorico({
  itens,
}: {
  itens: TomboDetalhe["itensMovimentacao"];
}) {
  return (
    <InfoSection titulo="Histórico de Movimentações">
      {itens.map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-3 border-t border-border px-4 py-3"
        >
          <div
            className={`mt-1 h-2 w-2 shrink-0 rounded-full ${STATUS_DOT_COLOR[item.movimentacao.status] ?? "bg-muted"}`}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              {STATUS_LABEL[item.movimentacao.status] ??
                item.movimentacao.status}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDateBR(item.movimentacao.createdAt)} ·{" "}
              {item.movimentacao.unidadeOrigem.codigo} →{" "}
              {item.movimentacao.unidadeDestino.codigo}
            </p>
            <p className="text-xs text-muted-foreground">
              {item.movimentacao.tecnico.nome}
            </p>
          </div>
        </div>
      ))}
    </InfoSection>
  );
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TomboDetalhePage({ params }: Props) {
  const user = await requireRole(["TECNICO_TI", "SERVIDOR_SEMAP"]);
  const { id } = await params;

  const tombo = await buscarTomboDetalhe(id);
  if (!tombo) notFound();

  const emMovimentacao = tombo.itensMovimentacao.some((item) =>
    (MOVIMENTACAO_STATUS_EM_ANDAMENTO as readonly string[]).includes(
      item.movimentacao.status,
    ),
  );

  const nomeResp = nomeResponsavelExibicao(tombo);

  return (
    <div className="space-y-4">
      <Link
        href="/tombos"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Tombos
      </Link>

      <HeroCard tombo={tombo} emMovimentacao={emMovimentacao} />

      {(tombo.unidade || tombo.setor) && (
        <InfoSection titulo="Localização">
          {tombo.unidade && (
            <InfoRow label="Unidade" value={tombo.unidade.descricao} />
          )}
          {tombo.setor && (
            <InfoRow label="Setor" value={tombo.setor.nome} />
          )}
        </InfoSection>
      )}

      {nomeResp && (
        <InfoSection titulo="Responsável">
          <InfoRow label="Nome" value={nomeResp} />
          {(tombo.usuarioResponsavel?.matricula ||
            tombo.matriculaResponsavel) && (
            <InfoRow
              label="Matrícula"
              value={
                tombo.usuarioResponsavel?.matricula ??
                tombo.matriculaResponsavel!
              }
            />
          )}
        </InfoSection>
      )}

      {(tombo.nomeFornecedor || tombo.codigoFornecedor) && (
        <InfoSection titulo="Fornecedor">
          {tombo.nomeFornecedor && (
            <InfoRow label="Nome" value={tombo.nomeFornecedor} />
          )}
          {tombo.codigoFornecedor && (
            <InfoRow label="Código" value={tombo.codigoFornecedor} />
          )}
        </InfoSection>
      )}

      {tombo.itensMovimentacao.length > 0 && (
        <MovimentacaoHistorico itens={tombo.itensMovimentacao} />
      )}

      {user.perfil === "TECNICO_TI" && (
        <div
          className="sticky bottom-16 -mx-4 border-t border-border bg-background px-4 py-4 md:bottom-0 md:-mx-6 md:px-6"
          style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
        >
          <Link
            href="/movimentacao/nova"
            className="flex w-full items-center justify-center rounded-xl bg-primary py-3 text-sm font-bold text-white transition-colors hover:bg-primary/90"
          >
            + Iniciar Movimentação
          </Link>
        </div>
      )}
    </div>
  );
}
