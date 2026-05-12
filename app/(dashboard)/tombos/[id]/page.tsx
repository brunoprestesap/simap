import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, CheckCircle2, XCircle, History } from "lucide-react";
import { requireRole } from "@/lib/auth-guard";
import { buscarTomboDetalhe } from "@/server/queries/tombo";
import type { TomboDetalhe } from "@/server/queries/tombo";
import {
  buscarSnapshotSicam,
  type SnapshotSicamResult,
  type TomboDivergencia,
} from "@/server/queries/sicam";
import { nomeResponsavelExibicao } from "@/lib/tombo-responsavel";
import { formatDateBR } from "@/lib/format";
import { MOVIMENTACAO_STATUS_EM_ANDAMENTO } from "@/lib/movimentacao-status";
import type { ReactNode } from "react";

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
  children: ReactNode;
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

function SicamRow({
  label,
  sicamValue,
  localValue,
  divergente,
}: {
  label: string;
  sicamValue: string | null | undefined;
  localValue?: string | null | undefined;
  divergente?: boolean;
}) {
  if (!sicamValue) return null;
  return (
    <div className="flex items-start justify-between gap-4 border-t border-border px-4 py-2.5">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <div className="flex flex-col items-end gap-0.5">
        <span
          className={`text-right text-sm font-medium ${divergente ? "text-jf-warning" : "text-foreground"}`}
        >
          {sicamValue}
          {divergente && (
            <AlertTriangle className="ml-1 inline-block h-3.5 w-3.5" />
          )}
        </span>
        {divergente && localValue && (
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            SIMAP: {localValue}
          </span>
        )}
      </div>
    </div>
  );
}

const DIVERGENCIA_LABEL: Record<TomboDivergencia, string> = {
  unidade: "Unidade",
  setor: "Setor",
  responsavel: "Responsável",
  descricao: "Descrição",
};

