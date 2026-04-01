"use client";

import { Bell } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { NOTIFICACAO_ICONS } from "@/lib/constants";
import { formatRelativeTime } from "@/lib/format";
import {
  contarNaoLidas,
  listarNotificacoesComContagem,
} from "@/server/queries/notificacoes";
import { marcarComoLida, marcarTodasComoLidas } from "@/server/actions/notificacoes";
import Link from "next/link";
import type { Notificacao } from "@/lib/generated/prisma/client";

interface NotificationBellProps {
  userId: string;
  isMobile?: boolean;
}

export function NotificationBell({ userId, isMobile }: NotificationBellProps) {
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [showPopover, setShowPopover] = useState(false);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Poll count every 30s, pausing when tab is hidden
  useEffect(() => {
    if (!userId) return;
    const fetchCount = () => contarNaoLidas(userId).then(setCount);
    fetchCount();

    let interval = setInterval(fetchCount, 30_000);

    const handleVisibility = () => {
      if (document.hidden) {
        clearInterval(interval);
      } else {
        fetchCount();
        interval = setInterval(fetchCount, 30_000);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [userId]);

  // Close popover on outside click
  useEffect(() => {
    if (!showPopover) return;
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowPopover(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showPopover]);

  async function handleClick() {
    if (isMobile) {
      router.push("/notificacoes");
      return;
    }
    if (!showPopover) {
      // Single combined query instead of separate count + list
      const result = await listarNotificacoesComContagem(userId, 10);
      setNotificacoes(result.notificacoes);
      setCount(result.naoLidas);
    }
    setShowPopover(!showPopover);
  }

  async function handleNotificacaoClick(id: string, link?: string | null) {
    await marcarComoLida(id);
    setNotificacoes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, lida: true } : n)),
    );
    setCount((c) => Math.max(0, c - 1));
    if (link) {
      setShowPopover(false);
      router.push(link);
    }
  }

  async function handleMarcarTodas() {
    await marcarTodasComoLidas();
    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
    setCount(0);
  }

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={handleClick}
        aria-label={`Notificações${count > 0 ? `, ${count} não lidas` : ""}`}
        className="relative p-2 rounded-md hover:bg-accent transition-colors"
      >
        <Bell className="h-5 w-5 text-muted-foreground" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {/* Desktop popover */}
      {showPopover && !isMobile && (
        <NotificationPopover
          notificacoes={notificacoes}
          count={count}
          onNotificacaoClick={handleNotificacaoClick}
          onMarcarTodas={handleMarcarTodas}
          onClose={() => setShowPopover(false)}
        />
      )}
    </div>
  );
}

// ─── Popover sub-component ──────────────────────────────

interface NotificationPopoverProps {
  notificacoes: Notificacao[];
  count: number;
  onNotificacaoClick: (id: string, link?: string | null) => void;
  onMarcarTodas: () => void;
  onClose: () => void;
}

function NotificationPopover({
  notificacoes,
  count,
  onNotificacaoClick,
  onMarcarTodas,
  onClose,
}: NotificationPopoverProps) {
  return (
    <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border border-border bg-card shadow-lg z-50 animate-in fade-in-0 zoom-in-95 duration-150">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <h3 className="text-sm font-semibold text-foreground">Notificações</h3>
        {count > 0 && (
          <button onClick={onMarcarTodas} className="text-xs text-primary hover:underline">
            Marcar todas como lidas
          </button>
        )}
      </div>
      <div className="max-h-80 overflow-y-auto">
        {notificacoes.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma notificação</p>
        ) : (
          notificacoes.map((n) => {
            const Icon = NOTIFICACAO_ICONS[n.tipo];
            return (
              <button
                key={n.id}
                onClick={() => onNotificacaoClick(n.id, n.link)}
                className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors ${
                  !n.lida ? "bg-[#D6E4F0]/30" : ""
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{n.titulo}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{n.mensagem}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{formatRelativeTime(n.createdAt)}</p>
                </div>
                {!n.lida && (
                  <div className="shrink-0 mt-1.5">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
      <div className="border-t border-border p-2">
        <Link
          href="/notificacoes"
          onClick={onClose}
          className="block w-full rounded-md px-3 py-1.5 text-center text-xs font-medium text-primary hover:bg-muted transition-colors"
        >
          Ver todas as notificações
        </Link>
      </div>
    </div>
  );
}
