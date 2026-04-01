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

export interface ServidorResponsavelResumo {
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
  servidorResponsavel?: ServidorResponsavelResumo | null;
}

export type BuscarTomboMovimentacaoResult =
  | {
      status: "nao_encontrado";
      codigo: string;
    }
  | {
      status: "em_movimentacao";
      codigo: string;
    }
  | {
      status: "disponivel";
      tombo: TomboSelecionado;
    };
