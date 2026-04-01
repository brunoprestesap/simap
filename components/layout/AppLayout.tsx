"use client";

import type { PerfilUsuario } from "@/lib/generated/prisma/client";
import { NAV_ITEMS_BY_PROFILE } from "@/lib/types";
import { signOut } from "next-auth/react";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { Header } from "./Header";

interface AppLayoutProps {
  children: React.ReactNode;
  perfil: PerfilUsuario;
  userName: string;
  userId: string;
  pageTitle: string;
}

export function AppLayout({ children, perfil, userName, userId, pageTitle }: AppLayoutProps) {
  const items = NAV_ITEMS_BY_PROFILE[perfil];

  function handleLogout() {
    signOut({ callbackUrl: "/login" });
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar items={items} userName={userName} onLogout={handleLogout} />

      <div className="flex flex-1 flex-col min-w-0">
        <Header title={pageTitle} userName={userName} userId={userId} />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>

      <BottomNav items={items} />
    </div>
  );
}
