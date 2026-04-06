import {
  History,
  Monitor,
  ScanLine,
} from "lucide-react";
import { formatDateTimeBR } from "@/lib/format";
import type { getTecnicoHomeData } from "@/server/queries/home";
import {
  HomeActionsGrid,
  HomeHero,
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
        </div>
      </div>
    </div>
  );
}
