"use server";

import { z } from "zod/v4";
import { requireRoleAction } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/server/services/audit";

// ─── Unidades ───────────────────────────────────────────

const unidadeSchema = z.object({
  codigo: z.string().min(1, "Código é obrigatório"),
  descricao: z.string().min(1, "Descrição é obrigatória"),
});

export async function criarUnidade(input: z.input<typeof unidadeSchema>): Promise<{
  success: boolean;
  error?: string;
}> {
  const { user, error } = await requireRoleAction(["GESTOR_ADMIN", "SERVIDOR_SEMAP"]);
  if (error) return { success: false, error };

  const parsed = unidadeSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const existente = await prisma.unidade.findUnique({
    where: { codigo: parsed.data.codigo },
  });
  if (existente) return { success: false, error: "Código de unidade já existe." };

  const unidade = await prisma.unidade.create({
    data: parsed.data,
  });

  await registrarAuditoria("CRIAR_UNIDADE", "Unidade", unidade.id, user!.id, {
    codigo: unidade.codigo,
    descricao: unidade.descricao,
  });

  return { success: true };
}

export async function editarUnidade(
  id: string,
  input: z.input<typeof unidadeSchema>,
): Promise<{ success: boolean; error?: string }> {
  const { user, error } = await requireRoleAction(["GESTOR_ADMIN", "SERVIDOR_SEMAP"]);
  if (error) return { success: false, error };

  const parsed = unidadeSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const existente = await prisma.unidade.findUnique({
    where: { codigo: parsed.data.codigo },
  });
  if (existente && existente.id !== id) {
    return { success: false, error: "Código de unidade já existe." };
  }

  await prisma.unidade.update({
    where: { id },
    data: parsed.data,
  });

  await registrarAuditoria("EDITAR_UNIDADE", "Unidade", id, user!.id, {
    codigo: parsed.data.codigo,
    descricao: parsed.data.descricao,
  });

  return { success: true };
}

export async function desativarUnidade(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const { user, error } = await requireRoleAction(["GESTOR_ADMIN", "SERVIDOR_SEMAP"]);
  if (error) return { success: false, error };

  await prisma.unidade.update({
    where: { id },
    data: { ativo: false },
  });

  await registrarAuditoria("DESATIVAR_UNIDADE", "Unidade", id, user!.id, {});

  return { success: true };
}

// ─── Setores ────────────────────────────────────────────

const setorSchema = z.object({
  codigo: z.string().min(1, "Código é obrigatório"),
  nome: z.string().min(1, "Nome é obrigatório"),
  unidadeId: z.string().min(1, "Unidade é obrigatória"),
});

export async function criarSetor(input: z.input<typeof setorSchema>): Promise<{
  success: boolean;
  error?: string;
}> {
  const { user, error } = await requireRoleAction(["GESTOR_ADMIN", "SERVIDOR_SEMAP"]);
  if (error) return { success: false, error };

  const parsed = setorSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const existente = await prisma.setor.findUnique({
    where: {
      codigo_unidadeId: {
        codigo: parsed.data.codigo,
        unidadeId: parsed.data.unidadeId,
      },
    },
  });
  if (existente) return { success: false, error: "Código de setor já existe nesta unidade." };

  const setor = await prisma.setor.create({
    data: parsed.data,
  });

  await registrarAuditoria("CRIAR_SETOR", "Setor", setor.id, user!.id, {
    codigo: setor.codigo,
    nome: setor.nome,
  });

  return { success: true };
}

export async function editarSetor(
  id: string,
  input: z.input<typeof setorSchema>,
): Promise<{ success: boolean; error?: string }> {
  const { user, error } = await requireRoleAction(["GESTOR_ADMIN", "SERVIDOR_SEMAP"]);
  if (error) return { success: false, error };

  const parsed = setorSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const existente = await prisma.setor.findUnique({
    where: {
      codigo_unidadeId: {
        codigo: parsed.data.codigo,
        unidadeId: parsed.data.unidadeId,
      },
    },
  });
  if (existente && existente.id !== id) {
    return { success: false, error: "Código de setor já existe nesta unidade." };
  }

  await prisma.setor.update({
    where: { id },
    data: parsed.data,
  });

  await registrarAuditoria("EDITAR_SETOR", "Setor", id, user!.id, {
    codigo: parsed.data.codigo,
    nome: parsed.data.nome,
  });

  return { success: true };
}

export async function desativarSetor(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const { user, error } = await requireRoleAction(["GESTOR_ADMIN", "SERVIDOR_SEMAP"]);
  if (error) return { success: false, error };

  await prisma.setor.update({
    where: { id },
    data: { ativo: false },
  });

  await registrarAuditoria("DESATIVAR_SETOR", "Setor", id, user!.id, {});

  return { success: true };
}

// ─── Servidores Responsáveis ────────────────────────────

const editarServidorSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  unidadeId: z.string().min(1, "Unidade é obrigatória"),
});

export async function editarServidor(
  id: string,
  input: z.input<typeof editarServidorSchema>,
): Promise<{ success: boolean; error?: string }> {
  const { user, error } = await requireRoleAction(["GESTOR_ADMIN", "SERVIDOR_SEMAP"]);
  if (error) return { success: false, error };

  const parsed = editarServidorSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  await prisma.servidor.update({
    where: { id },
    data: {
      nome: parsed.data.nome,
      email: parsed.data.email || null,
      unidadeId: parsed.data.unidadeId,
    },
  });

  await registrarAuditoria("EDITAR_SERVIDOR", "Servidor", id, user!.id, {
    nome: parsed.data.nome,
    unidadeId: parsed.data.unidadeId,
  });

  return { success: true };
}

export async function vincularServidorUnidade(
  servidorId: string,
  unidadeId: string,
): Promise<{ success: boolean; error?: string }> {
  const { user, error } = await requireRoleAction(["GESTOR_ADMIN", "SERVIDOR_SEMAP"]);
  if (error) return { success: false, error };

  await prisma.servidor.update({
    where: { id: servidorId },
    data: { unidadeId },
  });

  await registrarAuditoria(
    "VINCULAR_SERVIDOR_UNIDADE",
    "Servidor",
    servidorId,
    user!.id,
    { unidadeId },
  );

  return { success: true };
}

// ─── Perfis de Acesso ───────────────────────────────────

const atribuirPerfilSchema = z.object({
  usuarioId: z.string().min(1, "ID do usuário é obrigatório"),
  perfil: z.enum(["TECNICO_TI", "SERVIDOR_RESPONSAVEL", "SERVIDOR_SEMAP", "GESTOR_ADMIN"]),
});

export async function atribuirPerfil(
  input: z.input<typeof atribuirPerfilSchema>,
): Promise<{ success: boolean; error?: string }> {
  const { user, error } = await requireRoleAction(["GESTOR_ADMIN"]);
  if (error) return { success: false, error };

  const parsed = atribuirPerfilSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  await prisma.usuario.update({
    where: { id: parsed.data.usuarioId },
    data: { perfil: parsed.data.perfil },
  });

  await registrarAuditoria(
    "ATRIBUIR_PERFIL",
    "Usuario",
    parsed.data.usuarioId,
    user!.id,
    { perfil: parsed.data.perfil },
  );

  return { success: true };
}

