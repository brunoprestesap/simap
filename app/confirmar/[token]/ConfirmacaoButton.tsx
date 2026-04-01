"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { confirmarMovimentacaoPublica } from "@/server/actions/confirmacao";

interface ConfirmacaoButtonProps {
  token: string;
  totalTombos: number;
}

export function ConfirmacaoButton({
  token,
  totalTombos,
}: ConfirmacaoButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [nome, setNome] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!nome.trim()) return;
    setIsLoading(true);
    setError(null);

    const result = await confirmarMovimentacaoPublica(token, nome.trim());

    if (!result.success) {
      setError(result.error ?? "Erro ao confirmar.");
      setIsLoading(false);
      return;
    }

    setSuccess(true);
    setIsLoading(false);
  };

  if (success) {
    return (
      <div className="rounded-lg border border-secondary/30 bg-secondary/5 p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-secondary animate-pulse" />
        <h3 className="mt-4 text-lg font-semibold text-foreground">
          Movimentação confirmada com sucesso!
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          A confirmação foi registrada no sistema. Você pode fechar esta página.
        </p>
      </div>
    );
  }

  return (
    <>
      <Button className="w-full" size="lg" onClick={() => setShowModal(true)}>
        Confirmar Saída
      </Button>

      {/* Confirmation modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-card border border-border p-6 shadow-xl">
            <h3 className="text-base font-semibold text-foreground mb-2">
              Confirmar saída de {totalTombos}{" "}
              {totalTombos === 1 ? "tombo" : "tombos"}?
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Informe seu nome para registrar a confirmação.
            </p>

            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome completo"
              autoFocus
              className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring mb-4"
            />

            {error && (
              <p className="text-sm text-destructive mb-3">{error}</p>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowModal(false)}
                disabled={isLoading}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!nome.trim() || isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Confirmar"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
