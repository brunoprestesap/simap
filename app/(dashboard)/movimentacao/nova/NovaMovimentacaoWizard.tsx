"use client";

import { useState } from "react";
import { MovimentacaoForm } from "@/components/views/MovimentacaoForm";
import { ConfirmacaoMovimentacao } from "@/components/views/ConfirmacaoMovimentacao";
import { MovimentacaoWizardShell } from "@/components/views/MovimentacaoWizardShell";
import type {
  TomboSelecionado,
  UnidadeResumo,
} from "@/lib/movimentacao-types";

interface NovaMovimentacaoWizardProps {
  tecnicoNome: string;
  unidadesIniciais: UnidadeResumo[];
}

export function NovaMovimentacaoWizard({
  tecnicoNome,
  unidadesIniciais,
}: NovaMovimentacaoWizardProps) {
  const [step, setStep] = useState<"scanner" | "confirmacao">("scanner");
  const [tombosSelecionados, setTombosSelecionados] = useState<
    TomboSelecionado[]
  >([]);

  const handleAvancar = (tombos: TomboSelecionado[]) => {
    setTombosSelecionados(tombos);
    setStep("confirmacao");
  };

  const handleVoltar = () => {
    setStep("scanner");
  };

  const handleSucesso = () => {
    setTombosSelecionados([]);
    setStep("scanner");
  };

  return (
    <MovimentacaoWizardShell step={step}>
      {step === "confirmacao" ? (
        <ConfirmacaoMovimentacao
          tombos={tombosSelecionados}
          tecnicoNome={tecnicoNome}
          unidadesIniciais={unidadesIniciais}
          onVoltar={handleVoltar}
          onSucesso={handleSucesso}
        />
      ) : (
        <MovimentacaoForm onAvancar={handleAvancar} />
      )}
    </MovimentacaoWizardShell>
  );
}
