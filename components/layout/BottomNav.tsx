"use client";

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
} from "lucide-react";
import type { NavItem } from "@/lib/types";

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

interface BottomNavProps {
  items: NavItem[];
}

export function BottomNav({ items }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-border pb-[env(safe-area-inset-bottom)]">
      <div className="flex h-16 items-center justify-around">
        {items.slice(0, 4).map((item) => {
          const Icon = ICON_MAP[item.icon];
          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[11px] transition-colors ${
                isActive
                  ? "text-primary font-bold"
                  : "text-muted-foreground"
              }`}
            >
              {Icon && <Icon className="h-5 w-5" />}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
