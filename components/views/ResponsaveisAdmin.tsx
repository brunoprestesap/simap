"use client";

import { useEffect, useState, useCallback } from "react";
import { AdminDataTable } from "./AdminDataTable";
import { AdminSheet } from "./AdminSheet";
import { Button } from "@/components/ui/button";
import { FormField, FormInput, FormSelect } from "@/components/common/FormInput";
import { FormError } from "@/components/common/FormError";
import { ActiveBadge } from "@/components/common/ActiveBadge";
import { MultiSelect } from "@/components/common/MultiSelect";
import type { MultiSelectOption } from "@/components/common/MultiSelect";
import { useAdminCrud } from "@/lib/hooks/use-admin-crud";
import { useAdminForm } from "@/lib/hooks/use-admin-form";
import { listarServidoresAdmin, listarUnidadesAdmin } from "@/server/queries/admin";
import { listarSetoresPorUnidade } from "@/server/queries/tombo";
import { editarServidor } from "@/server/actions/admin";
import { Pencil } from "lucide-react";

type ServidorItem = Awaited<ReturnType<typeof listarServidoresAdmin>>[number];
type UnidadeItem = Awaited<ReturnType<typeof listarUnidadesAdmin>>[number];

interface ServidorFormData {
  nome: string;
  email: string;
  unidadeId: string;
  responsavelUnidade: boolean;
  setorIds: string[];
}

function formatSetores(s: ServidorItem) {
  if (s.responsavelUnidade) {
    return <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">Toda a unidade</span>;
  }
  if (s.setores.length === 0) return "-";
  return s.setores.map((ss) => ss.setor.nome).join(", ");
}

export function ResponsaveisAdmin() {
  const { data, setBusca, isPending, sheetOpen, openSheet, closeSheet, refresh } =
    useAdminCrud(listarServidoresAdmin);

  const [unidades, setUnidades] = useState<UnidadeItem[]>([]);
  const [setoresOptions, setSetoresOptions] = useState<MultiSelectOption[]>([]);
  const [loadingSetores, setLoadingSetores] = useState(false);

  useEffect(() => {
    listarUnidadesAdmin().then(setUnidades);
  }, []);

  const form = useAdminForm<ServidorItem, ServidorFormData>({
    getDefaultValues: () => ({ nome: "", email: "", unidadeId: "", responsavelUnidade: false, setorIds: [] }),
    getValuesFromItem: (s) => ({
      nome: s.nome,
      email: s.email || "",
      unidadeId: s.unidadeId,
      responsavelUnidade: s.responsavelUnidade,
      setorIds: s.setores.map((ss) => ss.setor.id),
    }),
    editAction: (id, data) => editarServidor(id, {
      nome: data.nome.trim(),
      email: data.email.trim() || undefined,
      unidadeId: data.unidadeId,
      responsavelUnidade: data.responsavelUnidade,
      setorIds: data.responsavelUnidade ? [] : data.setorIds,
    }),
    onSuccess: refresh,
    onOpenSheet: openSheet,
    onCloseSheet: closeSheet,
  });

  const carregarSetores = useCallback((unidadeId: string) => {
    if (!unidadeId) {
      setSetoresOptions([]);
      return;
    }
    setLoadingSetores(true);
    listarSetoresPorUnidade(unidadeId)
      .then((setores) => {
        setSetoresOptions(setores.map((s) => ({ value: s.id, label: s.nome })));
      })
      .finally(() => setLoadingSetores(false));
  }, []);

  useEffect(() => {
    if (form.formData.unidadeId) {
      carregarSetores(form.formData.unidadeId);
    } else {
      setSetoresOptions([]);
    }
  }, [form.formData.unidadeId, carregarSetores]);

  function handleUnidadeChange(newUnidadeId: string) {
    form.updateField("unidadeId", newUnidadeId);
    form.updateField("setorIds", []);
    form.updateField("responsavelUnidade", false);
  }

  const unidadesAtivas = unidades.filter((u) => u.ativo);

  return (
    <>
      <AdminDataTable
        data={data}
        getRowId={(s) => s.id}
        searchPlaceholder="Buscar servidor..."
        onSearch={setBusca}
        emptyMessage="Nenhum servidor encontrado."
        columns={[
          { header: "Matrícula", accessor: (s) => <span className="font-mono">{s.matricula}</span> },
          { header: "Nome", accessor: (s) => s.nome },
          { header: "Unidade", accessor: (s) => s.unidade.descricao },
          { header: "Setor(es)", accessor: (s) => formatSetores(s) },
          { header: "Status", accessor: (s) => <ActiveBadge ativo={s.ativo} /> },
          { header: "Tombos", accessor: (s) => s._count.tombosResponsavel, className: "text-center" },
          {
            header: "Ações",
            accessor: (s) => (
              <Button variant="ghost" size="icon-xs" onClick={() => form.openEdit(s)} aria-label="Editar">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            ),
          },
        ]}
      />

      <AdminSheet title="Editar Servidor" open={sheetOpen} onClose={closeSheet}>
        <form onSubmit={form.handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">Matrícula</label>
            <p className="text-sm font-mono text-foreground">{form.editando?.matricula}</p>
          </div>
          <FormField label="Nome" htmlFor="nome" required>
            <FormInput id="nome" value={form.formData.nome} onChange={(e) => form.updateField("nome", e.target.value)} autoFocus />
          </FormField>
          <FormField label="E-mail" htmlFor="email">
            <FormInput id="email" type="email" value={form.formData.email} onChange={(e) => form.updateField("email", e.target.value)} placeholder="servidor@jfap.jus.br" />
          </FormField>
          <FormField label="Unidade" htmlFor="unidadeId" required>
            <FormSelect id="unidadeId" value={form.formData.unidadeId} onChange={(e) => handleUnidadeChange(e.target.value)}>
              <option value="">Selecione...</option>
              {unidadesAtivas.map((u) => (<option key={u.id} value={u.id}>{u.descricao}</option>))}
            </FormSelect>
          </FormField>

          {form.formData.unidadeId && (
            <>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="responsavelUnidade"
                  checked={form.formData.responsavelUnidade}
                  onChange={(e) => {
                    form.updateField("responsavelUnidade", e.target.checked);
                    if (e.target.checked) form.updateField("setorIds", []);
                  }}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                <label htmlFor="responsavelUnidade" className="text-sm font-medium text-foreground">
                  Responsável por toda a unidade
                </label>
              </div>

              {!form.formData.responsavelUnidade && (
                <FormField label="Setores" htmlFor="setorIds">
                  <MultiSelect
                    options={setoresOptions}
                    value={form.formData.setorIds}
                    onChange={(ids) => form.updateField("setorIds", ids)}
                    placeholder={loadingSetores ? "Carregando..." : "Selecione os setores..."}
                    disabled={loadingSetores}
                  />
                </FormField>
              )}
            </>
          )}

          <FormError error={form.erro} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={closeSheet}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={form.isSubmitting}>Salvar</Button>
          </div>
        </form>
      </AdminSheet>
    </>
  );
}
