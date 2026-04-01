"use client";

import { useEffect, useState, useTransition } from "react";
import { AdminDataTable } from "./AdminDataTable";
import { AdminSheet, ConfirmModal } from "./AdminSheet";
import { Button } from "@/components/ui/button";
import { FormField, FormInput, FormSelect } from "@/components/common/FormInput";
import { FormError } from "@/components/common/FormError";
import { ActiveBadge } from "@/components/common/ActiveBadge";
import { useAdminCrud } from "@/lib/hooks/use-admin-crud";
import { useAdminForm } from "@/lib/hooks/use-admin-form";
import { listarSetoresAdmin, listarUnidadesAdmin } from "@/server/queries/admin";
import { criarSetor, editarSetor, desativarSetor } from "@/server/actions/admin";
import { Pencil, Ban } from "lucide-react";

type SetorItem = Awaited<ReturnType<typeof listarSetoresAdmin>>[number];
type UnidadeItem = Awaited<ReturnType<typeof listarUnidadesAdmin>>[number];

interface SetorFormData {
  codigo: string;
  nome: string;
  unidadeId: string;
}

export function SetoresAdmin() {
  const { data, setBusca, isPending, sheetOpen, openSheet, closeSheet, refresh } =
    useAdminCrud(listarSetoresAdmin);

  const [unidades, setUnidades] = useState<UnidadeItem[]>([]);
  const [confirmDesativar, setConfirmDesativar] = useState<SetorItem | null>(null);
  const [isDeactivating, startDeactivate] = useTransition();

  useEffect(() => {
    listarUnidadesAdmin().then(setUnidades);
  }, []);

  const form = useAdminForm<SetorItem, SetorFormData>({
    getDefaultValues: () => ({ codigo: "", nome: "", unidadeId: "" }),
    getValuesFromItem: (s) => ({ codigo: s.codigo, nome: s.nome, unidadeId: s.unidadeId }),
    createAction: (data) => criarSetor({ codigo: data.codigo.trim(), nome: data.nome.trim(), unidadeId: data.unidadeId }),
    editAction: (id, data) => editarSetor(id, { codigo: data.codigo.trim(), nome: data.nome.trim(), unidadeId: data.unidadeId }),
    onSuccess: refresh,
    onOpenSheet: openSheet,
    onCloseSheet: closeSheet,
  });

  function handleDesativar() {
    if (!confirmDesativar) return;
    startDeactivate(async () => {
      const result = await desativarSetor(confirmDesativar.id);
      if (result.success) {
        setConfirmDesativar(null);
        refresh();
      }
    });
  }

  const unidadesAtivas = unidades.filter((u) => u.ativo);

  return (
    <>
      <AdminDataTable
        data={data}
        getRowId={(s) => s.id}
        searchPlaceholder="Buscar setor..."
        onSearch={setBusca}
        onAdd={form.openCreate}
        addLabel="Novo Setor"
        emptyMessage="Nenhum setor encontrado."
        columns={[
          { header: "Código", accessor: (s) => <span className="font-mono">{s.codigo}</span> },
          { header: "Nome", accessor: (s) => s.nome },
          { header: "Unidade", accessor: (s) => s.unidade.descricao },
          { header: "Status", accessor: (s) => <ActiveBadge ativo={s.ativo} /> },
          { header: "Tombos", accessor: (s) => s._count.tombos, className: "text-center" },
          {
            header: "Ações",
            accessor: (s) => (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon-xs" onClick={() => form.openEdit(s)} aria-label="Editar">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                {s.ativo && (
                  <Button variant="ghost" size="icon-xs" onClick={() => setConfirmDesativar(s)} aria-label="Desativar">
                    <Ban className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            ),
          },
        ]}
      />

      <AdminSheet title={form.editando ? "Editar Setor" : "Novo Setor"} open={sheetOpen} onClose={closeSheet}>
        <form onSubmit={form.handleSubmit} className="space-y-4">
          <FormField label="Código" htmlFor="codigo" required>
            <FormInput id="codigo" value={form.formData.codigo} onChange={(e) => form.updateField("codigo", e.target.value)} autoFocus />
          </FormField>
          <FormField label="Nome" htmlFor="nome" required>
            <FormInput id="nome" value={form.formData.nome} onChange={(e) => form.updateField("nome", e.target.value)} />
          </FormField>
          <FormField label="Unidade" htmlFor="unidadeId" required>
            <FormSelect id="unidadeId" value={form.formData.unidadeId} onChange={(e) => form.updateField("unidadeId", e.target.value)}>
              <option value="">Selecione...</option>
              {unidadesAtivas.map((u) => (<option key={u.id} value={u.id}>{u.descricao}</option>))}
            </FormSelect>
          </FormField>
          <FormError error={form.erro} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={closeSheet}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={form.isSubmitting}>{form.editando ? "Salvar" : "Criar"}</Button>
          </div>
        </form>
      </AdminSheet>

      <ConfirmModal
        title="Desativar Setor"
        message={`Tem certeza que deseja desativar o setor "${confirmDesativar?.nome}"?`}
        open={!!confirmDesativar}
        onConfirm={handleDesativar}
        onCancel={() => setConfirmDesativar(null)}
        isPending={isDeactivating}
      />
    </>
  );
}
