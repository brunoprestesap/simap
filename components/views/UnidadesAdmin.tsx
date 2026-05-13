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
import { listarUnidadesAdmin, listarTombosDaUnidade } from "@/server/queries/admin";
import { criarUnidade, editarUnidade, desativarUnidade } from "@/server/actions/admin";
import { Pencil, Ban, AlertCircle, Loader2, Package, MapPin, User, Search } from "lucide-react";

type Unidade = Awaited<ReturnType<typeof listarUnidadesAdmin>>[number];
type TomboDaUnidade = Awaited<ReturnType<typeof listarTombosDaUnidade>>[number];

interface UnidadeFormData {
  codigo: string;
  descricao: string;
}

export function UnidadesAdmin() {
  const { data, setBusca, isPending, sheetOpen, openSheet, closeSheet, refresh } =
    useAdminCrud(listarUnidadesAdmin);

  const [confirmDesativar, setConfirmDesativar] = useState<Unidade | null>(null);
  const [isDeactivating, startDeactivate] = useTransition();

  const [unidadeTombos, setUnidadeTombos] = useState<Unidade | null>(null);
  const [tombos, setTombos] = useState<TomboDaUnidade[]>([]);
  const [isLoadingTombos, startLoadTombos] = useTransition();
  const [buscaTombo, setBuscaTombo] = useState("");

  function abrirTombos(u: Unidade) {
    setUnidadeTombos(u);
    setTombos([]);
    setBuscaTombo("");
    startLoadTombos(async () => {
      const resultado = await listarTombosDaUnidade(u.id);
      setTombos(resultado);
    });
  }

  const tombosFiltrados = buscaTombo.trim()
    ? tombos.filter((t) => {
        const q = buscaTombo.toLowerCase();
        return (
          t.numero.toLowerCase().includes(q) ||
          (t.descricaoMaterial ?? "").toLowerCase().includes(q) ||
          (t.setor?.nome ?? "").toLowerCase().includes(q) ||
          (t.matriculaResponsavel ?? "").toLowerCase().includes(q)
        );
      })
    : tombos;

  const totalAtivos = tombos.filter((t) => t.ativo).length;
  const totalBaixados = tombos.length - totalAtivos;

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
        onRowClick={abrirTombos}
        columns={[
          { header: "Código", accessor: (u) => <span className="font-mono">{u.codigo}</span> },
          {
            header: "Descrição",
            accessor: (u) => (
              <span className="flex items-center gap-1.5">
                {u.descricao}
                {u.descricao === u.codigo && (
                  <AlertCircle
                    className="h-3.5 w-3.5 shrink-0 text-amber-500"
                    aria-label="Sem descrição — clique em editar"
                  />
                )}
              </span>
            ),
          },
          { header: "Status", accessor: (u) => <ActiveBadge ativo={u.ativo} activeLabel="Ativa" inactiveLabel="Inativa" /> },
          { header: "Setores", accessor: (u) => u._count.setores, className: "text-center" },
          { header: "Tombos", accessor: (u) => u._count.tombos, className: "text-center" },
          {
            header: "Ações",
            accessor: (u) => (
              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
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

      <AdminSheet
        title={unidadeTombos?.descricao ?? "Tombos"}
        subtitle={unidadeTombos ? `Código ${unidadeTombos.codigo} · ${unidadeTombos.ativo ? "Ativa" : "Inativa"}` : undefined}
        open={!!unidadeTombos}
        onClose={() => setUnidadeTombos(null)}
        wide
      >
        {isLoadingTombos ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="text-sm">Carregando tombos...</span>
          </div>
        ) : tombos.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
            <Package className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">Nenhum tombo sincronizado</p>
            <p className="text-xs text-muted-foreground/70">Execute a sincronização do SICAM para carregar os tombos desta unidade.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* KPIs */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-border bg-background px-3 py-2.5 text-center">
                <p className="text-2xl font-light text-foreground">{tombos.length}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-0.5">Total</p>
              </div>
              <div className="rounded-lg border border-secondary/30 bg-secondary/5 px-3 py-2.5 text-center">
                <p className="text-2xl font-light text-secondary">{totalAtivos}</p>
                <p className="text-[10px] uppercase tracking-wide text-secondary/70 mt-0.5">Ativos</p>
              </div>
              <div className="rounded-lg border border-border bg-background px-3 py-2.5 text-center">
                <p className="text-2xl font-light text-muted-foreground">{totalBaixados}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-0.5">Baixados</p>
              </div>
            </div>

            {/* Busca interna */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={buscaTombo}
                onChange={(e) => setBuscaTombo(e.target.value)}
                placeholder="Buscar por número, descrição, setor ou responsável..."
                className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-3 text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>

            {/* Lista */}
            {tombosFiltrados.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">{`Nenhum tombo encontrado para "${buscaTombo}".`}</p>
            ) : (
              <div className="space-y-1.5">
                {tombosFiltrados.map((t) => (
                  <div
                    key={t.id}
                    className="group flex items-start gap-3 rounded-lg border border-border bg-background px-3 py-3 transition-colors hover:border-primary/30 hover:bg-primary/3"
                  >
                    {/* Ícone */}
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                      <Package className="h-3.5 w-3.5 text-primary" />
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-primary">#{t.numero}</span>
                        {!t.ativo && (
                          <span className="rounded-full bg-muted px-1.5 py-px text-[10px] font-medium text-muted-foreground">
                            Baixado
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm font-medium leading-snug text-foreground line-clamp-2">
                        {t.descricaoMaterial ?? <span className="text-muted-foreground italic">Sem descrição</span>}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                        {t.setor && (
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {t.setor.nome}
                          </span>
                        )}
                        {t.matriculaResponsavel && (
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <User className="h-3 w-3 shrink-0" />
                            {t.matriculaResponsavel}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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
