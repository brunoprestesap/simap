import { FileX2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  titulo: string;
  mensagem: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export function EmptyState({
  titulo,
  mensagem,
  ctaLabel,
  ctaHref,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <FileX2 className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{titulo}</h3>
      <p className="mt-1 text-sm text-muted-foreground max-w-sm">{mensagem}</p>
      {ctaLabel && ctaHref && (
        <Button className="mt-4" nativeButton={false} render={<Link href={ctaHref} />}>
          {ctaLabel}
        </Button>
      )}
    </div>
  );
}
