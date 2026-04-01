"use server";

import { requireAuthAction } from "@/lib/auth-guard";
import { MOVIMENTACAO_STATUS_EM_ANDAMENTO } from "@/lib/movimentacao-status";
import { prisma } from "@/lib/prisma";
import { criarMovimentacaoSchema } from "@/lib/validations/movimentacao";
import type { CriarMovimentacaoInput } from "@/lib/validations/movimentacao";
import { registrarAuditoria } from "@/server/services/audit";
import { enviarEmail } from "@/server/services/email";
import {
  templateEmailSaida,
  templateEmailEntrada,
} from "@/server/services/email-templates";
import { buscarEmailsPorMatriculas } from "@/server/services/ldap";
import {
  criarNotificacoes,
  buscarUsuarioIdsPorMatriculas,
} from "@/server/services/notificacao";
import { formatDateTimeBR } from "@/lib/format";

export async function criarMovimentacao(input: CriarMovimentacaoInput): Promise<{
  success: boolean;
  error?: string;
  movimentacaoId?: string;
}> {
  const { user, error: authError } = await requireAuthAction();
  if (authError) return { success: false, error: authError };

  // ─── Validação Zod ────────────────────────────────────────

  const parsed = criarMovimentacaoSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { tomboIds, unidadeDestinoId, setorOrigemId, setorDestinoId } = parsed.data;

  // ─── Validação de negócio ─────────────────────────────────

  const tombos = await prisma.tombo.findMany({
    where: { id: { in: tomboIds } },
    include: { unidade: true, servidorResponsavel: true },
  });

  if (tombos.length === 0) {
    return { success: false, error: "Tombos não encontrados." };
  }

  const unidadeOrigemId = tombos[0].unidadeId;
  if (!unidadeOrigemId) {
    return { success: false, error: "O tombo selecionado não possui unidade de origem definida." };
  }
  if (!tombos.every((t) => t.unidadeId === unidadeOrigemId)) {
    return { success: false, error: "Todos os tombos devem ser da mesma unidade de origem." };
  }
  if (unidadeOrigemId === unidadeDestinoId) {
    return { success: false, error: "A unidade de destino deve ser diferente da origem." };
  }

  const tombosEmMovimentacao = await prisma.itemMovimentacao.findMany({
    where: {
      tomboId: { in: tomboIds },
      movimentacao: {
        status: { in: [...MOVIMENTACAO_STATUS_EM_ANDAMENTO] },
      },
    },
    select: {
      tomboId: true,
      tombo: {
        select: { numero: true },
      },
    },
    distinct: ["tomboId"],
  });

  if (tombosEmMovimentacao.length > 0) {
    const numeros = tombosEmMovimentacao.map((item) => item.tombo.numero).join(", ");
    const prefixo =
      tombosEmMovimentacao.length === 1
        ? `Tombo ${numeros} já possui`
        : `Os tombos ${numeros} já possuem`;

    return {
      success: false,
      error: `${prefixo} movimentação em andamento.`,
    };
  }

  // ─── Criação ──────────────────────────────────────────────

  const tokenExpiryDays = Number(process.env.TOKEN_EXPIRY_DAYS ?? "7");
  const tokenExpiraEm = new Date(Date.now() + tokenExpiryDays * 24 * 60 * 60 * 1000);

  const movimentacao = await prisma.movimentacao.create({
    data: {
      unidadeOrigemId,
      unidadeDestinoId,
      setorOrigemId: setorOrigemId ?? null,
      setorDestinoId: setorDestinoId ?? null,
      tecnicoId: user!.id,
      status: "PENDENTE_CONFIRMACAO",
      tokenConfirmacao: crypto.randomUUID(),
      tokenExpiraEm,
      itens: {
        create: tomboIds.map((tomboId) => ({ tomboId })),
      },
    },
    include: {
      unidadeOrigem: true,
      unidadeDestino: true,
      setorOrigem: { select: { id: true, nome: true } },
      setorDestino: { select: { id: true, nome: true } },
      itens: { include: { tombo: true } },
    },
  });

  // ─── Auditoria ────────────────────────────────────────────

  await registrarAuditoria(
    "CRIACAO_MOVIMENTACAO",
    "Movimentacao",
    movimentacao.id,
    user!.id,
    {
      origem: movimentacao.unidadeOrigem.descricao,
      destino: movimentacao.unidadeDestino.descricao,
      tombos: movimentacao.itens.map((i) => i.tombo.numero),
    },
  );

  // ─── E-mails (fire-and-forget) ────────────────────────────

  const tombosInfo = movimentacao.itens.map((i) => ({
    numero: i.tombo.numero,
    descricao: i.tombo.descricaoMaterial,
  }));

  const emailData = {
    tombos: tombosInfo,
    origemDescricao: movimentacao.unidadeOrigem.descricao,
    destinoDescricao: movimentacao.unidadeDestino.descricao,
    tecnicoNome: user!.nome,
    data: formatDateTimeBR(new Date()),
  };

  const appUrl = process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const linkConfirmacao = `${appUrl}/confirmar/${movimentacao.tokenConfirmacao}`;

  const responsaveisOrigem = [
    ...new Set(
      tombos
        .filter((t) => t.servidorResponsavel)
        .map((t) => t.servidorResponsavel!.matricula),
    ),
  ];

  const destinoServidores = await prisma.servidor.findMany({
    where: { unidadeId: unidadeDestinoId, ativo: true },
    select: { matricula: true },
  });

  const todasMatriculas = [
    ...responsaveisOrigem,
    ...destinoServidores.map((s) => s.matricula),
  ];

  // Busca todos e-mails em uma única query (fire-and-forget com log de erro)
  buscarEmailsPorMatriculas(todasMatriculas)
    .then((emailMap) => {
      for (const matricula of responsaveisOrigem) {
        const email = emailMap.get(matricula);
        if (email) {
          enviarEmail(
            email,
            "Movimentação Patrimonial - Confirmação de Saída",
            templateEmailSaida({ ...emailData, linkConfirmacao }),
          );
        }
      }
      for (const srv of destinoServidores) {
        const email = emailMap.get(srv.matricula);
        if (email) {
          enviarEmail(
            email,
            "Movimentação Patrimonial - Entrada de Tombos",
            templateEmailEntrada(emailData),
          );
        }
      }
    })
    .catch((err) => {
      console.error("[MOVIMENTACAO] Falha ao enviar e-mails de notificação:", err);
    });

  // ─── Notificações ─────────────────────────────────────────

  const usuarioIds = await buscarUsuarioIdsPorMatriculas(responsaveisOrigem);

  await criarNotificacoes({
    tipo: "SAIDA_TOMBO",
    titulo: "Saída de tombos registrada",
    mensagem: `${tombosInfo.length} tombo(s) movimentado(s) de ${movimentacao.unidadeOrigem.descricao} para ${movimentacao.unidadeDestino.descricao}.`,
    link: `/movimentacao/${movimentacao.id}`,
    usuarioDestinoIds: usuarioIds,
  });

  return { success: true, movimentacaoId: movimentacao.id };
}
