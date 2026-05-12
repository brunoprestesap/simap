export interface UnidadeResumo {
  id: string;
  codigo: string;
  descricao: string;
}

export interface SetorResumo {
  id: string;
  codigo?: string;
  nome: string;
}

/** Responsável patrimonial (Usuário SIMAP ou só espelho SICAM em matricula/nome do tombo) */
export interface ResponsavelPatrimonioResumo {
  id: string;
  nome: string;
  matricula: string;
}

export interface TomboSelecionado {
  id: string;
  numero: string;
  descricaoMaterial: string;
  unidade?: UnidadeResumo | null;
  setor?: SetorResumo | null;
  usuarioResponsavel?: ResponsavelPatrimonioResumo | null;
  matriculaResponsavel?: string | null;
  nomeResponsavel?: string | null;
}

/**
 * Snapshot real-time do SICAM acoplado a um lookup local. Estrutura espelhada
 * de `SnapshotSicamResult` em `server/queries/sicam.ts` — duplicada aqui
 * porque tipos podem cruzar fronteira client/server na resposta de Server
 * Actions, e o módulo de queries é server-only.
 */
export interface TomboSicamSnapshot {
  status: "ok" | "indisponivel" | "nao_encontrado";
  consultadoEm: Date;
  errorMessage?: string;
  oraCode?: number | null;
  dados?: {
    numero: string;
    descricaoMaterial: string;
    tipoTombo: string;
    codigoFornecedor: string | null;
    nomeFornecedor: string | null;
    codLotacao: number | null;
    codSetor: number | null;
    nomeSetor: string | null;
    matriculaResponsavel: string | null;
    dataTermo: Date | null;
    termoAssinado: boolean;
  };
  divergencias?: Array<"unidade" | "setor" | "responsavel" | "descricao">;
}

export type BuscarTomboMovimentacaoResult =
  | {
      status: "nao_encontrado";
      codigo: string;
      sicamSnapshot?: TomboSicamSnapshot;
    }
  | {
      status: "em_movimentacao";
      codigo: string;
      sicamSnapshot?: TomboSicamSnapshot;
    }
  | {
      status: "disponivel";
      tombo: TomboSelecionado;
      sicamSnapshot?: TomboSicamSnapshot;
    };
