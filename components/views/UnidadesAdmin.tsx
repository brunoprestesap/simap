"use client";

import { useState, useTransition } from "react";
import { AdminDataTable } from "./AdminDataTable";
import { AdminSheet, ConfirmModal } from "./AdminSheet";
import { Button } from "@/components/ui/button";
import { FormField, FormInput } from "@/components/common/FormInput";
import { FormError } from "@/components/common/FormError";
import { ActiveBadge } from "@/components/common/ActiveBadge";
import { useAdminCrud } from "@/lib/hooks/use-admin-crud";
import { useAdminForm } from "@/lib/hooks/use-admin-form";
import { listarUnidadesAdmin } from "@/server/queries/admin";
import { criarUnidade, editarUnidade, desativarUnidade } from "@/server/actions/admin";
import { Pencil, Ban } from "lucide-react";

type Unidade = Awaited<ReturnType<typeof listarUnidadesAdmin>>[number];

interface UnidadeFormData {
  codigo: string;
  descricao: string;
}

export function UnidadesAdmin() {
  const { data, setBusca, isPending, sheetOpen, openSheet, closeSheet, refresh } =
    useAdminCrud(listarUnidadesAdmin);

  const [confirmDesativar, setConfirmDesativar] = useState<Unidade | null>(null);
  const [isDeactivating, startDeactivate] = useTransition();

  const form = useAdminForm<Unidade, UnidadeFormData>({
    getDefaultValues: () => ({ codigo: "", descricao: "" }),
    getValuesFromItem: (u) => ({ codigo: u.codigo, descricao: u.descricao }),
    createAction: (data) => criarUnidade({ codigo: data.codigo.trim(), descricao: data.descricao.trim() }),
    editAction: (id, data) => editarUnidade(id, { codigo: data.codigo.trim(), descricao: data.descricao.trim() }),
    onSuccess: refresh,
    onOpenSheet: openSheet,
    onCloseSheet: closeSheet,
  });

  function handleDesativar() {
    if (!confirmDesativar) return;
    startDeactivate(async () => {
      const result = await desativarUnidade(confirmDesativar.id);
      if (result.success) {
        setConfirmDesativar(null);
        refresh();
      }
    });
  }

  return (
    <>
      <AdminDataTable
        data={data}
        getRowId={(u) => u.id}
        searchPlaceholder="Buscar unidade..."
        onSearch={setBusca}
        onAdd={form.openCreate}
        addLabel="Nova Unidade"
        emptyMessage="Nenhuma unidade encontrada."
        columns={[
          { header: "Código", accessor: (u) => <span className="font-mono">{u.codigo}</span> },
          { header: "Descrição", accessor: (u) => u.descricao },
          { header: "Status", accessor: (u) => <ActiveBadge ativo={u.ativo} activeLabel="Ativa" inactiveLabel="Inativa" /> },
          { header: "Setores", accessor: (u) => u._count.setores, className: "text-center" },
          {
            header: "Ações",
            accessor: (u) => (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon-xs" onClick={() => form.openEdit(u)} aria-label="Editar">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                {u.ativo && (
                  <Button variant="ghost" size="icon-xs" onClick={() => setConfirmDesativar(u)} aria-label="Desativar">
                    <Ban className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            ),
          },
        ]}
      />

      <AdminSheet title={form.editando ? "Editar Unidade" : "Nova Unidade"} open={sheetOpen} onClose={closeSheet}>
        <form onSubmit={form.handleSubmit} className="space-y-4">
          <FormField label="Código" htmlFor="codigo" required>
            <FormInput id="codigo" value={form.formData.codigo} onChange={(e) => form.updateField("codigo", e.target.value)} autoFocus />
          </FormField>
          <FormField label="Descrição" htmlFor="descricao" required>
            <FormInput id="descricao" value={form.formData.descricao} onChange={(e) => form.updateField("descricao", e.target.value)} />
          </FormField>
          <FormError error={form.erro} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={closeSheet}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={form.isSubmitting}>{form.editando ? "Salvar" : "Criar"}</Button>
          </div>
        </form>
      </AdminSheet>

      <ConfirmModal
        title="Desativar Unidade"
        message={`Tem certeza que deseja desativar a unidade "${confirmDesativar?.descricao}"? Esta ação pode ser revertida.`}
        open={!!confirmDesativar}
        onConfirm={handleDesativar}
        onCancel={() => setConfirmDesativar(null)}
        isPending={isDeactivating}
      />
    </>
  );
}
