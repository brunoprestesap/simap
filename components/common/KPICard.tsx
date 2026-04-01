import Link from "next/link";
import { TrendingUp, TrendingDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  label: string;
  value: number | string;
  color?: string;
  borderColor?: string;
  tendencia?: { direcao: "up" | "down"; label: string } | null;
  link?: { href: string; label: string } | null;
}

export function KPICard({
  label,
  value,
  color = "text-foreground",
  borderColor,
  tendencia,
  link,
}: KPICardProps) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md">
      <div>
        <div className="flex items-center gap-2">
          {borderColor && (
            <span 
              className="h-2 w-2 rounded-full" 
              style={{ backgroundColor: borderColor }} 
            />
          )}
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
        </div>
        <p className={cn("mt-3 text-3xl font-light tracking-tight", color)}>
          {value}
        </p>
        
        {tendencia && (
          <div className="mt-2 flex items-center gap-1.5 text-xs font-medium">
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
      </div>
      
      {link && (
        <Link
          href={link.href}
          className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          {link.label}
          <ChevronRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}
