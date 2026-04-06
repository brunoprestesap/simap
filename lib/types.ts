import type { PerfilUsuario } from "@/lib/generated/prisma/client";

export interface NavItem {
  label: string;
  href: string;
  icon: string;
}

export const NAV_ITEMS_BY_PROFILE: Record<PerfilUsuario, NavItem[]> = {
  TECNICO_TI: [
    { label: "Início", href: "/home", icon: "Home" },
    { label: "Movimentação", href: "/movimentacao", icon: "ArrowLeftRight" },
    { label: "Tombos", href: "/tombos", icon: "Monitor" },
    { label: "Notificações", href: "/notificacoes", icon: "Bell" },
  ],
  SERVIDOR_RESPONSAVEL: [
    { label: "Início", href: "/home", icon: "Home" },
    { label: "Patrimônios", href: "/patrimonio", icon: "Package" },
    { label: "Movimentação", href: "/movimentacao", icon: "ArrowLeftRight" },
    { label: "Notificações", href: "/notificacoes", icon: "Bell" },
  ],
  SERVIDOR_SEMAP: [
    { label: "Início", href: "/home", icon: "Home" },
    { label: "Backlog", href: "/backlog", icon: "ClipboardList" },
    { label: "Tombos", href: "/tombos", icon: "Monitor" },
    { label: "Admin", href: "/admin", icon: "Settings" },
  ],
  GESTOR_ADMIN: [
    { label: "Início", href: "/home", icon: "Home" },
    { label: "Dashboard", href: "/dashboard", icon: "BarChart3" },
    { label: "Importação", href: "/importacao", icon: "Upload" },
    { label: "Admin", href: "/admin", icon: "Settings" },
    { label: "Notificações", href: "/notificacoes", icon: "Bell" },
  ],
};
