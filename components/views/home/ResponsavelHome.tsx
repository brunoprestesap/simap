import {
  ArrowLeftRight,
  Bell,
  Mail,
  Package,
} from "lucide-react";
import { formatDateTimeBR } from "@/lib/format";
import type { getResponsavelHomeData } from "@/server/queries/home";
import {
  HomeActionsGrid,
  HomeHero,
  HomePanel,
  MovementPreviewList,
  NotificationPreviewList,
  UnifiedKPIGrid,
} from "./shared";

type ResponsavelHomeData = Awaited<ReturnType<typeof getResponsavelHomeData>>;

interface ResponsavelHomeProps {
  firstName: string;
  data: ResponsavelHomeData;
}

export function ResponsavelHome({
  firstName,
  data,
}: ResponsavelHomeProps) {
  if (!data.lotacao) {
    return (
      <div className="space-y-8">
        <HomeHero
          perfil="SERVIDOR_RESPONSAVEL"
          title={`Olá, ${firstName}`}
          description="Aguardando vinculação de unidade."
          primaryAction={{ href: "/notificacoes", label: "Abrir notificações", icon: Bell }}
        />

        <UnifiedKPIGrid
          items={[
            { label: "Pendências", value: 0, tone: "default" },
            { label: "Patrimônios", value: 0, tone: "default" },
            { label: "Não lidas", value: data.notificacoesNaoLidas, tone: "warning" },
          ]}
        />

        <HomePanel
          title="Cadastro incompleto"
          description="Você não está vinculado a nenhuma unidade ativa."
        >
          <div className="rounded-lg border border-dashed border-border px-4 py-6">
            <p className="text-sm font-medium text-foreground">
              Solicite ao administrador a vinculação da sua matrícula a uma unidade.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Depois disso, a home vai exibir seus patrimônios, pendências e orientações de confirmação.
            </p>
          </div>
        </HomePanel>

        <NotificationPreviewList
          title="Notificações"
          description="Avisos recentes ainda disponíveis para sua conta."
          items={data.notificacoes}
          unreadCount={data.notificacoesNaoLidas}
          action={{ href: "/notificacoes", label: "Ver todas" }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <HomeHero
        perfil="SERVIDOR_RESPONSAVEL"
        title={`Olá, ${firstName}`}
        description="Acompanhe os bens e pendências da sua unidade."
        primaryAction={{
          href: "/patrimonio",
          label: "Abrir meus patrimônios",
          icon: Package,
        }}
        secondaryAction={{
          href: "/notificacoes",
          label: "Ver notificações",
        }}
      />

      <UnifiedKPIGrid
        items={[
          {
            label: "Patrimônios na unidade",
            value: data.patrimonioTotal,
            tone: "default",
            href: "/patrimonio",
            actionLabel: "Ver listagem",
          },
          {
            label: "Pendentes de confirmação",
            value: data.pendentesConfirmacao,
            tone: "warning",
            href: "/movimentacao/historico",
            actionLabel: "Ver movimentações",
          },
          {
            label: "Tombos em movimentação",
            value: data.patrimonioEmMovimentacao,
            tone: "primary",
            href: "/patrimonio?filtro=em_movimentacao",
            actionLabel: "Filtrar tombos",
          }
        ]}
      />

      <HomeActionsGrid
        className="sm:grid-cols-2 xl:grid-cols-3"
        items={[
          {
            href: "/patrimonio",
            title: "Meus patrimônios",
            description: "Veja todos os bens da unidade e o status atual de cada item.",
            icon: Package,
          },
          {
            href: "/movimentacao/historico",
            title: "Histórico de movimentações",
            description: "Consulte registros e acompanhe confirmações de entrada.",
            icon: ArrowLeftRight,
          },
          {
            href: "/notificacoes",
            title: "Central de notificações",
            description: "Acesse avisos recentes e abra os links relacionados.",
            icon: Bell,
          },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <MovementPreviewList
          title="Pendências da unidade"
          description="Movimentações recentes aguardando confirmação pela unidade de destino."
          items={data.pendenciasRecentes.map((mov) => ({
            id: mov.id,
            href: `/movimentacao/${mov.id}`,
            eyebrow: `#${mov.codigo.slice(-6).toUpperCase()}`,
            title: `Origem: ${mov.origem}`,
            description: `Entrada prevista em ${mov.destino}.`,
            meta: `${mov.tombos} ${mov.tombos === 1 ? "tombo" : "tombos"} • ${formatDateTimeBR(
              mov.createdAt,
            )}`,
            status: mov.status,
          }))}
          emptyTitle="Nenhuma pendência ativa"
          emptyMessage="Quando houver nova movimentação aguardando retorno, ela aparecerá aqui."
          action={{ href: "/movimentacao/historico", label: "Abrir histórico" }}
        />

        <div className="space-y-6">
          <NotificationPreviewList
            title="Notificações"
            description="Recados recentes sobre saídas, entradas e confirmações."
            items={data.notificacoes}
            unreadCount={data.notificacoesNaoLidas}
            action={{ href: "/notificacoes", label: "Ver todas" }}
          />

          <HomePanel
            title="Como funciona a confirmação"
            description="Resumo rápido do fluxo para o servidor responsável."
          >
            <div className="rounded-lg border border-jf-warning/20 bg-jf-warning/10 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/80 text-jf-warning">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    A confirmação pode ser feita por e-mail ou pela tela da movimentação.
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    O responsável da unidade de destino pode confirmar pelo link recebido por e-mail ou direto na aplicação, dentro do detalhe da movimentação pendente.
                  </p>
                </div>
              </div>
            </div>
          </HomePanel>
        </div>
      </div>
    </div>
  );
}
