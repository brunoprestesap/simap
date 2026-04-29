"use server";

import { z } from "zod/v4";
import { requireRoleAction } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/server/services/audit";

function normalizeCode(value: string): string {
  return value.trim().toUpperCase();
}

function normalizeLabel(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

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

  const data = {
    codigo: normalizeCode(parsed.data.codigo),
    descricao: normalizeLabel(parsed.data.descricao),
  };

  const existente = await prisma.unidade.findFirst({
    where: {
      OR: [
        { codigo: { equals: data.codigo, mode: "insensitive" } },
        { descricao: { equals: data.descricao, mode: "insensitive" } },
      ],
    },
    select: { id: true, codigo: true, descricao: true },
  });
  if (existente) {
    const colideCodigo = existente.codigo.toLowerCase() === data.codigo.toLowerCase();
    return {
      success: false,
      error: colideCodigo
        ? "Código de unidade já existe."
        : "Descrição de unidade já existe.",
    };
  }

  const unidade = await prisma.unidade.create({
    data,
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

  const data = {
    codigo: normalizeCode(parsed.data.codigo),
    descricao: normalizeLabel(parsed.data.descricao),
  };

  const colidente = await prisma.unidade.findFirst({
    where: {
      id: { not: id },
      OR: [
        { codigo: { equals: data.codigo, mode: "insensitive" } },
        { descricao: { equals: data.descricao, mode: "insensitive" } },
      ],
    },
    select: { codigo: true, descricao: true },
  });
  if (colidente) {
    const colideCodigo = colidente.codigo.toLowerCase() === data.codigo.toLowerCase();
    return {
      success: false,
      error: colideCodigo
        ? "Código de unidade já existe."
        : "Descrição de unidade já existe.",
    };
  }

  await prisma.unidade.update({
    where: { id },
    data,
  });

  await registrarAuditoria("EDITAR_UNIDADE", "Unidade", id, user!.id, {
    codigo: data.codigo,
    descricao: data.descricao,
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

  const data = {
    codigo: normalizeCode(parsed.data.codigo),
    nome: normalizeLabel(parsed.data.nome),
    unidadeId: parsed.data.unidadeId,
  };

  const existente = await prisma.setor.findFirst({
    where: {
      unidadeId: data.unidadeId,
      OR: [
        { codigo: { equals: data.codigo, mode: "insensitive" } },
        { nome: { equals: data.nome, mode: "insensitive" } },
      ],
    },
    select: { codigo: true, nome: true },
  });
  if (existente) {
    const colideCodigo = existente.codigo.toLowerCase() === data.codigo.toLowerCase();
    return {
      success: false,
      error: colideCodigo
        ? "Código de setor já existe nesta unidade."
        : "Nome de setor já existe nesta unidade.",
    };
  }

  const setor = await prisma.setor.create({
    data,
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

  const data = {
    codigo: normalizeCode(parsed.data.codigo),
    nome: normalizeLabel(parsed.data.nome),
    unidadeId: parsed.data.unidadeId,
  };

  const colidente = await prisma.setor.findFirst({
    where: {
      id: { not: id },
      unidadeId: data.unidadeId,
      OR: [
        { codigo: { equals: data.codigo, mode: "insensitive" } },
        { nome: { equals: data.nome, mode: "insensitive" } },
      ],
    },
    select: { codigo: true, nome: true },
  });
  if (colidente) {
    const colideCodigo = colidente.codigo.toLowerCase() === data.codigo.toLowerCase();
    return {
      success: false,
      error: colideCodigo
        ? "Código de setor já existe nesta unidade."
        : "Nome de setor já existe nesta unidade.",
    };
  }

  await prisma.setor.update({
    where: { id },
    data,
  });

  await registrarAuditoria("EDITAR_SETOR", "Setor", id, user!.id, {
    codigo: data.codigo,
    nome: data.nome,
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

// ─── Lotação patrimonial (Usuario) ───────────────────────

const editarUsuarioLotacaoSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  unidadeId: z.string().min(1, "Unidade é obrigatória"),
  responsavelUnidade: z.boolean(),
  setorId: z.string().optional().or(z.literal("")),
});

export async function editarUsuarioLotacao(
  usuarioId: string,
  input: z.input<typeof editarUsuarioLotacaoSchema>,
): Promise<{ success: boolean; error?: string }> {
  const { user, error } = await requireRoleAction(["GESTOR_ADMIN", "SERVIDOR_SEMAP"]);
  if (error) return { success: false, error };

  const parsed = editarUsuarioLotacaoSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const { nome, email, unidadeId, responsavelUnidade, setorId } = parsed.data;
  const setorIdFinal =
    responsavelUnidade || !setorId || setorId === "" ? null : setorId;

  if (setorIdFinal) {
    const ok = await prisma.setor.findFirst({
      where: { id: setorIdFinal, unidadeId, ativo: true },
      select: { id: true },
    });
    if (!ok) {
      return { success: false, error: "O setor não pertence à unidade selecionada." };
    }
  }

  await prisma.usuario.update({
    where: { id: usuarioId },
    data: {
      nome,
      email: email || null,
      unidadeId,
      responsavelUnidade,
      setorId: setorIdFinal,
    },
  });

  await registrarAuditoria("EDITAR_USUARIO_LOTACAO", "Usuario", usuarioId, user!.id, {
    nome,
    unidadeId,
    responsavelUnidade,
    setorId: setorIdFinal,
  });

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

