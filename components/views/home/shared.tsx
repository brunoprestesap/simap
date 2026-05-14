import Link from "next/link";
import type { ElementType, ReactNode } from "react";
import {
  ArrowRight,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import type {
  PerfilUsuario,
  StatusMovimentacao,
  TipoNotificacao,
} from "@/lib/generated/prisma/client";
import { StatusBadge } from "@/components/common/StatusBadge";
import { NOTIFICACAO_ICONS, PERFIL_COLORS, PERFIL_LABELS } from "@/lib/constants";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type Tone = "default" | "primary" | "secondary" | "warning" | "destructive";

const TONE_TEXT_COLORS: Record<Tone, string> = {
  default: "text-foreground",
  primary: "text-primary",
  secondary: "text-secondary",
  warning: "text-jf-warning",
  destructive: "text-destructive",
};

const TONE_BG_COLORS: Record<Tone, string> = {
  default: "bg-foreground",
  primary: "bg-primary",
  secondary: "bg-secondary",
  warning: "bg-jf-warning",
  destructive: "bg-destructive",
};

export interface UnifiedKPI {
  label: string;
  value: string | number;
  tone?: Tone;
  href?: string;
  actionLabel?: string;
}

export function UnifiedKPIGrid({ items }: { items: UnifiedKPI[] }) {
  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
      {items.map((item, i) => (
        <UnifiedKPICard key={i} {...item} />
      ))}
    </div>
  );
}

export function UnifiedKPICard({ label, value, tone = "default", href, actionLabel }: UnifiedKPI) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={cn("mt-2 text-3xl font-semibold tracking-tight", TONE_TEXT_COLORS[tone])}>
        {value}
      </p>
      {href && actionLabel && (
        <Link
          href={href}
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          {actionLabel}
          <ChevronRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

export const HOME_PRIMARY_BUTTON =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90";

export const HOME_OUTLINE_BUTTON =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted";

export interface HomeActionItem {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  meta?: string;
}

export interface HomeListItem {
  id: string;
  href: string;
  title: string;
  meta: string;
  status?: StatusMovimentacao;
  eyebrow?: string;
  description?: string;
}

export interface HomeNotificationItem {
  id: string;
  tipo: TipoNotificacao;
  titulo: string;
  mensagem: string;
  link: string | null;
  lida: boolean;
  createdAt: Date;
}

interface HomeHeroProps {
  perfil: PerfilUsuario;
  title: string;
  description: string;
  primaryAction: {
    href: string;
    label: string;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    href: string;
    label: string;
  };
}

interface HomePanelProps {
  title: string;
  description?: string;
  badge?: ReactNode;
  action?: {
    href: string;
    label: string;
  };
  children: ReactNode;
  className?: string;
}

interface MovementPreviewListProps {
  title: string;
  description?: string;
  items: HomeListItem[];
  emptyTitle: string;
  emptyMessage: string;
  action?: {
    href: string;
    label: string;
  };
}

interface NotificationPreviewListProps {
  title: string;
  description?: string;
  items: HomeNotificationItem[];
  unreadCount: number;
  action?: {
    href: string;
    label: string;
  };
}

export function HomeHero({
  perfil,
  title,
  description,
  primaryAction,
  secondaryAction,
}: HomeHeroProps) {
  const PrimaryIcon = primaryAction.icon;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
            PERFIL_COLORS[perfil],
          )}
        >
          {PERFIL_LABELS[perfil]}
        </span>
        <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {title}
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="flex shrink-0 flex-wrap gap-2">
        <Link
          href={primaryAction.href}
          className={cn(HOME_PRIMARY_BUTTON, "whitespace-nowrap")}
        >
          {PrimaryIcon && <PrimaryIcon className="h-4 w-4" />}
          {primaryAction.label}
        </Link>
        {secondaryAction && (
          <Link
            href={secondaryAction.href}
            className={cn(HOME_OUTLINE_BUTTON, "whitespace-nowrap")}
          >
            {secondaryAction.label}
          </Link>
        )}
      </div>
    </div>
  );
}

export function HomePanel({
  title,
  description,
  badge,
  action,
  children,
  className,
}: HomePanelProps) {
  return (
    <section className={cn("rounded-lg border border-border bg-card p-4 md:p-5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {badge}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>

        {action && (
          <Link
            href={action.href}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            {action.label}
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      <div className="mt-4">{children}</div>
    </section>
  );
}

export function HomeActionsGrid({
  items,
  className,
}: {
  items: HomeActionItem[];
  className?: string;
}) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-4", className)}>
      {items.map((item) => (
        <HomeActionCard key={item.href} {...item} />
      ))}
    </div>
  );
}

export function HomeActionCard({
  href,
  title,
  description,
  icon: Icon,
  meta,
}: HomeActionItem) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors">
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
          {meta && <p className="mt-2 text-xs text-muted-foreground">{meta}</p>}
        </div>
      </div>
    </Link>
  );
}

export function MovementPreviewList({
  title,
  description,
  items,
  emptyTitle,
  emptyMessage,
  action,
}: MovementPreviewListProps) {
  return (
    <HomePanel title={title} description={description} action={action}>
      {items.length === 0 ? (
        <HomeEmptyState title={emptyTitle} message={emptyMessage} />
      ) : (
        <div className="flex flex-col">
          {items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="group flex flex-col gap-2 border-b border-border py-3.5 last:border-0 sm:flex-row sm:items-start sm:justify-between transition-colors hover:bg-muted/20 -mx-4 px-4"
            >
              <div className="min-w-0 flex-1">
                {item.eyebrow && (
                  <p className="text-xs font-medium text-muted-foreground">
                    {item.eyebrow}
                  </p>
                )}
                <p className="mt-1 text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                  {item.title}
                </p>
                {item.description && (
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">{item.meta}</p>
              </div>

              {item.status && (
                <div className="shrink-0 mt-2 sm:mt-0">
                  <StatusBadge status={item.status} />
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </HomePanel>
  );
}

export function NotificationPreviewList({
  title,
  description,
  items,
  unreadCount,
  action,
}: NotificationPreviewListProps) {
  return (
    <HomePanel
      title={title}
      description={description}
      action={action}
      badge={
        unreadCount > 0 ? (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            {unreadCount} não {unreadCount === 1 ? "lida" : "lidas"}
          </span>
        ) : undefined
      }
    >
      {items.length === 0 ? (
        <HomeEmptyState
          title="Sem notificações recentes"
          message="Quando houver novos avisos, eles aparecerão aqui."
        />
      ) : (
        <div className="flex flex-col">
          {items.map((item) => {
            const Icon = NOTIFICACAO_ICONS[item.tipo] as ElementType;

            return (
              <Link
                key={item.id}
                href={item.link || "/notificacoes"}
                className={cn(
                  "group flex items-start gap-3 border-b border-border py-3.5 last:border-0 transition-colors hover:bg-muted/20 -mx-4 px-4",
                  !item.lida && "bg-primary/5"
                )}
              >
                <div className={cn(
                  "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
                  !item.lida ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                )}>
                  <Icon className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={cn(
                        "text-sm group-hover:text-primary transition-colors",
                        item.lida ? "font-medium text-foreground" : "font-semibold text-foreground",
                      )}
                    >
                      {item.titulo}
                    </p>
                    {!item.lida && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {item.mensagem}
                  </p>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {formatRelativeTime(item.createdAt)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </HomePanel>
  );
}

export function HomeEmptyState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export function formatTempoMedioDias(value: number) {
  if (value === 0) return "—";

  return `${value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  })} dias`;
}
