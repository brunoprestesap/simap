import type { StatusMovimentacao } from "@/lib/generated/prisma/client";
import { STATUS_CONFIG, TIMELINE_STEPS } from "@/lib/constants";
import { formatDateBR } from "@/lib/format";

interface TimelineDates {
  createdAt: Date;
  confirmadoEm?: Date | null;
  dataRegistroSicam?: Date | null;
}

interface MovimentacaoTimelineProps {
  status: StatusMovimentacao;
  dates: TimelineDates;
}

const DATE_BY_STEP: Record<string, keyof TimelineDates> = {
  PENDENTE_CONFIRMACAO: "createdAt",
  CONFIRMADA_ORIGEM: "confirmadoEm",
  REGISTRADA_SICAM: "dataRegistroSicam",
};

export function MovimentacaoTimeline({ status, dates }: MovimentacaoTimelineProps) {
  const currentStep = STATUS_CONFIG[status].order;

  return (
    <div className="rounded-lg border border-border bg-card p-4 md:p-6">
      <h3 className="text-sm font-semibold text-foreground mb-4">Timeline</h3>
      <div className="flex items-start gap-0">
        {TIMELINE_STEPS.map((step, i) => {
          const isComplete = currentStep >= i;
          const isCurrent = currentStep === i;
          const Icon = step.icon;
          const dateKey = DATE_BY_STEP[step.status];
          const dateValue = dateKey ? dates[dateKey] : null;

          return (
            <div
              key={step.status}
              className="flex flex-1 flex-col items-center text-center"
            >
              <div className="relative flex items-center w-full">
                {i > 0 && (
                  <div
                    className={`absolute left-0 right-1/2 top-1/2 h-0.5 -translate-y-1/2 ${
                      isComplete ? "bg-primary" : "bg-border"
                    }`}
                  />
                )}
                {i < TIMELINE_STEPS.length - 1 && (
                  <div
                    className={`absolute left-1/2 right-0 top-1/2 h-0.5 -translate-y-1/2 ${
                      currentStep > i ? "bg-primary" : "bg-border"
                    }`}
                  />
                )}
                <div
                  className={`relative mx-auto flex h-8 w-8 items-center justify-center rounded-full ${
                    isComplete
                      ? "bg-primary text-white"
                      : "bg-muted text-muted-foreground"
                  } ${isCurrent ? "ring-2 ring-primary/30" : ""}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p
                className={`mt-2 text-xs font-medium ${
                  isComplete ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </p>
              {dateValue && (
                <p className="text-[10px] text-muted-foreground">
                  {formatDateBR(dateValue)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
