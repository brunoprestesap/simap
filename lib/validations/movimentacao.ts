import { z } from "zod/v4";

export const criarMovimentacaoSchema = z.object({
  tomboIds: z
    .array(z.string().min(1, "ID do tombo inválido"))
    .min(1, "Selecione ao menos um tombo."),
  unidadeDestinoId: z.string().min(1, "Unidade de destino é obrigatória."),
  setorOrigemId: z.string().min(1).optional(),
  setorDestinoId: z.string().min(1, "Setor de destino é obrigatório."),
});

export type CriarMovimentacaoInput = z.input<typeof criarMovimentacaoSchema>;
