"use server";

import { z } from "zod/v4";
import { requireRoleAction } from "@/lib/auth-guard";
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
  const dataRegistro = new Date(dataRegistroSicam);
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
              servidorResponsavel: { select: { id: true, nome: true, matricula: true } },
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

  // Update tombo lotação (move to destination unit)
  const tomboIds = movimentacao.itens.map((i) => i.tomboId);
  await prisma.tombo.updateMany({
    where: { id: { in: tomboIds } },
    data: { unidadeId: movimentacao.unidadeDestinoId },
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
    ...new Set(movimentacao.itens.filter((i) => i.tombo.servidorResponsavel).map((i) => i.tombo.servidorResponsavel!.matricula)),
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
