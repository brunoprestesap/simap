"use client";

import type { ReactNode } from "react";
import {
  ClipboardCheck,
  Package,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

type WizardStep = "scanner" | "confirmacao";

const STEP_CONTENT: Record<
  WizardStep,
  {
    title: string;
    description: string;
    helperTitle: string;
    helperItems: string[];
  }
> = {
  scanner: {
    title: "Captura dos tombos",
    description:
      "Monte a lista inicial da movimentação com leitura por câmera ou digitação manual, mantendo ritmo rápido e conferência mínima.",
    helperTitle: "Checklist rápido",
    helperItems: [
      "Escaneie um tombo por vez para evitar leituras repetidas.",
      "Use digitação manual quando a câmera estiver indisponível.",
    ],
  },
  confirmacao: {
    title: "Revisão e confirmação",
    description:
      "Valide a origem, escolha a unidade de destino e confirme o envio antes de registrar a movimentação.",
    helperTitle: "Antes de confirmar",
    helperItems: [
      "Revise se a unidade de destino está correta.",
      "Confirme se a lista de tombos corresponde ao lote físico.",
    ],
  },
};

const STEP_ITEMS = [
  {
    key: "scanner",
    title: "Captura",
    subtitle: "Leitura dos tombos",
    icon: ScanLine,
  },
  {
    key: "confirmacao",
    title: "Confirmação",
    subtitle: "Destino e revisão",
    icon: ClipboardCheck,
  },
] as const;

interface MovimentacaoWizardShellProps {
  step: WizardStep;
  children: ReactNode;
}

export function MovimentacaoWizardShell({
  step,
  children,
}: MovimentacaoWizardShellProps) {
  const currentStepIndex = step === "scanner" ? 0 : 1;

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <div className="relative after:absolute after:inset-x-0 after:top-1/2 after:block after:-translate-y-1/2 after:rounded-lg after:border-t after:border-border after:bg-border">
        <ol className="relative z-10 flex justify-between text-sm font-medium text-muted-foreground">
          {STEP_ITEMS.map((item, index) => {
            const Icon = item.icon;
            const isActive = index === currentStepIndex;
            const isComplete = index < currentStepIndex;

            return (
              <li
                key={item.key}
                className={cn(
                  "flex items-center gap-2 bg-background p-2",
                  isActive && "text-primary",
                  isComplete && "text-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2",
                    isActive
                      ? "border-primary bg-primary/10"
                      : isComplete
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="hidden sm:block">
                  {item.title}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      {children}
    </div>
  );
}
