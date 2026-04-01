"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface AdminSheetProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function AdminSheet({ title, open, onClose, children }: AdminSheetProps) {
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-y-0 right-0 z-50 w-full md:w-[420px] bg-card shadow-xl flex flex-col animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between border-b border-border px-4 py-3 md:px-6">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-md p-1 hover:bg-accent transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6">{children}</div>
      </div>
    </>
  );
}

interface ConfirmModalProps {
  title: string;
  message: string;
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isPending?: boolean;
}

export function ConfirmModal({
  title,
  message,
  open,
  onConfirm,
  onCancel,
  isPending,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div className="fixed left-1/2 top-1/2 z-50 w-[90%] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg bg-card p-6 shadow-xl animate-in zoom-in-95 duration-200">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <div className="mt-4 flex gap-3 justify-end">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? "Desativando..." : "Desativar"}
          </Button>
        </div>
      </div>
    </>
  );
}
