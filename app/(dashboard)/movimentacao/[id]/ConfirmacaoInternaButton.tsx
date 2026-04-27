"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { confirmarMovimentacaoLogada } from "@/server/actions/confirmacao";

interface ConfirmacaoInternaButtonProps {
  movimentacaoId: string;
}

export function ConfirmacaoInternaButton({
  movimentacaoId,
}: ConfirmacaoInternaButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleConfirmar() {
    setError(null);
    startTransition(async () => {
      const result = await confirmarMovimentacaoLogada(movimentacaoId);
      if (!result.success) {
        setError(result.error ?? "Erro ao confirmar movimentação.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-jf-warning/30 bg-jf-warning/10 p-4 space-y-3">
      <p className="text-sm text-foreground">
        Esta movimentação está pendente de confirmação da unidade de destino.
      </p>
      <Button onClick={handleConfirmar} disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Confirmando...
          </>
        ) : (
          "Confirmar movimentação"
        )}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
