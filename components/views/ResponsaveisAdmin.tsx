"use client";

import { useEffect, useState } from "react";
import { AdminDataTable } from "./AdminDataTable";
import { AdminSheet } from "./AdminSheet";
import { Button } from "@/components/ui/button";
import { FormField, FormInput, FormSelect } from "@/components/common/FormInput";
import { FormError } from "@/components/common/FormError";
import { ActiveBadge } from "@/components/common/ActiveBadge";
import { useAdminCrud } from "@/lib/hooks/use-admin-crud";
import { useAdminForm } from "@/lib/hooks/use-admin-form";
import { listarServidoresAdmin, listarUnidadesAdmin } from "@/server/queries/admin";
import { editarServidor } from "@/server/actions/admin";
import { Pencil } from "lucide-react";

type ServidorItem = Awaited<ReturnType<typeof listarServidoresAdmin>>[number];
type UnidadeItem = Awaited<ReturnType<typeof listarUnidadesAdmin>>[number];

interface ServidorFormData {
  nome: string;
  email: string;
  unidadeId: string;
}

export function ResponsaveisAdmin() {
  const { data, setBusca, isPending, sheetOpen, openSheet, closeSheet, refresh } =
    useAdminCrud(listarServidoresAdmin);

  const [unidades, setUnidades] = useState<UnidadeItem[]>([]);

  useEffect(() => {
    listarUnidadesAdmin().then(setUnidades);
  }, []);

  const form = useAdminForm<ServidorItem, ServidorFormData>({
    getDefaultValues: () => ({ nome: "", email: "", unidadeId: "" }),
    getValuesFromItem: (s) => ({ nome: s.nome, email: s.email || "", unidadeId: s.unidadeId }),
    editAction: (id, data) => editarServidor(id, {
      nome: data.nome.trim(),
      email: data.email.trim() || undefined,
      unidadeId: data.unidadeId,
    }),
    onSuccess: refresh,
    onOpenSheet: openSheet,
    onCloseSheet: closeSheet,
  });

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
            <FormSelect id="unidadeId" value={form.formData.unidadeId} onChange={(e) => form.updateField("unidadeId", e.target.value)}>
              <option value="">Selecione...</option>
              {unidadesAtivas.map((u) => (<option key={u.id} value={u.id}>{u.descricao}</option>))}
            </FormSelect>
          </FormField>
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
