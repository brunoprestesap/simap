import {
  BarChart3,
  Bell,
  ClipboardList,
  History,
  Settings,
} from "lucide-react";
import { formatDateTimeBR } from "@/lib/format";
import type { getGestorHomeData } from "@/server/queries/home";
import type { MeusTombosData } from "@/server/queries/tombo";
import {
  HomeActionsGrid,
  HomeHero,
  MovementPreviewList,
  NotificationPreviewList,
  formatTempoMedioDias,
  UnifiedKPIGrid,
} from "./shared";
import { MeusTombosCard } from "./MeusTombosCard";

type GestorHomeData = Awaited<ReturnType<typeof getGestorHomeData>>;

interface GestorHomeProps {
  firstName: string;
  data: GestorHomeData;
  meusTombosInicial: MeusTombosData;
}

export function GestorHome({ firstName, data, meusTombosInicial }: GestorHomeProps) {
  return (
    <div className="space-y-6">
      <HomeHero
        perfil="GESTOR_ADMIN"
        title={`Olá, ${firstName}`}
        description="Acompanhe o panorama gerencial e métricas da operação."
        primaryAction={{
          href: "/dashboard",
          label: "Abrir dashboard",
          icon: BarChart3,
        }}
        secondaryAction={{
          href: "/backlog",
          label: "Ver backlog",
        }}
      />

      <div className="grid gap-6 lg:grid-cols-[3fr_1fr]">
        <div className="space-y-6">
          <UnifiedKPIGrid
            items={[
              {
                label: "Últimos 30 dias",
                value: data.movimentacoes30Dias,
                tone: "primary",
                href: "/dashboard",
                actionLabel: "Ver detalhes",
              },
              {
                label: "Pendentes de confirmação",
                value: data.pendentesConfirmacao,
                tone: "warning",
                href: "/backlog?status=PENDENTE_CONFIRMACAO",
                actionLabel: "Ver aguardando origem",
              },
              {
                label: "Pendentes no SICAM",
                value: data.pendentesSicam,
                tone: "secondary",
                href: "/backlog?status=CONFIRMADA_DESTINO",
                actionLabel: "Abrir backlog",
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
                href: "/dashboard",
                title: "Dashboard gerencial",
                description: "Acesse gráficos, distribuição por unidade e auditoria.",
                icon: BarChart3,
              },
              {
                href: "/backlog",
                title: "Backlog operacional",
                description: "Veja rapidamente onde a operação precisa de atenção.",
                icon: ClipboardList,
              },
              {
                href: "/admin/unidades",
                title: "Administração",
                description: "Gerencie unidades, setores, responsáveis e perfis.",
                icon: Settings,
              },
              {
                href: "/movimentacao/historico",
                title: "Histórico de movimentações",
                description: "Revise registros recentes e estados do processo.",
                icon: History,
              },
              {
                href: "/notificacoes",
                title: "Notificações",
                description: "Abra os avisos mais recentes e acompanhe eventos do sistema.",
                icon: Bell,
              },
            ]}
          />

          <MovementPreviewList
            title="Últimas movimentações"
            description="Recorte recente da operação com acesso direto ao detalhe."
            items={data.atividadesRecentes.map((mov) => ({
              id: mov.id,
              href: `/movimentacao/${mov.id}`,
              eyebrow: `#${mov.codigo.slice(-6).toUpperCase()}${
                mov.tecnicoNome ? ` • Técnico: ${mov.tecnicoNome}` : ""
              }`,
              title: `${mov.origem} → ${mov.destino}`,
              meta: `${mov.tombos} ${mov.tombos === 1 ? "tombo" : "tombos"} • ${formatDateTimeBR(
                mov.createdAt,
              )}`,
              status: mov.status,
            }))}
            emptyTitle="Sem movimentações recentes"
            emptyMessage="Assim que houver novos registros, o resumo aparece nesta área."
            action={{ href: "/movimentacao/historico", label: "Abrir histórico" }}
          />

          <NotificationPreviewList
            title="Notificações"
            description="Eventos recentes para acompanhamento gerencial."
            items={data.notificacoes}
            unreadCount={data.notificacoesNaoLidas}
            action={{ href: "/notificacoes", label: "Ver todas" }}
          />
        </div>

        <aside className="lg:sticky lg:top-4 lg:self-start">
          <MeusTombosCard initialData={meusTombosInicial} />
        </aside>
      </div>
    </div>
  );
}
