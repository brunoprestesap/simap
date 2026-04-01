"use client";

import { AdminDataTable } from "./AdminDataTable";
import { AdminSheet } from "./AdminSheet";
import { Button } from "@/components/ui/button";
import { FormField, FormSelect } from "@/components/common/FormInput";
import { FormError } from "@/components/common/FormError";
import { ActiveBadge } from "@/components/common/ActiveBadge";
import { useAdminCrud } from "@/lib/hooks/use-admin-crud";
import { useAdminForm } from "@/lib/hooks/use-admin-form";
import { PERFIL_LABELS, PERFIL_COLORS } from "@/lib/constants";
import { listarUsuariosAdmin } from "@/server/queries/admin";
import { atribuirPerfil } from "@/server/actions/admin";
import { Pencil } from "lucide-react";
import type { PerfilUsuario } from "@/lib/generated/prisma/client";

type UsuarioItem = Awaited<ReturnType<typeof listarUsuariosAdmin>>[number];

interface PerfilFormData {
  perfil: PerfilUsuario;
}

export function PerfisAdmin() {
  const { data, setBusca, isPending, sheetOpen, openSheet, closeSheet, refresh } =
    useAdminCrud(listarUsuariosAdmin);

  const form = useAdminForm<UsuarioItem, PerfilFormData>({
    getDefaultValues: () => ({ perfil: "TECNICO_TI" as PerfilUsuario }),
    getValuesFromItem: (u) => ({ perfil: u.perfil }),
    editAction: (id, data) => atribuirPerfil({ usuarioId: id, perfil: data.perfil }),
    onSuccess: refresh,
    onOpenSheet: openSheet,
    onCloseSheet: closeSheet,
  });

  return (
    <>
      <AdminDataTable
        data={data}
        getRowId={(u) => u.id}
        searchPlaceholder="Buscar usuário..."
        onSearch={setBusca}
        emptyMessage="Nenhum usuário encontrado."
        columns={[
          { header: "Matrícula", accessor: (u) => <span className="font-mono">{u.matricula}</span> },
          { header: "Nome", accessor: (u) => u.nome },
          {
            header: "Perfil",
            accessor: (u) => (
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PERFIL_COLORS[u.perfil]}`}>
                {PERFIL_LABELS[u.perfil]}
              </span>
            ),
          },
          { header: "Status", accessor: (u) => <ActiveBadge ativo={u.ativo} /> },
          {
            header: "Ações",
            accessor: (u) => (
              <Button variant="ghost" size="icon-xs" onClick={() => form.openEdit(u)} aria-label="Editar perfil">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            ),
          },
        ]}
      />

      <AdminSheet title="Atribuir Perfil" open={sheetOpen} onClose={closeSheet}>
        <form onSubmit={form.handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">Usuário</label>
            <p className="text-sm text-foreground">
              {form.editando?.nome} <span className="text-muted-foreground font-mono">({form.editando?.matricula})</span>
            </p>
          </div>
          <FormField label="Perfil" htmlFor="perfil" required>
            <FormSelect id="perfil" value={form.formData.perfil} onChange={(e) => form.updateField("perfil", e.target.value as PerfilUsuario)}>
              {(Object.keys(PERFIL_LABELS) as PerfilUsuario[]).map((p) => (
                <option key={p} value={p}>{PERFIL_LABELS[p]}</option>
              ))}
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
