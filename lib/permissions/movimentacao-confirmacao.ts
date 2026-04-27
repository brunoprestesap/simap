import type {
  PerfilUsuario,
  StatusMovimentacao,
} from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type MotivoPermissaoConfirmacao =
  | "OK"
  | "STATUS_INVALIDO"
  | "TOKEN_EXPIRADO"
  | "SEM_VINCULO_UNIDADE_DESTINO"
  | "SEM_PERMISSAO";

export interface AvaliarPermissaoConfirmacaoInput {
  status: StatusMovimentacao;
  tokenExpiraEm: Date;
  unidadeDestinoId: string;
  usuario: {
    matricula: string;
    perfil: PerfilUsuario;
  };
}

export interface ResultadoPermissaoConfirmacao {
  podeConfirmar: boolean;
  motivo: MotivoPermissaoConfirmacao;
}

export function estaPendenteEValidaParaConfirmacao(
  status: StatusMovimentacao,
  tokenExpiraEm: Date,
): boolean {
  return status === "PENDENTE_CONFIRMACAO" && new Date() <= tokenExpiraEm;
}

export function atendeCriterioCompostoConfirmacao(
  perfil: PerfilUsuario,
  responsavelUnidade: boolean,
): boolean {
  return perfil === "SERVIDOR_RESPONSAVEL" || responsavelUnidade;
}

export async function avaliarPermissaoConfirmacaoMovimentacao(
  input: AvaliarPermissaoConfirmacaoInput,
): Promise<ResultadoPermissaoConfirmacao> {
  if (input.status !== "PENDENTE_CONFIRMACAO") {
    return { podeConfirmar: false, motivo: "STATUS_INVALIDO" };
  }

  if (new Date() > input.tokenExpiraEm) {
    return { podeConfirmar: false, motivo: "TOKEN_EXPIRADO" };
  }

  const usuarioDestino = await prisma.usuario.findFirst({
    where: {
      matricula: input.usuario.matricula,
      unidadeId: input.unidadeDestinoId,
      ativo: true,
    },
    select: {
      responsavelUnidade: true,
    },
  });

  if (!usuarioDestino) {
    return { podeConfirmar: false, motivo: "SEM_VINCULO_UNIDADE_DESTINO" };
  }

  const autorizado = atendeCriterioCompostoConfirmacao(
    input.usuario.perfil,
    usuarioDestino.responsavelUnidade,
  );

  if (!autorizado) {
    return { podeConfirmar: false, motivo: "SEM_PERMISSAO" };
  }

  return { podeConfirmar: true, motivo: "OK" };
}
