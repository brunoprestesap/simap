"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

interface LogoutButtonProps {
  collapsed?: boolean;
}

export function LogoutButton({ collapsed }: LogoutButtonProps) {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
      aria-label="Sair"
    >
      <LogOut className="h-5 w-5 shrink-0" />
      {!collapsed && <span>Sair</span>}
    </button>
  );
}