function SicamSnapshotSection({
  snapshot,
  tomboLocal,
}: {
  snapshot: SnapshotSicamResult;
  tomboLocal: TomboDetalhe;
}) {
  const titulo = "SICAM (tempo real)";

  if (snapshot.status === "indisponivel") {
    return (
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-start gap-3 px-4 py-3">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {titulo}
            </p>
            <p className="mt-1 text-sm text-foreground">
              SICAM indisponível agora — dados acima vêm do cache local SIMAP.
            </p>
            {snapshot.oraCode ? (
              <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                ORA-{String(snapshot.oraCode).padStart(5, "0")}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (snapshot.status === "nao_encontrado") {
    return (
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-start gap-3 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-jf-warning" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {titulo}
            </p>
            <p className="mt-1 text-sm text-foreground">
              Tombo não encontrado no SICAM — pode ter sido baixado (saída) ou
              ser do tipo livro.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const dados = snapshot.dados;
  if (!dados) return null;
  const divergencias = snapshot.divergencias ?? [];
  const consistente = divergencias.length === 0;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 px-4 pb-2 pt-3">
        {consistente ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-jf-green" />
        ) : (
          <AlertTriangle className="h-4 w-4 shrink-0 text-jf-warning" />
        )}
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {titulo}
        </p>
        {!consistente && (
          <span className="ml-auto rounded-full bg-jf-warning/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-jf-warning">
            {divergencias.map((d) => DIVERGENCIA_LABEL[d]).join(" · ")}
          </span>
        )}
      </div>

      <SicamRow
        label="Unidade (código)"
        sicamValue={dados.codLotacao !== null ? String(dados.codLotacao) : null}
        localValue={tomboLocal.unidade?.codigo}
        divergente={divergencias.includes("unidade")}
      />
      <SicamRow
        label="Setor"
        sicamValue={
          dados.codSetor !== null
            ? `${dados.codSetor}${dados.nomeSetor ? ` — ${dados.nomeSetor}` : ""}`
            : dados.nomeSetor
        }
        localValue={tomboLocal.setor?.codigo ?? tomboLocal.setor?.nome}
        divergente={divergencias.includes("setor")}
      />
      <SicamRow
        label="Responsável (matrícula)"
        sicamValue={dados.matriculaResponsavel}
        localValue={
          tomboLocal.usuarioResponsavel?.matricula ??
          tomboLocal.matriculaResponsavel
        }
        divergente={divergencias.includes("responsavel")}
      />
      <SicamRow
        label="Tipo"
        sicamValue={dados.tipoTombo}
        divergente={false}
      />
      <SicamRow
        label="Data do termo"
        sicamValue={dados.dataTermo ? formatDateBR(dados.dataTermo) : null}
        divergente={false}
      />
      <SicamRow
        label="Termo assinado"
        sicamValue={dados.termoAssinado ? "Sim" : "Não (rascunho)"}
        divergente={false}
      />

      <p className="border-t border-border px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        Consultado em {formatDateBR(snapshot.consultadoEm)}
      </p>
    </div>
  );
}

function HistoricoTermoSicamSection({
  historico,
}: {
  historico: TomboDetalhe["historicosTermo"];
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pb-2 pt-3">
        <History className="h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Histórico SICAM
        </p>
        {historico.length > 0 && (
          <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            {historico.length} registro{historico.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Empty state */}
      {historico.length === 0 ? (
        <div className="flex flex-col items-center gap-2 border-t border-border px-4 py-6 text-center">
          <History className="h-7 w-7 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            Nenhum histórico sincronizado.
          </p>
          <p className="text-[11px] text-muted-foreground/60">
            Execute a sincronização em{" "}
            <span className="font-medium">/admin/sicam</span>.
          </p>
        </div>
      ) : (
        <div className="border-t border-border">
          {historico.map((termo, index) => {
            const isMostRecent = index === 0;
            const isLast = index === historico.length - 1;
            const localizacao = [
              termo.codLotacao ? `Unid. ${termo.codLotacao}` : null,
              termo.nomeSetor ?? (termo.codSetor ? `Setor ${termo.codSetor}` : null),
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <div key={termo.id} className="flex gap-3 px-4 py-3">
                {/* Coluna da timeline */}
                <div className="flex flex-col items-center">
                  <div
                    className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-card ${
                      isMostRecent ? "bg-primary" : "bg-border"
                    }`}
                  />
                  {!isLast && <div className="mt-1 w-px flex-1 bg-border" />}
                </div>

                {/* Conteúdo */}
                <div className={`min-w-0 flex-1 ${!isLast ? "pb-3" : ""}`}>
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-sm font-medium ${
                        isMostRecent ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {termo.dtTermo
                        ? formatDateBR(termo.dtTermo)
                        : "Data desconhecida"}
                    </p>
                    {isMostRecent && (
                      <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                        atual
                      </span>
                    )}
                    <span className="ml-auto text-[10px] tabular-nums text-muted-foreground/50">
                      T{termo.nuTermo}/{termo.anTermo}
                    </span>
                  </div>
                  {localizacao && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {localizacao}
                    </p>
                  )}
                  {termo.matriculaResp && (
                    <p className="mt-0.5 text-xs text-muted-foreground/70">
                      {termo.matriculaResp}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
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

  // SICAM consultado serialmente (precisa do numero local). Latência aceitável
  // em uma tela de leitura — `buscarSnapshotSicam` nunca lança, sempre devolve
  // estado renderizável (ok / nao_encontrado / indisponivel).
  const sicamSnapshot = await buscarSnapshotSicam(tombo.numero, {
    local: {
      numero: tombo.numero,
      descricaoMaterial: tombo.descricaoMaterial,
      unidade: tombo.unidade,
      setor: tombo.setor,
      usuarioResponsavel: tombo.usuarioResponsavel,
      matriculaResponsavel: tombo.matriculaResponsavel,
    },
  });

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
        <InfoSection titulo="Localização (SIMAP)">
          {tombo.unidade && (
            <InfoRow label="Unidade" value={tombo.unidade.descricao} />
          )}
          {tombo.setor && <InfoRow label="Setor" value={tombo.setor.nome} />}
        </InfoSection>
      )}

      <SicamSnapshotSection snapshot={sicamSnapshot} tomboLocal={tombo} />

      <HistoricoTermoSicamSection historico={tombo.historicosTermo} />

      {nomeResp && (
        <InfoSection titulo="Responsável">
          <InfoRow label="Nome" value={nomeResp} />
          {(tombo.usuarioResponsavel?.matricula ||
            tombo.matriculaResponsavel) && (
            <InfoRow
              label="Matrícula"
              value={
                tombo.usuarioResponsavel?.matricula ??
                tombo.matriculaResponsavel ??
                ""
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
