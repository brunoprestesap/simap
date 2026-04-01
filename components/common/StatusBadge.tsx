import type { StatusMovimentacao } from "@/lib/generated/prisma/client";
import { STATUS_CONFIG } from "@/lib/constants";

interface StatusBadgeProps {
  status: StatusMovimentacao;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
}
