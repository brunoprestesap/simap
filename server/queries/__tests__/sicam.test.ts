import { beforeEach, describe, expect, it, vi } from "vitest";
import { executeSicamQuery } from "@/lib/sicam-oracle";
import {
  buscarTomboSicam,
  buscarSnapshotSicam,
  buscarHistoricoTermosBatch,
  compararLocalComSicam,
  listarTombosPorLotacao,
  type SicamTombo,
} from "@/server/queries/sicam";
import { SicamOracleError } from "@/lib/sicam-oracle/errors";

vi.mock("@/lib/sicam-oracle", () => ({
  executeSicamQuery: vi.fn(),
}));

const mockExecute = vi.mocked(executeSicamQuery);

const rowFixture = {
  NU_TOMBO: "12423",
  DESCRICAO_MATERIAL: "MONITOR LG 29WL500",
  TI_TOMBO: "T",
  CO_FORN: "07953689000118",
  NO_FORN: "FAGUNDEZ DISTRIBUICAO LTDA",
  NU_TERMO_ATUAL: 77,
  AN_TERMO_ATUAL: 2025,
  TI_TERMO_ATUAL: 1,
  COD_LOTACAO: 348,
  COD_SETOR: 9,
  NOME_SETOR: "SETSIS",
  MATRICULA_RESPONSAVEL: "AP20192",
  DT_TERMO: new Date("2025-12-03"),
  FG_ASSINADO: "S",
  DESC_LOTACAO: "NÚCLEO DE TECNOLOGIA DA INFORMAÇÃO NUTEC",
  SIGLA_LOTACAO: "NUTEC",
};

