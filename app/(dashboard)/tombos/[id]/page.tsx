import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  History,
  MapPin,
  User,
  Package,
  Truck,
  Building2,
  Clock,
} from "lucide-react";
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
  CONFIRMADA_DESTINO: "Recebimento confirmado pelo destino",
  REGISTRADA_SICAM: "Registrada no SICAM",
  NAO_CONFIRMADA: "Não confirmada",
};

const STATUS_DOT_COLOR: Record<string, string> = {
  PENDENTE_CONFIRMACAO: "bg-jf-warning",
  CONFIRMADA_DESTINO: "bg-primary",
  REGISTRADA_SICAM: "bg-secondary",
  NAO_CONFIRMADA: "bg-destructive",
};

function InfoSection({
  titulo,
  icon,
  children,
}: {
  titulo: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-2 px-4 pb-2 pt-3">
        {icon && (
          <span className="shrink-0 text-muted-foreground/70">{icon}</span>
        )}
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {titulo}
        </p>
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-border px-4 py-2.5">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="min-w-0 wrap-break-word text-right text-sm font-medium text-foreground">
        {value}
      </span>
    </div>
  );
}

function HeroCard({
  tombo,
  statusMovimentacao,
}: {
  tombo: TomboDetalhe;
  statusMovimentacao: "pendente" | "confirmado" | null;
}) {
  const statusLabel = !tombo.ativo
    ? "Inativo"
    : statusMovimentacao === "pendente"
      ? "Em movimentação"
      : statusMovimentacao === "confirmado"
        ? "Aguardando SICAM"
        : "Ativo";

  const statusClass = !tombo.ativo
    ? "bg-destructive/25 text-white"
    : statusMovimentacao === "pendente"
      ? "bg-jf-warning/30 text-white"
      : statusMovimentacao === "confirmado"
        ? "bg-primary/50 text-white"
        : "bg-white/20 text-white";

  return (
    <div className="relative overflow-hidden rounded-2xl bg-primary p-5">
      {/* Decorative rings */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/4" />
      <div className="pointer-events-none absolute -right-3 -top-3 h-20 w-20 rounded-full bg-white/6" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
            <Package className="h-4 w-4 text-white" />
          </div>
          <span className="font-mono text-2xl font-extrabold leading-none tracking-tight text-white">
            {tombo.numero}
          </span>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass}`}
        >
          {statusLabel}
        </span>
      </div>
      <p className="relative mt-3 text-sm leading-relaxed text-white/75">
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
      <div className="flex min-w-0 flex-col items-end gap-0.5">
        <span
          className={`min-w-0 wrap-break-word text-right text-sm font-medium ${divergente ? "text-jf-warning" : "text-foreground"}`}
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
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-start gap-3 px-4 py-3.5">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {titulo}
            </p>
            <p className="mt-1 text-sm text-foreground">
              SICAM indisponível agora — dados acima vêm do cache local SIMAP.
            </p>
            {snapshot.oraCode ? (
              <p className="mt-1 inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
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
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-start gap-3 px-4 py-3.5">
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
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
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
        label="Unidade"
        sicamValue={
          dados.descLotacao ??
          (dados.codLotacao !== null ? String(dados.codLotacao) : null)
        }
        localValue={tomboLocal.unidade?.descricao ?? tomboLocal.unidade?.codigo}
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
      <SicamRow label="Tipo" sicamValue={dados.tipoTombo} divergente={false} />
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

      <div className="flex items-center gap-1.5 border-t border-border px-4 py-2">
        <Clock className="h-3 w-3 text-muted-foreground/50" />
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Consultado em {formatDateBR(snapshot.consultadoEm)}
        </p>
      </div>
    </div>
  );
}

function HistoricoTermoSicamSection({
  historico,
  unidadesHistorico,
}: {
  historico: TomboDetalhe["historicosTermo"];
  unidadesHistorico: TomboDetalhe["unidadesHistorico"];
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-2 px-4 pb-2 pt-3">
        <History className="h-4 w-4 shrink-0 text-muted-foreground/70" />
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Histórico SICAM
        </p>
        {historico.length > 0 && (
          <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            {historico.length} registro{historico.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {historico.length === 0 ? (
        <div className="flex flex-col items-center gap-2 border-t border-border px-4 py-6 text-center">
          <History className="h-7 w-7 text-muted-foreground/25" />
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
            const descUnidade = termo.codLotacao
              ? (unidadesHistorico[String(termo.codLotacao)] ??
                `Unid. ${termo.codLotacao}`)
              : null;
            const localizacao = [
              descUnidade,
              termo.nomeSetor ??
                (termo.codSetor ? `Setor ${termo.codSetor}` : null),
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <div key={termo.id} className="flex gap-3 px-4 py-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-card ${
                      isMostRecent ? "bg-primary" : "bg-border"
                    }`}
                  />
                  {!isLast && <div className="mt-1 w-px flex-1 bg-border" />}
                </div>

                <div className={`min-w-0 flex-1 ${!isLast ? "pb-3" : ""}`}>
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-sm font-medium ${
                        isMostRecent
                          ? "text-foreground"
                          : "text-muted-foreground"
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
                    <span className="ml-auto shrink-0 text-[10px] tabular-nums text-muted-foreground/50">
                      T{termo.nuTermo}/{termo.anTermo}
                    </span>
                  </div>
                  {localizacao && (
                    <p className="mt-0.5 min-w-0 wrap-break-word text-xs text-muted-foreground">
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
    <InfoSection
      titulo="Histórico de Movimentações"
      icon={<Truck className="h-4 w-4" />}
    >
      {itens.map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-3 border-t border-border px-4 py-3"
        >
          <div
            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${STATUS_DOT_COLOR[item.movimentacao.status] ?? "bg-muted"}`}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              {STATUS_LABEL[item.movimentacao.status] ??
                item.movimentacao.status}
            </p>
            <p className="mt-0.5 min-w-0 wrap-break-word text-xs text-muted-foreground">
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

  const statusMovimentacao = tombo.itensMovimentacao.some(
    (item) => item.movimentacao.status === "PENDENTE_CONFIRMACAO",
  )
    ? "pendente"
    : tombo.itensMovimentacao.some(
          (item) => item.movimentacao.status === "CONFIRMADA_DESTINO",
        )
      ? "confirmado"
      : null;

  const nomeResp = nomeResponsavelExibicao(tombo);

  const isTecnico = user.perfil === "TECNICO_TI";

  return (
    <>
      <div className={`space-y-4 ${isTecnico ? "pb-28 md:pb-4" : "pb-2"}`}>
        <Link
          href="/tombos"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Tombos
        </Link>

        <HeroCard tombo={tombo} statusMovimentacao={statusMovimentacao} />

        {(tombo.unidade || tombo.setor) && (
          <InfoSection
            titulo="Localização (SIMAP)"
            icon={<MapPin className="h-4 w-4" />}
          >
            {tombo.unidade && (
              <InfoRow label="Unidade" value={tombo.unidade.descricao} />
            )}
            {tombo.setor && <InfoRow label="Setor" value={tombo.setor.nome} />}
          </InfoSection>
        )}

        <SicamSnapshotSection snapshot={sicamSnapshot} tomboLocal={tombo} />

        <HistoricoTermoSicamSection
          historico={tombo.historicosTermo}
          unidadesHistorico={tombo.unidadesHistorico}
        />

        {nomeResp && (
          <InfoSection titulo="Responsável" icon={<User className="h-4 w-4" />}>
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
          <InfoSection
            titulo="Fornecedor"
            icon={<Building2 className="h-4 w-4" />}
          >
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
      </div>

      {/* Desktop: botão estático ao fim do conteúdo */}
      {isTecnico && (
        <div className="mt-4 hidden md:block">
          <Link
            href="/movimentacao/nova"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white transition-colors hover:bg-primary/90 active:scale-[0.98]"
          >
            <Truck className="h-4 w-4" />
            Iniciar Movimentação
          </Link>
        </div>
      )}

      {/* Mobile: fixed acima do BottomNav, fora do scroll container */}
      {isTecnico && (
        <div
          className="fixed bottom-16 inset-x-0 z-40 border-t border-border bg-background px-4 py-3 md:hidden"
          style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
        >
          <Link
            href="/movimentacao/nova"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white transition-colors hover:bg-primary/90 active:scale-[0.98]"
          >
            <Truck className="h-4 w-4" />
            Iniciar Movimentação
          </Link>
        </div>
      )}
    </>
  );
}
