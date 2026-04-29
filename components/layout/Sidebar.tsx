"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  ArrowLeftRight,
  Upload,
  Bell,
  Package,
  Monitor,
  ClipboardList,
  Settings,
  BarChart3,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import type { NavItem } from "@/lib/types";
import { LogoutButton } from "./LogoutButton";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Home,
  ArrowLeftRight,
  Upload,
  Bell,
  Package,
  Monitor,
  ClipboardList,
  Settings,
  BarChart3,
};

interface SidebarProps {
  items: NavItem[];
  userName: string;
}

export function Sidebar({ items, userName }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={`hidden md:flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-200 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-16 border-b border-sidebar-border">
        <Image
          src="/favicon-simap.svg"
          alt="SIMAP"
          width={32}
          height={32}
          className="shrink-0"
          priority
        />
        {!collapsed && (
          <span className="text-lg font-bold tracking-tight">SIMAP</span>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 flex flex-col gap-1 p-2 mt-2">
        {items.map((item) => {
          const Icon = ICON_MAP[item.icon];
          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
            >
              {Icon && <Icon className="h-5 w-5 shrink-0" />}
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-2">
        {!collapsed && (
          <div className="flex items-center gap-2 px-3 py-2 mb-1">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
              {userName.charAt(0)}
            </div>
            <span className="text-sm truncate">{userName}</span>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <LogoutButton collapsed={collapsed} />
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
            aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
          >
            {collapsed ? (
              <PanelLeft className="h-5 w-5 shrink-0" />
            ) : (
              <>
                <PanelLeftClose className="h-5 w-5 shrink-0" />
                <span>Recolher</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