function resolveWith<T>(rows: T[]) {
  mockExecute.mockResolvedValueOnce({
    rows,
    metaData: [],
  } as unknown as Awaited<ReturnType<typeof executeSicamQuery>>);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("buscarTomboSicam", () => {
  it("retorna o tombo mapeado quando encontrado", async () => {
    resolveWith([rowFixture]);

    const tombo = await buscarTomboSicam("12423");

    expect(tombo).toEqual({
      numero: "12423",
      descricaoMaterial: "MONITOR LG 29WL500",
      tipoTombo: "T",
      codigoFornecedor: "07953689000118",
      nomeFornecedor: "FAGUNDEZ DISTRIBUICAO LTDA",
      nuTermo: 77,
      anTermo: 2025,
      tiTermo: 1,
      codLotacao: 348,
      codSetor: 9,
      nomeSetor: "SETSIS",
      matriculaResponsavel: "AP20192",
      dataTermo: new Date("2025-12-03"),
      termoAssinado: true,
      descLotacao: "NÚCLEO DE TECNOLOGIA DA INFORMAÇÃO NUTEC",
      siglaLotacao: "NUTEC",
    });
  });

  it("retorna null quando não há resultados", async () => {
    resolveWith([]);

    const tombo = await buscarTomboSicam("99999");

    expect(tombo).toBeNull();
  });

  it("converte string com zeros à esquerda para NUMBER no bind", async () => {
    resolveWith([]);

    await buscarTomboSicam("00012423");

    const [, binds] = mockExecute.mock.calls[0];
    expect(binds).toEqual({ nuTombo: 12423 });
  });

  it("aceita number direto como input", async () => {
    resolveWith([]);

    await buscarTomboSicam(12423);

    const [, binds] = mockExecute.mock.calls[0];
    expect(binds).toEqual({ nuTombo: 12423 });
  });

  it("rejeita entrada não-numérica", async () => {
    await expect(buscarTomboSicam("abc")).rejects.toThrow(
      /Número de tombo inválido/,
    );
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it("rejeita números negativos ou zero", async () => {
    await expect(buscarTomboSicam(0)).rejects.toThrow(
      /Número de tombo inválido/,
    );
    await expect(buscarTomboSicam(-1)).rejects.toThrow(
      /Número de tombo inválido/,
    );
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it("aplica os filtros canônicos TI_TOMBO != 'L' e IN_SAIDA = 1", async () => {
    resolveWith([]);

    await buscarTomboSicam("12423");

    const [sql] = mockExecute.mock.calls[0];
    expect(sql).toMatch(/TI_TOMBO\s*!=\s*'L'/);
    expect(sql).toMatch(/IN_SAIDA\s*=\s*1/);
  });

  it("usa LEFT JOIN com TERMO para tolerar tombos sem termo (caso de borda 0,02%)", async () => {
    resolveWith([]);

    await buscarTomboSicam("12423");

    const [sql] = mockExecute.mock.calls[0];
    expect(sql).toMatch(/LEFT JOIN TERMO\s+tr/);
  });

  it("trata FG_ASSINADO != 'S' como termo não assinado", async () => {
    resolveWith([{ ...rowFixture, FG_ASSINADO: "N" }]);

    const tombo = await buscarTomboSicam("12423");

    expect(tombo?.termoAssinado).toBe(false);
  });

  it("preserva nulls de lotação/setor para tombos sem TERMO", async () => {
    resolveWith([
      {
        ...rowFixture,
        COD_LOTACAO: null,
        COD_SETOR: null,
        NOME_SETOR: null,
        MATRICULA_RESPONSAVEL: null,
        DT_TERMO: null,
        FG_ASSINADO: null,
      },
    ]);

    const tombo = await buscarTomboSicam("12423");

    expect(tombo).toMatchObject({
      codLotacao: null,
      codSetor: null,
      nomeSetor: null,
      matriculaResponsavel: null,
      dataTermo: null,
      termoAssinado: false,
    });
  });

  it("mapeia descLotacao e siglaLotacao do SARH quando disponíveis", async () => {
    resolveWith([rowFixture]);

    const tombo = await buscarTomboSicam("12423");

    expect(tombo?.descLotacao).toBe("NÚCLEO DE TECNOLOGIA DA INFORMAÇÃO NUTEC");
    expect(tombo?.siglaLotacao).toBe("NUTEC");
  });

  it("retorna descLotacao=null quando lotação não tem cadastro no SARH", async () => {
    resolveWith([{ ...rowFixture, DESC_LOTACAO: null, SIGLA_LOTACAO: null }]);

    const tombo = await buscarTomboSicam("12423");

    expect(tombo?.descLotacao).toBeNull();
    expect(tombo?.siglaLotacao).toBeNull();
  });

  it("inclui LEFT JOIN SARH.RH_LOTACAO na SQL gerada", async () => {
    resolveWith([]);

    await buscarTomboSicam("12423");

    const [sql] = mockExecute.mock.calls[0];
    expect(sql).toMatch(/LEFT JOIN SARH\.RH_LOTACAO\s+rl/);
    expect(sql).toMatch(/LOTA_COD_LOTACAO\s*=\s*tr\.CO_LOTA/);
  });
});

describe("listarTombosPorLotacao", () => {
  it("retorna lista vazia quando count = 0 (sem chamar query de dados)", async () => {
    resolveWith([{ TOTAL: 0 }]);

    const result = await listarTombosPorLotacao(348);

    expect(result).toEqual({
      tombos: [],
      total: 0,
      pagina: 1,
      porPagina: 20,
      totalPaginas: 0,
    });
    // apenas a query de count, não a de dados
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  it("retorna tombos paginados quando há resultados", async () => {
    resolveWith([{ TOTAL: 45 }]);
    resolveWith([rowFixture, { ...rowFixture, NU_TOMBO: "12424" }]);

    const result = await listarTombosPorLotacao(348, {
      pagina: 2,
      porPagina: 20,
    });

    expect(result.total).toBe(45);
    expect(result.totalPaginas).toBe(3);
    expect(result.pagina).toBe(2);
    expect(result.tombos).toHaveLength(2);
    expect(result.tombos[0].numero).toBe("12423");
    expect(result.tombos[1].numero).toBe("12424");
  });

  it("calcula offset corretamente para a 2ª página", async () => {
    resolveWith([{ TOTAL: 100 }]);
    resolveWith([]);

    await listarTombosPorLotacao(348, { pagina: 2, porPagina: 20 });

    const [, binds] = mockExecute.mock.calls[1];
    expect(binds).toMatchObject({ codLotacao: 348, offset: 20, porPagina: 20 });
  });

  it("limita porPagina entre 1 e 100", async () => {
    resolveWith([{ TOTAL: 5 }]);
    resolveWith([]);

    await listarTombosPorLotacao(348, { porPagina: 999 });

    const [, binds] = mockExecute.mock.calls[1];
    expect(binds).toMatchObject({ porPagina: 100 });
  });

  it("garante página >= 1", async () => {
    resolveWith([{ TOTAL: 5 }]);
    resolveWith([]);

    await listarTombosPorLotacao(348, { pagina: 0 });

    const [, binds] = mockExecute.mock.calls[1];
    expect(binds).toMatchObject({ offset: 0 });
  });

  it("rejeita codLotacao inválido (não-positivo ou não-inteiro)", async () => {
    await expect(listarTombosPorLotacao(0)).rejects.toThrow(/codLotacao/);
    await expect(listarTombosPorLotacao(-5)).rejects.toThrow(/codLotacao/);
    await expect(listarTombosPorLotacao(1.5)).rejects.toThrow(/codLotacao/);
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it("usa INNER JOIN com TERMO na query de dados (filtra tombos sem termo)", async () => {
    resolveWith([{ TOTAL: 1 }]);
    resolveWith([rowFixture]);

    await listarTombosPorLotacao(348);

    const [dataSql] = mockExecute.mock.calls[1];
    expect(dataSql).toMatch(/INNER JOIN TERMO\s+tr/);
    // não pode ser LEFT — perderia o filtro por CO_LOTA
    expect(dataSql).not.toMatch(/LEFT JOIN TERMO/);
  });

  it("aplica os filtros canônicos na count e na data query", async () => {
    resolveWith([{ TOTAL: 1 }]);
    resolveWith([rowFixture]);

    await listarTombosPorLotacao(348);

    for (const call of mockExecute.mock.calls) {
      const sql = call[0];
      expect(sql).toMatch(/TI_TOMBO\s*!=\s*'L'/);
      expect(sql).toMatch(/IN_SAIDA\s*=\s*1/);
      expect(sql).toMatch(/CO_LOTA\s*=\s*:codLotacao/);
    }
  });
});

describe("compararLocalComSicam", () => {
  const sicamBase: SicamTombo = {
    numero: "12423",
    descricaoMaterial: "MONITOR LG 29WL500",
    tipoTombo: "T",
    codigoFornecedor: "07953689000118",
    nomeFornecedor: "FAGUNDEZ",
    nuTermo: 77,
    anTermo: 2025,
    tiTermo: 1,
    codLotacao: 348,
    codSetor: 9,
    nomeSetor: "SETSIS",
    matriculaResponsavel: "AP20192",
    dataTermo: new Date("2025-12-03"),
    termoAssinado: true,
    descLotacao: "NÚCLEO DE TECNOLOGIA DA INFORMAÇÃO NUTEC",
    siglaLotacao: "NUTEC",
  };

  it("retorna vazio quando todos os campos batem", () => {
    const divergencias = compararLocalComSicam(
      {
        numero: "12423",
        descricaoMaterial: "MONITOR LG 29WL500",
        unidade: { codigo: "348" },
        setor: { codigo: "9" },
        usuarioResponsavel: { matricula: "AP20192" },
      },
      sicamBase,
    );
    expect(divergencias).toEqual([]);
  });

  it("detecta divergência de unidade quando códigos diferem", () => {
    const divergencias = compararLocalComSicam(
      {
        numero: "12423",
        descricaoMaterial: "MONITOR LG 29WL500",
        unidade: { codigo: "999" },
      },
      sicamBase,
    );
    expect(divergencias).toContain("unidade");
  });

  it("detecta divergência de setor", () => {
    const divergencias = compararLocalComSicam(
      {
        numero: "12423",
        descricaoMaterial: "MONITOR LG 29WL500",
        setor: { codigo: "42" },
      },
      sicamBase,
    );
    expect(divergencias).toContain("setor");
  });

  it("detecta divergência de responsável via usuarioResponsavel.matricula", () => {
    const divergencias = compararLocalComSicam(
      {
        numero: "12423",
        descricaoMaterial: "MONITOR LG 29WL500",
        usuarioResponsavel: { matricula: "AP99999" },
      },
      sicamBase,
    );
    expect(divergencias).toContain("responsavel");
  });

  it("usa matriculaResponsavel snapshot quando usuarioResponsavel está ausente", () => {
    const divergencias = compararLocalComSicam(
      {
        numero: "12423",
        descricaoMaterial: "MONITOR LG 29WL500",
        matriculaResponsavel: "AP99999",
      },
      sicamBase,
    );
    expect(divergencias).toContain("responsavel");
  });

  it("detecta divergência de descrição com trim", () => {
    const divergencias = compararLocalComSicam(
      {
        numero: "12423",
        descricaoMaterial: "  Outro material  ",
      },
      sicamBase,
    );
    expect(divergencias).toContain("descricao");
  });

  it("ignora divergência de descrição quando só diferem espaços", () => {
    const divergencias = compararLocalComSicam(
      {
        numero: "12423",
        descricaoMaterial: "  MONITOR LG 29WL500  ",
      },
      sicamBase,
    );
    expect(divergencias).not.toContain("descricao");
  });

  it("tolera campos nulos do SICAM (não conta como divergência)", () => {
    const divergencias = compararLocalComSicam(
      {
        numero: "12423",
        descricaoMaterial: "MONITOR LG 29WL500",
        unidade: { codigo: "348" },
        setor: { codigo: "9" },
      },
      {
        ...sicamBase,
        codLotacao: null,
        codSetor: null,
        matriculaResponsavel: null,
      },
    );
    expect(divergencias).toEqual([]);
  });
});

describe("buscarSnapshotSicam", () => {
  it("retorna status=ok com dados e divergencias vazias quando local não fornecido", async () => {
    resolveWith([rowFixture]);
    const snapshot = await buscarSnapshotSicam("12423");
    expect(snapshot.status).toBe("ok");
    expect(snapshot.dados?.numero).toBe("12423");
    expect(snapshot.divergencias).toEqual([]);
  });

  it("computa divergencias quando recebe local", async () => {
    resolveWith([rowFixture]);
    const snapshot = await buscarSnapshotSicam("12423", {
      local: {
        numero: "12423",
        descricaoMaterial: "Diferente",
        unidade: { codigo: "999" },
      },
    });
    expect(snapshot.status).toBe("ok");
    expect(snapshot.divergencias).toContain("unidade");
    expect(snapshot.divergencias).toContain("descricao");
  });

  it("retorna status=nao_encontrado quando SICAM não tem o tombo", async () => {
    resolveWith([]);
    const snapshot = await buscarSnapshotSicam("99999");
    expect(snapshot.status).toBe("nao_encontrado");
    expect(snapshot.dados).toBeUndefined();
  });

  it("retorna status=indisponivel quando SICAM lança erro (não propaga)", async () => {
    mockExecute.mockRejectedValueOnce(
      new SicamOracleError("Falha de conexão", { oraCode: 12541 }),
    );
    const snapshot = await buscarSnapshotSicam("12423");
    expect(snapshot.status).toBe("indisponivel");
    expect(snapshot.errorMessage).toMatch(/Falha de conexão/);
    expect(snapshot.oraCode).toBe(12541);
  });

  it("retorna status=indisponivel preservando oraCode null quando erro genérico", async () => {
    mockExecute.mockRejectedValueOnce(new Error("timeout"));
    const snapshot = await buscarSnapshotSicam("12423");
    expect(snapshot.status).toBe("indisponivel");
    expect(snapshot.oraCode).toBeNull();
  });

  it("encaminha timeoutMs para executeSicamQuery", async () => {
    resolveWith([]);
    await buscarSnapshotSicam("12423", { timeoutMs: 1500 });
    const [, , options] = mockExecute.mock.calls[0];
    expect(options).toMatchObject({ timeoutMs: 1500 });
  });

  it("sempre devolve consultadoEm como Date", async () => {
    resolveWith([]);
    const snapshot = await buscarSnapshotSicam("12423");
    expect(snapshot.consultadoEm).toBeInstanceOf(Date);
  });
});

const termoRowFixture = {
  NU_TOMBO: "12423",
  NU_TERMO: 12,
  AN_TERMO: 2024,
  TI_TERMO: 1,
  DT_TERMO: new Date("2024-06-15"),
  COD_LOTACAO: 348,
  COD_SETOR: 9,
  NOME_SETOR: "SETSIS",
  MATRICULA_RESP: "AP20192",
};

describe("buscarHistoricoTermosBatch", () => {
  it("retorna Map vazia quando numeros é array vazio (sem chamar Oracle)", async () => {
    const resultado = await buscarHistoricoTermosBatch([]);

    expect(resultado.size).toBe(0);
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it("retorna Map com histórico mapeado para o tombo encontrado", async () => {
    resolveWith([termoRowFixture]);

    const resultado = await buscarHistoricoTermosBatch(["12423"]);

    expect(resultado.size).toBe(1);
    expect(resultado.get("12423")).toHaveLength(1);
    expect(resultado.get("12423")![0]).toEqual({
      nuTombo: "12423",
      nuTermo: 12,
      anTermo: 2024,
      tiTermo: 1,
      dtTermo: new Date("2024-06-15"),
      codLotacao: 348,
      codSetor: 9,
      nomeSetor: "SETSIS",
      matriculaResp: "AP20192",
    });
  });

  it("usa HISTORICO_TOMBO na SQL gerada com TIPO_OPERACAO = 'E'", async () => {
    resolveWith([]);

    await buscarHistoricoTermosBatch(["12423"]);

    const [sql] = mockExecute.mock.calls[0];
    expect(sql).toMatch(/HISTORICO_TOMBO/);
    expect(sql).toMatch(/TIPO_OPERACAO\s*=\s*'E'/);
  });

  it("agrupa múltiplos termos do mesmo tombo numa única lista", async () => {
    const termo2 = { ...termoRowFixture, NU_TERMO: 8, AN_TERMO: 2022 };
    resolveWith([termoRowFixture, termo2]);

    const resultado = await buscarHistoricoTermosBatch(["12423"]);

    expect(resultado.get("12423")).toHaveLength(2);
  });

  it("agrupa termos de tombos diferentes em chaves separadas", async () => {
    const termoOutroTombo = { ...termoRowFixture, NU_TOMBO: "12424" };
    resolveWith([termoRowFixture, termoOutroTombo]);

    const resultado = await buscarHistoricoTermosBatch(["12423", "12424"]);

    expect(resultado.size).toBe(2);
    expect(resultado.get("12423")).toHaveLength(1);
    expect(resultado.get("12424")).toHaveLength(1);
  });

  it("divide em sub-lotes quando há mais de 100 números", async () => {
    const numeros = Array.from({ length: 150 }, (_, i) => String(i + 1));

    // Sub-lote 1: primeiros 100, Sub-lote 2: últimos 50
    resolveWith([]);
    resolveWith([]);

    await buscarHistoricoTermosBatch(numeros);

    expect(mockExecute).toHaveBeenCalledTimes(2);
  });

  it("encaminha timeoutMs para executeSicamQuery", async () => {
    resolveWith([]);

    await buscarHistoricoTermosBatch(["12423"], { timeoutMs: 10000 });

    const [, , options] = mockExecute.mock.calls[0];
    expect(options).toMatchObject({ timeoutMs: 10000 });
  });

  it("usa NU_TOMBO IN (<placeholders>) na SQL gerada", async () => {
    resolveWith([]);

    await buscarHistoricoTermosBatch(["12423", "12424"]);

    const [sql] = mockExecute.mock.calls[0];
    expect(sql).toMatch(/NU_TOMBO IN \(:b0,:b1\)/);
  });

  it("propaga SicamOracleError lançado pelo executor", async () => {
    mockExecute.mockRejectedValueOnce(
      new SicamOracleError("Falha Oracle", { oraCode: 12541 }),
    );

    await expect(buscarHistoricoTermosBatch(["12423"])).rejects.toThrow(
      SicamOracleError,
    );
  });
});
