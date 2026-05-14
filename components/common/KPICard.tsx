import Link from "next/link";
import { TrendingUp, TrendingDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  label: string;
  value: number | string;
  color?: string;
  tendencia?: { direcao: "up" | "down"; label: string } | null;
  link?: { href: string; label: string } | null;
}

export function KPICard({
  label,
  value,
  color = "text-foreground",
  tendencia,
  link,
}: KPICardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={cn("mt-2 text-3xl font-semibold tracking-tight", color)}>
        {value}
      </p>

      {tendencia && (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium">
          {tendencia.direcao === "up" ? (
            <span className="flex items-center gap-1 text-destructive">
              <TrendingUp className="h-3.5 w-3.5" />
              {tendencia.label}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-primary">
              <TrendingDown className="h-3.5 w-3.5" />
              {tendencia.label}
            </span>
          )}
        </div>
      )}

      {link && (
        <Link
          href={link.href}
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          {link.label}
          <ChevronRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}
