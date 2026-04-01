"use client";

import { useState, useTransition } from "react";

interface UseAdminFormOptions<TItem, TFormData> {
  getDefaultValues: () => TFormData;
  getValuesFromItem: (item: TItem) => TFormData;
  createAction?: (data: TFormData) => Promise<{ success: boolean; error?: string }>;
  editAction: (id: string, data: TFormData) => Promise<{ success: boolean; error?: string }>;
  onSuccess: () => void;
  onOpenSheet: () => void;
  onCloseSheet: () => void;
}

export function useAdminForm<TItem extends { id: string }, TFormData>(
  options: UseAdminFormOptions<TItem, TFormData>
) {
  const [formData, setFormData] = useState<TFormData>(options.getDefaultValues());
  const [editando, setEditando] = useState<TItem | null>(null);
  const [erro, setErro] = useState("");
  const [isSubmitting, startSubmit] = useTransition();

  function openCreate() {
    setEditando(null);
    setFormData(options.getDefaultValues());
    setErro("");
    options.onOpenSheet();
  }

  function openEdit(item: TItem) {
    setEditando(item);
    setFormData(options.getValuesFromItem(item));
    setErro("");
    options.onOpenSheet();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    startSubmit(async () => {
      const result = editando
        ? await options.editAction(editando.id, formData)
        : options.createAction
          ? await options.createAction(formData)
          : { success: false, error: "Ação de criação não configurada." };

      if (result.success) {
        options.onCloseSheet();
        options.onSuccess();
      } else {
        setErro(result.error || "Erro ao salvar.");
      }
    });
  }

  function updateField<K extends keyof TFormData>(key: K, value: TFormData[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  return {
    formData,
    setFormData,
    editando,
    erro,
    isSubmitting,
    startSubmit,
    openCreate,
    openEdit,
    handleSubmit,
    updateField,
  };
}
