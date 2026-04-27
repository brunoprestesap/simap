"use server";

import { z } from "zod/v4";
import { requireRoleAction } from "@/lib/auth-guard";
import { parseDateOnlyLocal } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/server/services/audit";

const registroSicamSchema = z.object({
  movimentacaoId: z.string().min(1, "ID da movimentação é obrigatório"),
  protocoloSicam: z.string().min(1, "Nº do protocolo SICAM é obrigatório"),
  dataRegistroSicam: z.string().min(1, "Data do registro é obrigatória"),
  observacoesSicam: z.string().max(500, "Máximo 500 caracteres").optional(),
});

export async function registrarNoSicam(input: z.input<typeof registroSicamSchema>): Promise<{
  success: boolean;
  error?: string;
}> {
  const { user, error: authError } = await requireRoleAction(["SERVIDOR_SEMAP", "GESTOR_ADMIN"]);
  if (authError) return { success: false, error: authError };

  const parsed = registroSicamSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { movimentacaoId, protocoloSicam, dataRegistroSicam, observacoesSicam } =
    parsed.data;

  // Validate date is not in the future
  const dataRegistro = parseDateOnlyLocal(dataRegistroSicam);
  if (dataRegistro > new Date()) {
    return { success: false, error: "A data do registro não pode ser futura." };
  }

  const movimentacao = await prisma.movimentacao.findUnique({
    where: { id: movimentacaoId },
    include: {
      unidadeOrigem: { select: { descricao: true } },
      unidadeDestino: { select: { id: true, descricao: true } },
      tecnico: { select: { id: true, nome: true } },
      itens: {
        include: {
          tombo: {
            select: {
              id: true,
              numero: true,
              usuarioResponsavel: { select: { id: true, nome: true, matricula: true } },
              matriculaResponsavel: true,
              nomeResponsavel: true,
            },
          },
        },
      },
    },
  });

  if (!movimentacao) {
    return { success: false, error: "Movimentação não encontrada." };
  }

  if (movimentacao.status !== "CONFIRMADA_ORIGEM") {
    return {
      success: false,
      error: "Somente movimentações confirmadas podem ser registradas no SICAM.",
    };
  }

  // Resolve novo responsável patrimonial no destino:
  // 1) usuário ativo da mesma unidade e mesmo setor de destino
  // 2) fallback para responsável da unidade destino
  const responsavelSetorDestino = movimentacao.setorDestinoId
    ? await prisma.usuario.findFirst({
        where: {
          ativo: true,
          unidadeId: movimentacao.unidadeDestinoId,
          setorId: movimentacao.setorDestinoId,
        },
        select: { id: true, matricula: true, nome: true },
      })
    : null;

  const responsavelUnidadeDestino =
    responsavelSetorDestino ??
    (await prisma.usuario.findFirst({
      where: {
        ativo: true,
        unidadeId: movimentacao.unidadeDestinoId,
        responsavelUnidade: true,
      },
      select: { id: true, matricula: true, nome: true },
    }));

  // Update movimentacao status + SICAM data
  await prisma.movimentacao.update({
    where: { id: movimentacaoId },
    data: {
      status: "REGISTRADA_SICAM",
      protocoloSicam,
      dataRegistroSicam: dataRegistro,
      observacoesSicam: observacoesSicam || null,
      registradoSicamPorId: user!.id,
    },
  });

  // Update tombo lotação (move to destination unit/setor)
  const tomboIds = movimentacao.itens.map((i) => i.tomboId);
  await prisma.tombo.updateMany({
    where: { id: { in: tomboIds } },
    data: {
      unidadeId: movimentacao.unidadeDestinoId,
      setorId: movimentacao.setorDestinoId ?? null,
      usuarioResponsavelId: responsavelUnidadeDestino?.id ?? null,
      matriculaResponsavel: responsavelUnidadeDestino?.matricula ?? null,
      nomeResponsavel: responsavelUnidadeDestino?.nome ?? null,
    },
  });

  // Audit log
  await registrarAuditoria(
    "REGISTRO_SICAM",
    "Movimentacao",
    movimentacaoId,
    user!.id,
    {
      protocoloSicam,
      dataRegistroSicam,
      origem: movimentacao.unidadeOrigem.descricao,
      destino: movimentacao.unidadeDestino.descricao,
      tombos: movimentacao.itens.map((i) => i.tombo.numero),
    },
  );

  // Notifications
  const notificacaoDestinatarios = new Set<string>();
  notificacaoDestinatarios.add(movimentacao.tecnicoId);

  // Get origin and destination responsible users
  const responsaveisMatriculas = [
    ...new Set(
      movimentacao.itens
        .map((i) => {
          const t = i.tombo;
          return t.usuarioResponsavel?.matricula ?? t.matriculaResponsavel ?? null;
        })
        .filter((m): m is string => Boolean(m)),
    ),
  ];

  const usuariosResponsaveis = await prisma.usuario.findMany({
    where: {
      matricula: { in: responsaveisMatriculas },
      ativo: true,
    },
  });

  for (const u of usuariosResponsaveis) {
    notificacaoDestinatarios.add(u.id);
  }

  await Promise.all(
    [...notificacaoDestinatarios].map((usuarioDestinoId) =>
      prisma.notificacao.create({
        data: {
          tipo: "REGISTRO_SICAM",
          titulo: "Movimentação registrada no SICAM",
          mensagem: `Protocolo ${protocoloSicam} — ${movimentacao.unidadeOrigem.descricao} → ${movimentacao.unidadeDestino.descricao}`,
          link: `/movimentacao/${movimentacaoId}`,
          usuarioDestinoId,
        },
      }),
    ),
  );

  return { success: true };
}
