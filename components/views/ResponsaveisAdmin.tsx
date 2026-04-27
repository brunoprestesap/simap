"use client";

import { useEffect, useState, useCallback } from "react";
import { AdminDataTable } from "./AdminDataTable";
import { AdminSheet } from "./AdminSheet";
import { Button } from "@/components/ui/button";
import { FormField, FormInput, FormSelect } from "@/components/common/FormInput";
import { FormError } from "@/components/common/FormError";
import { ActiveBadge } from "@/components/common/ActiveBadge";
import { useAdminCrud } from "@/lib/hooks/use-admin-crud";
import { useAdminForm } from "@/lib/hooks/use-admin-form";
import { listarUsuariosLotacaoAdmin, listarUnidadesAdmin } from "@/server/queries/admin";
import { listarSetoresPorUnidade } from "@/server/queries/tombo";
import { editarUsuarioLotacao } from "@/server/actions/admin";
import { Pencil } from "lucide-react";

type UsuarioLotacaoItem = Awaited<ReturnType<typeof listarUsuariosLotacaoAdmin>>[number];
type UnidadeItem = Awaited<ReturnType<typeof listarUnidadesAdmin>>[number];

interface UsuarioLotacaoFormData {
  nome: string;
  email: string;
  unidadeId: string;
  responsavelUnidade: boolean;
  setorId: string;
}

function formatSetor(u: UsuarioLotacaoItem) {
  if (u.responsavelUnidade) {
    return (
      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
        Toda a unidade
      </span>
    );
  }
  if (!u.setor) return "—";
  return u.setor.nome;
}

export function ResponsaveisAdmin() {
  const { data, setBusca, sheetOpen, openSheet, closeSheet, refresh } =
    useAdminCrud(listarUsuariosLotacaoAdmin);

  const [unidades, setUnidades] = useState<UnidadeItem[]>([]);
  const [setoresOptions, setSetoresOptions] = useState<{ id: string; nome: string }[]>([]);
  const [loadingSetores, setLoadingSetores] = useState(false);

  useEffect(() => {
    listarUnidadesAdmin().then(setUnidades);
  }, []);

  const form = useAdminForm<UsuarioLotacaoItem, UsuarioLotacaoFormData>({
    getDefaultValues: () => ({
      nome: "",
      email: "",
      unidadeId: "",
      responsavelUnidade: false,
      setorId: "",
    }),
    getValuesFromItem: (u) => ({
      nome: u.nome,
      email: u.email || "",
      unidadeId: u.unidadeId || "",
      responsavelUnidade: u.responsavelUnidade,
      setorId: u.setorId || "",
    }),
    editAction: (id, data) =>
      editarUsuarioLotacao(id, {
        nome: data.nome.trim(),
        email: data.email.trim() || undefined,
        unidadeId: data.unidadeId,
        responsavelUnidade: data.responsavelUnidade,
        setorId: data.responsavelUnidade ? "" : data.setorId,
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
        setSetoresOptions(setores.map((s) => ({ id: s.id, nome: s.nome })));
      })
      .finally(() => setLoadingSetores(false));
  }, []);

  function handleUnidadeChange(newUnidadeId: string) {
    form.updateField("unidadeId", newUnidadeId);
    form.updateField("setorId", "");
    form.updateField("responsavelUnidade", false);
    if (newUnidadeId) {
      carregarSetores(newUnidadeId);
    } else {
      setSetoresOptions([]);
    }
  }

  function handleOpenEdit(usuario: UsuarioLotacaoItem) {
    form.openEdit(usuario);
    if (usuario.unidadeId) {
      carregarSetores(usuario.unidadeId);
    } else {
      setSetoresOptions([]);
    }
  }

  const unidadesAtivas = unidades.filter((u) => u.ativo);

  return (
    <>
      <AdminDataTable
        data={data}
        getRowId={(s) => s.id}
        searchPlaceholder="Buscar por matrícula ou nome..."
        onSearch={setBusca}
        emptyMessage="Nenhum usuário encontrado."
        columns={[
          { header: "Matrícula", accessor: (s) => <span className="font-mono">{s.matricula}</span> },
          { header: "Nome", accessor: (s) => s.nome },
          { header: "Perfil", accessor: (s) => s.perfil },
          { header: "Unidade", accessor: (s) => s.unidade?.descricao ?? "—" },
          { header: "Setor", accessor: (s) => formatSetor(s) },
          { header: "Status", accessor: (s) => <ActiveBadge ativo={s.ativo} /> },
          {
            header: "Tombos",
            accessor: (s) => s._count.tombosComoResponsavel,
            className: "text-center",
          },
          {
            header: "Ações",
            accessor: (s) => (
              <Button variant="ghost" size="icon-xs" onClick={() => handleOpenEdit(s)} aria-label="Editar">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            ),
          },
        ]}
      />

      <AdminSheet title="Editar lotação patrimonial" open={sheetOpen} onClose={closeSheet}>
        <form onSubmit={form.handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">Matrícula</label>
            <p className="text-sm font-mono text-foreground">{form.editando?.matricula}</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">Perfil de acesso</label>
            <p className="text-sm text-foreground">{form.editando?.perfil}</p>
          </div>
          <FormField label="Nome" htmlFor="nome" required>
            <FormInput
              id="nome"
              value={form.formData.nome}
              onChange={(e) => form.updateField("nome", e.target.value)}
              autoFocus
            />
          </FormField>
          <FormField label="E-mail" htmlFor="email">
            <FormInput
              id="email"
              type="email"
              value={form.formData.email}
              onChange={(e) => form.updateField("email", e.target.value)}
              placeholder="usuario@jfap.jus.br"
            />
          </FormField>
          <FormField label="Unidade" htmlFor="unidadeId" required>
            <FormSelect id="unidadeId" value={form.formData.unidadeId} onChange={(e) => handleUnidadeChange(e.target.value)}>
              <option value="">Selecione...</option>
              {unidadesAtivas.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.descricao}
                </option>
              ))}
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
                    if (e.target.checked) form.updateField("setorId", "");
                  }}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                <label htmlFor="responsavelUnidade" className="text-sm font-medium text-foreground">
                  Responsável por toda a unidade
                </label>
              </div>

              {!form.formData.responsavelUnidade && (
                <FormField label="Setor" htmlFor="setorId">
                  <FormSelect
                    id="setorId"
                    value={form.formData.setorId}
                    onChange={(e) => form.updateField("setorId", e.target.value)}
                    disabled={loadingSetores}
                  >
                    <option value="">{loadingSetores ? "Carregando..." : "Nenhum setor específico"}</option>
                    {setoresOptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome}
                      </option>
                    ))}
                  </FormSelect>
                </FormField>
              )}
            </>
          )}

          <FormError error={form.erro} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={closeSheet}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={form.isSubmitting}>
              Salvar
            </Button>
          </div>
        </form>
      </AdminSheet>
    </>
  );
}
