import {
  Bell,
  ClipboardList,
  History,
  Monitor,
  Settings,
  Upload,
} from "lucide-react";
import { formatDateTimeBR, formatRelativeTime } from "@/lib/format";
import type { getSemapHomeData } from "@/server/queries/home";
import {
  HomeActionsGrid,
  HomeHero,
  HomePanel,
  MovementPreviewList,
  NotificationPreviewList,
  formatTempoMedioDias,
  UnifiedKPIGrid,
} from "./shared";

type SemapHomeData = Awaited<ReturnType<typeof getSemapHomeData>>;

interface SemapHomeProps {
  firstName: string;
  data: SemapHomeData;
}

export function SemapHome({ firstName, data }: SemapHomeProps) {
  return (
    <div className="space-y-8">
      <HomeHero
        perfil="SERVIDOR_SEMAP"
        title={`Olá, ${firstName}`}
        description="Gerencie a fila operacional e registros no SICAM."
        primaryAction={{
          href: "/backlog",
          label: "Abrir backlog",
          icon: ClipboardList,
        }}
        secondaryAction={{
          href: "/importacao",
          label: "Importar CSV",
        }}
      />

      <UnifiedKPIGrid
        items={[
          {
            label: "Fila ativa",
            value: data.backlogTotal,
            tone: data.backlogTotal > 0 ? "warning" : "default",
            href: "/backlog",
            actionLabel: "Ver backlog",
          },
          {
            label: "Pendentes no SICAM",
            value: data.pendentesSicam,
            tone: "secondary",
            href: "/backlog?status=CONFIRMADA_ORIGEM",
            actionLabel: "Ver prontas",
          },
          {
            label: "Pendentes de confirmação",
            value: data.pendentesConfirmacao,
            tone: "primary",
            href: "/backlog?status=PENDENTE_CONFIRMACAO",
            actionLabel: "Ver aguardando origem",
          },
          {
            label: "Tempo médio (dias)",
            value: formatTempoMedioDias(data.tempoMedioDias).replace(" dias", ""),
            tone: "default",
          }
        ]}
      />

      <HomeActionsGrid
        className="sm:grid-cols-2 xl:grid-cols-3"
        items={[
          {
            href: "/backlog",
            title: "Backlog SEMAP",
            description: "Assuma os próximos registros e filtre a fila operacional.",
            icon: ClipboardList,
          },
          {
            href: "/tombos",
            title: "Consultar tombos",
            description: "Confirme lotação, setor e responsável antes do registro.",
            icon: Monitor,
          },
          {
            href: "/importacao",
            title: "Importar CSV",
            description: "Atualize a base legada com um novo arquivo do SICAM.",
            icon: Upload,
          },
          {
            href: "/importacao/historico",
            title: "Histórico de importações",
            description: "Revise cargas anteriores e seus resultados.",
            icon: History,
          },
          {
            href: "/admin/unidades",
            title: "Administração",
            description: "Acesse rapidamente os cadastros operacionais.",
            icon: Settings,
          },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <MovementPreviewList
          title="Fila operacional"
          description="Itens mais recentes do backlog para acompanhamento imediato."
          items={data.backlogRecente.map((mov) => ({
            id: mov.id,
            href: `/movimentacao/${mov.id}`,
            eyebrow: `#${mov.codigo.slice(-6).toUpperCase()}${
              mov.tecnicoNome ? ` • Técnico: ${mov.tecnicoNome}` : ""
            }`,
            title: `${mov.origem} → ${mov.destino}`,
            description:
              mov.status === "CONFIRMADA_ORIGEM"
                ? "Pronta para registro no SICAM."
                : "Aguardando confirmação da origem.",
            meta: `${mov.tombos} ${mov.tombos === 1 ? "tombo" : "tombos"} • ${formatDateTimeBR(
              mov.createdAt,
            )}`,
            status: mov.status,
          }))}
          emptyTitle="Sem backlog operacional"
          emptyMessage="Quando surgirem novas movimentações, elas serão listadas aqui."
          action={{ href: "/backlog", label: "Abrir backlog completo" }}
        />

        <div className="space-y-6">
          <NotificationPreviewList
            title="Notificações"
            description="Avisos recentes relacionados a backlog, SICAM e importações."
            items={data.notificacoes}
            unreadCount={data.notificacoesNaoLidas}
            action={{ href: "/notificacoes", label: "Ver todas" }}
          />

          <HomePanel
            title="Última importação CSV"
            description="Resumo da sua carga mais recente no sistema."
            action={{ href: "/importacao/historico", label: "Ver histórico" }}
          >
            {data.ultimaImportacao ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {data.ultimaImportacao.nomeArquivo}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Importado {formatDateTimeBR(data.ultimaImportacao.createdAt)}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border border-border bg-background p-3">
                    <p className="text-xs font-medium text-muted-foreground">Novos</p>
                    <p className="mt-1 text-lg font-semibold text-secondary">
                      {data.ultimaImportacao.novos}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-3">
                    <p className="text-xs font-medium text-muted-foreground">Atualizados</p>
                    <p className="mt-1 text-lg font-semibold text-primary">
                      {data.ultimaImportacao.atualizados}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-3">
                    <p className="text-xs font-medium text-muted-foreground">Erros</p>
                    <p className="mt-1 text-lg font-semibold text-destructive">
                      {data.ultimaImportacao.erros}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center">
                <Bell className="mx-auto h-5 w-5 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium text-foreground">
                  Nenhuma importação recente
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Quando houver nova carga do SICAM, o resumo aparecerá aqui.
                </p>
              </div>
            )}
          </HomePanel>
        </div>
      </div>
    </div>
  );
}
