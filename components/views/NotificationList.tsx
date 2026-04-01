"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";
import { ListSkeleton } from "@/components/common/ListSkeleton";
import { Pagination } from "@/components/common/Pagination";
import { NOTIFICACAO_ICONS } from "@/lib/constants";
import { formatRelativeTime } from "@/lib/format";
import { listarNotificacoes } from "@/server/queries/notificacoes";
import { marcarComoLida, marcarTodasComoLidas } from "@/server/actions/notificacoes";

type NotificacaoItem = Awaited<ReturnType<typeof listarNotificacoes>>["notificacoes"][number];

interface NotificationListProps {
  userId: string;
}

export function NotificationList({ userId }: NotificationListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notificacoes, setNotificacoes] = useState<NotificacaoItem[]>([]);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [pagina, setPagina] = useState(1);

  const fetchData = useCallback(() => {
    startTransition(async () => {
      const result = await listarNotificacoes(userId, pagina);
      setNotificacoes(result.notificacoes);
      setTotalPaginas(result.totalPaginas);
    });
  }, [userId, pagina]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleClick(n: NotificacaoItem) {
    if (!n.lida) {
      await marcarComoLida(n.id);
      setNotificacoes((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, lida: true } : item)),
      );
    }
    if (n.link) router.push(n.link);
  }

  async function handleMarcarTodas() {
    await marcarTodasComoLidas();
    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
  }

  const temNaoLidas = notificacoes.some((n) => !n.lida);

  return (
    <div className="space-y-4">
      {temNaoLidas && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={handleMarcarTodas}>
            Marcar todas como lidas
          </Button>
        </div>
      )}

      {isPending ? (
        <ListSkeleton count={3} height="h-16" />
      ) : notificacoes.length === 0 ? (
        <EmptyState titulo="Sem notificações" mensagem="Você não tem notificações no momento." />
      ) : (
        <div className="space-y-1">
          {notificacoes.map((n) => (
            <NotificacaoItem key={n.id} notificacao={n} onClick={handleClick} />
          ))}
        </div>
      )}

      <Pagination pagina={pagina} totalPaginas={totalPaginas} onPageChange={setPagina} />
    </div>
  );
}

// ─── Sub-component ──────────────────────────────────────

function NotificacaoItem({
  notificacao: n,
  onClick,
}: {
  notificacao: NotificacaoItem;
  onClick: (n: NotificacaoItem) => void;
}) {
  const Icon = NOTIFICACAO_ICONS[n.tipo];

  return (
    <button
      onClick={() => onClick(n)}
      className={`flex w-full items-start gap-3 rounded-lg px-4 py-3 text-left hover:bg-muted/50 transition-colors ${
        !n.lida ? "bg-[#D6E4F0]/30" : "bg-card"
      }`}
    >
      <div className="shrink-0 mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm ${!n.lida ? "font-semibold" : "font-medium"} text-foreground`}>
            {n.titulo}
          </p>
          {!n.lida && (
            <div className="shrink-0 mt-1.5">
              <div className="h-2 w-2 rounded-full bg-primary" />
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">{n.mensagem}</p>
        <p className="mt-1 text-xs text-muted-foreground">{formatRelativeTime(n.createdAt)}</p>
      </div>
    </button>
  );
}
