"use client";

import { useState, useRef, useCallback } from "react";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  previewImportacaoCsv,
  confirmarImportacaoCsv,
} from "@/server/actions/importacao";
import type { ImportacaoPreview, ImportacaoResult } from "@/server/actions/importacao";
import type { CsvRow } from "@/server/services/csv-parser";

const STEPS = ["Upload", "Revisão", "Conclusão"];

export function ImportacaoWizard() {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportacaoPreview | null>(null);
  const [result, setResult] = useState<ImportacaoResult["data"] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setIsLoading(true);

    const formData = new FormData();
    formData.append("arquivo", selectedFile);

    const response = await previewImportacaoCsv(formData);

    if (!response.success) {
      setError(response.error ?? "Erro ao processar arquivo.");
      setIsLoading(false);
      return;
    }

    setPreview(response.data!);
    setStep(1);
    setIsLoading(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFile(droppedFile);
    },
    [handleFile],
  );

  const handleConfirm = async () => {
    if (!file) return;
    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("arquivo", file);

    const response = await confirmarImportacaoCsv(formData);

    if (!response.success) {
      setError(response.error ?? "Erro ao importar.");
      setIsLoading(false);
      return;
    }

    setResult(response.data!);
    setStep(2);
    setIsLoading(false);
  };

  const handleReset = () => {
    setStep(0);
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                i < step
                  ? "bg-secondary text-white"
                  : i === step
                    ? "bg-primary text-white"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            <span
              className={`text-sm ${i === step ? "font-semibold text-foreground" : "text-muted-foreground"}`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className="h-px w-8 bg-border mx-1" />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 0: Upload */}
      {step === 0 && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="rounded-lg border-2 border-dashed border-border bg-card p-12 text-center hover:border-primary/50 transition-colors"
        >
          {isLoading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">
                Processando arquivo...
              </p>
            </div>
          ) : (
            <>
              <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium text-foreground">
                Arraste o arquivo CSV aqui
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                ou clique para selecionar
              </p>
              <input
                ref={inputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => inputRef.current?.click()}
              >
                <FileText className="mr-2 h-4 w-4" />
                Selecionar arquivo
              </Button>
            </>
          )}
        </div>
      )}

      {/* Step 1: Preview */}
      {step === 1 && preview && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard
              label="Total de linhas"
              value={preview.totalRegistros}
              color="text-foreground"
            />
            <SummaryCard
              label="Válidos"
              value={preview.registros.length}
              color="text-secondary"
            />
            <SummaryCard
              label="Com erros"
              value={preview.erros.length}
              color={preview.erros.length > 0 ? "text-destructive" : "text-foreground"}
            />
            <SummaryCard
              label="Arquivo"
              value={file?.name ?? "—"}
              isText
            />
          </div>

          {/* Preview table */}
          {preview.registros.length > 0 && (
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/50">
                <p className="text-sm font-medium text-foreground">
                  Prévia (primeiros 10 registros)
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                        Tombo
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                        Descrição
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                        Lotação
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                        Responsável
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.registros.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 font-mono font-semibold">
                          {row.numeroTombo}
                        </td>
                        <td className="px-3 py-2 max-w-48 truncate">
                          {row.descricaoMaterial}
                        </td>
                        <td className="px-3 py-2">{row.codigoLotacao}</td>
                        <td className="px-3 py-2">
                          {row.nomeResponsavel ?? row.matriculaResponsavel}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Errors */}
          {preview.erros.length > 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm font-medium text-destructive mb-2">
                Erros encontrados ({preview.erros.length})
              </p>
              <ul className="space-y-1 max-h-40 overflow-y-auto">
                {preview.erros.map((err, i) => (
                  <li key={i} className="text-xs text-destructive">
                    Linha {err.linha}
                    {err.campo && ` (${err.campo})`}: {err.mensagem}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleReset}>
              Voltar
            </Button>
            <Button onClick={handleConfirm} disabled={isLoading || preview.registros.length === 0}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importando...
                </>
              ) : (
                `Importar ${preview.registros.length} registros`
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Result */}
      {step === 2 && result && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-secondary animate-pulse" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              Importação concluída!
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {result.total} registros processados com sucesso.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard label="Total" value={result.total} color="text-foreground" />
            <SummaryCard label="Novos" value={result.novos} color="text-secondary" />
            <SummaryCard label="Atualizados" value={result.atualizados} color="text-primary" />
            <SummaryCard
              label="Erros"
              value={result.erros}
              color={result.erros > 0 ? "text-destructive" : "text-foreground"}
            />
          </div>

          <Button onClick={handleReset}>Nova importação</Button>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color = "text-foreground",
  isText = false,
}: {
  label: string;
  value: string | number;
  color?: string;
  isText?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`mt-0.5 ${isText ? "text-sm truncate" : "text-xl font-bold"} ${color}`}
      >
        {value}
      </p>
    </div>
  );
}
