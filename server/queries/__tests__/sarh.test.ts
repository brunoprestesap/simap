import { beforeEach, describe, expect, it, vi } from "vitest";
import { executeSicamQuery } from "@/lib/sicam-oracle";
import { buscarLotacaoAtualPorMatricula } from "@/server/queries/sarh";
import { SicamOracleError } from "@/lib/sicam-oracle/errors";

vi.mock("@/lib/sicam-oracle", () => ({
  executeSicamQuery: vi.fn(),
}));

const mockExecute = vi.mocked(executeSicamQuery);

function resolveWith<T>(rows: T[]) {
  mockExecute.mockResolvedValueOnce({
    rows,
    metaData: [],
  } as unknown as Awaited<ReturnType<typeof executeSicamQuery>>);
}

function rejectWith(err: unknown) {
  mockExecute.mockRejectedValueOnce(err);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("buscarLotacaoAtualPorMatricula", () => {
  it("retorna lotação quando servidor existe no SARH", async () => {
    resolveWith([{ COD_LOTA: 460, DESC_LOTA: "SETOR DE SUPORTE AO USUÁRIO E A SISTEMAS DE TI", SIGLA_LOTA: "SETSIS" }]);

    const result = await buscarLotacaoAtualPorMatricula("AP20256");

    expect(result).toEqual({
      codLotacao: 460,
      descLotacao: "SETOR DE SUPORTE AO USUÁRIO E A SISTEMAS DE TI",
      siglaLotacao: "SETSIS",
    });
    expect(mockExecute).toHaveBeenCalledOnce();
  });

  it("retorna lotação sem descrição quando RH_LOTACAO não tem registro ativo", async () => {
    resolveWith([{ COD_LOTA: 350, DESC_LOTA: null, SIGLA_LOTA: null }]);

    const result = await buscarLotacaoAtualPorMatricula("AP20100");

    expect(result).toEqual({ codLotacao: 350, descLotacao: null, siglaLotacao: null });
  });

  it("retorna null quando servidor não existe no SARH (zero linhas)", async () => {
    resolveWith([]);

    const result = await buscarLotacaoAtualPorMatricula("AP99999");

    expect(result).toBeNull();
  });

  it("retorna null quando FUNC_LOTA_COD_LOTACAO é null", async () => {
    resolveWith([{ COD_LOTA: null, DESC_LOTA: null, SIGLA_LOTA: null }]);

    const result = await buscarLotacaoAtualPorMatricula("AP20001");

    expect(result).toBeNull();
  });

  it("retorna null quando rows é undefined (resposta inesperada do Oracle)", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: undefined,
      metaData: [],
    } as unknown as Awaited<ReturnType<typeof executeSicamQuery>>);

    const result = await buscarLotacaoAtualPorMatricula("AP20001");

    expect(result).toBeNull();
  });

  it("retorna null e não lança quando Oracle está indisponível", async () => {
    rejectWith(new SicamOracleError("ORA-12154: Cannot connect", 12154));

    await expect(buscarLotacaoAtualPorMatricula("AP20256")).resolves.toBeNull();
  });

  it("retorna null e não lança para qualquer erro de Oracle genérico", async () => {
    rejectWith(new Error("connection pool exhausted"));

    await expect(buscarLotacaoAtualPorMatricula("AP20256")).resolves.toBeNull();
  });

  it("passa a matrícula como bind parameter na query", async () => {
    resolveWith([]);

    await buscarLotacaoAtualPorMatricula("ap20256");

    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining("FUNC_MATRICULA_FOLHA"),
      expect.objectContaining({ matricula: "ap20256" }),
    );
  });
});
