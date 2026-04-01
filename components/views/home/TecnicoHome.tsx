import {
  Bell,
  History,
  Monitor,
  ScanLine,
  Upload,
} from "lucide-react";
import { formatDateTimeBR, formatRelativeTime } from "@/lib/format";
import type { getTecnicoHomeData } from "@/server/queries/home";
import {
  HomeActionsGrid,
  HomeHero,
  HomePanel,
  MovementPreviewList,
  NotificationPreviewList,
  UnifiedKPIGrid,
} from "./shared";

type TecnicoHomeData = Awaited<ReturnType<typeof getTecnicoHomeData>>;

interface TecnicoHomeProps {
  firstName: string;
  data: TecnicoHomeData;
}

export function TecnicoHome({ firstName, data }: TecnicoHomeProps) {
  return (
    <div className="space-y-8">
      <HomeHero
        perfil="TECNICO_TI"
        title={`Olá, ${firstName}`}
        description="Registre saídas e acompanhe movimentações patrimoniais."
        primaryAction={{
          href: "/movimentacao/nova",
          label: "Nova movimentação",
          icon: ScanLine,
        }}
        secondaryAction={{
          href: "/movimentacao/historico",
          label: "Ver histórico",
        }}
      />

      <UnifiedKPIGrid
        items={[
          {
            label: "Movimentações hoje",
            value: data.movHoje,
            tone: "default",
            href: "/movimentacao/historico",
            actionLabel: "Abrir histórico",
          },
          {
            label: "Pendentes de confirmação",
            value: data.pendentesConfirmacao,
            tone: "warning",
            href: "/movimentacao/historico?status=PENDENTE_CONFIRMACAO",
            actionLabel: "Ver pendências",
          },
          {
            label: "Registradas no SICAM",
            value: data.registradasSicam,
            tone: "secondary",
            href: "/movimentacao/historico?status=REGISTRADA_SICAM",
            actionLabel: "Ver concluídas",
          },
          {
            label: "Última carga CSV",
            value: data.ultimaImportacao ? formatRelativeTime(data.ultimaImportacao.createdAt) : "Nenhuma",
            tone: data.ultimaImportacao ? "primary" : "default",
            href: "/importacao/historico",
            actionLabel: "Ver histórico",
          }
        ]}
      />

      <HomeActionsGrid
        items={[
          {
            href: "/movimentacao/nova",
            title: "Registrar saída",
            description: "Escaneie tombos e monte a movimentação com rapidez.",
            icon: ScanLine,
          },
          {
            href: "/tombos",
            title: "Consultar tombos",
            description: "Confirme patrimônio, descrição e vínculo antes do envio.",
            icon: Monitor,
          },
          {
            href: "/importacao",
            title: "Importar CSV",
            description: "Atualize a base do SICAM com um novo arquivo.",
            icon: Upload,
          },
          {
            href: "/movimentacao/historico",
            title: "Acompanhar histórico",
            description: "Revise o que ainda depende de confirmação ou registro.",
            icon: History,
          },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <MovementPreviewList
          title="Movimentações recentes"
          description="Os últimos registros feitos por você, com acesso direto ao detalhe."
          items={data.movimentacoesRecentes.map((mov) => ({
            id: mov.id,
            href: `/movimentacao/${mov.id}`,
            eyebrow: `#${mov.codigo.slice(-6).toUpperCase()}`,
            title: `${mov.origem} → ${mov.destino}`,
            meta: `${mov.tombos} ${mov.tombos === 1 ? "tombo" : "tombos"} • ${formatDateTimeBR(
              mov.createdAt,
            )}`,
            status: mov.status,
          }))}
          emptyTitle="Nenhuma movimentação registrada"
          emptyMessage="Assim que você iniciar um envio, ele aparecerá aqui para acompanhamento."
          action={{ href: "/movimentacao/historico", label: "Abrir histórico" }}
        />

        <div className="space-y-6">
          <NotificationPreviewList
            title="Notificações"
            description="Avisos recentes sobre confirmações, SICAM e importações."
            items={data.notificacoes}
            unreadCount={data.notificacoesNaoLidas}
            action={{ href: "/notificacoes", label: "Ver todas" }}
          />

          <HomePanel
            title="Última importação"
            description="Resumo rápido da sua carga CSV mais recente."
            action={{ href: "/importacao/historico", label: "Histórico de importações" }}
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
                  Use a importação CSV quando precisar atualizar a base do SICAM.
                </p>
              </div>
            )}
          </HomePanel>
        </div>
      </div>
    </div>
  );
}
