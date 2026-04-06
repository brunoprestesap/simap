import {
  ClipboardList,
  Monitor,
  Settings,
} from "lucide-react";
import { formatDateTimeBR } from "@/lib/format";
import type { getSemapHomeData } from "@/server/queries/home";
import {
  HomeActionsGrid,
  HomeHero,
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
        </div>
      </div>
    </div>
  );
}
