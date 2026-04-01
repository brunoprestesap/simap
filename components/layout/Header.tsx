"use client";

import { NotificationBell } from "@/components/common/NotificationBell";

interface HeaderProps {
  title: string;
  userName?: string;
  userId?: string;
}

export function Header({ title, userName, userId }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-white px-4 md:px-6">
      {/* Mobile: logo + título */}
      <div className="flex items-center gap-3">
        <div className="md:hidden flex h-7 w-7 items-center justify-center rounded-md bg-primary font-bold text-white text-xs">
          P
        </div>
        <h1 className="text-base font-semibold text-foreground md:text-lg">
          {title}
        </h1>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-2">
        <NotificationBell userId={userId || ""} />
        {userName && (
          <div className="hidden md:flex items-center gap-2 ml-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white text-xs font-bold">
              {userName.charAt(0)}
            </div>
            <span className="text-sm text-muted-foreground">{userName}</span>
          </div>
        )}
      </div>
    </header>
  );
}
