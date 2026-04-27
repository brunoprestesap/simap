import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTomboSelection } from "@/lib/hooks/use-tombo-selection";
import type {
  BuscarTomboMovimentacaoResult,
  TomboSelecionado,
} from "@/lib/movimentacao-types";

const buscarTomboParaMovimentacaoMock = vi.fn();
const showToastMock = vi.fn();

vi.mock("@/server/queries/tombo", () => ({
  buscarTomboParaMovimentacao: (codigo: string) =>
    buscarTomboParaMovimentacaoMock(codigo),
}));

vi.mock("@/lib/hooks/use-toast", () => ({
  useToast: () => ({
    toast: null,
    show: showToastMock,
    dismiss: vi.fn(),
  }),
}));

function createTombo(numero: string): TomboSelecionado {
  return {
    id: `tombo-${numero}`,
    numero,
    descricaoMaterial: `Tombo ${numero}`,
    unidade: {
      id: "unidade-1",
      codigo: "001",
      descricao: "Secretaria",
    },
    setor: {
      id: "setor-1",
      codigo: "10",
      nome: "Sala 1",
    },
    usuarioResponsavel: {
      id: "usuario-1",
      nome: "Usuário Exemplo",
      matricula: "AP20151",
    },
    matriculaResponsavel: "AP20151",
    nomeResponsavel: "Usuário Exemplo",
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}

describe("useTomboSelection", () => {
  beforeEach(() => {
    buscarTomboParaMovimentacaoMock.mockReset();
    showToastMock.mockReset();
  });

  it("adiciona um tombo e impede duplicidade na lista", async () => {
    buscarTomboParaMovimentacaoMock.mockResolvedValue({
      status: "disponivel",
      tombo: createTombo("100000"),
    } satisfies BuscarTomboMovimentacaoResult);

    const { result } = renderHook(() => useTomboSelection());

    await act(async () => {
      await result.current.addTombo(" 100000 ");
    });

    await waitFor(() => expect(result.current.tombos).toHaveLength(1));

    let shouldAddDuplicate = true;

    await act(async () => {
      shouldAddDuplicate = await result.current.addTombo("100000");
    });

    expect(shouldAddDuplicate).toBe(false);
    expect(buscarTomboParaMovimentacaoMock).toHaveBeenCalledTimes(1);
    expect(showToastMock).toHaveBeenCalledWith(
      "info",
      "Tombo 100000 já está na lista.",
    );
  });

  it("trata tombos com e sem zero à esquerda como o mesmo registro", async () => {
    buscarTomboParaMovimentacaoMock.mockResolvedValue({
      status: "disponivel",
      tombo: createTombo("11706"),
    } satisfies BuscarTomboMovimentacaoResult);

    const { result } = renderHook(() => useTomboSelection());

    await act(async () => {
      await result.current.addTombo("011706");
    });

    await waitFor(() => expect(result.current.tombos).toHaveLength(1));

    let shouldAddDuplicate = true;

    await act(async () => {
      shouldAddDuplicate = await result.current.addTombo("11706");
    });

    expect(shouldAddDuplicate).toBe(false);
    expect(result.current.tombos).toHaveLength(1);
    expect(buscarTomboParaMovimentacaoMock).toHaveBeenCalledTimes(1);
    expect(showToastMock).toHaveBeenCalledWith(
      "info",
      "Tombo 11706 já está na lista.",
    );
  });

  it("mantém o estado de loading enquanto existe busca em andamento", async () => {
    const pendingLookup = deferred<BuscarTomboMovimentacaoResult>();
    buscarTomboParaMovimentacaoMock.mockReturnValueOnce(pendingLookup.promise);

    const { result } = renderHook(() => useTomboSelection());

    act(() => {
      void result.current.addTombo("100001");
    });

    await waitFor(() => expect(result.current.isAddingTombo).toBe(true));

    await act(async () => {
      pendingLookup.resolve({
        status: "disponivel",
        tombo: createTombo("100001"),
      });
      await pendingLookup.promise;
    });

    await waitFor(() => expect(result.current.isAddingTombo).toBe(false));
  });

  it("remove um tombo já selecionado", async () => {
    buscarTomboParaMovimentacaoMock.mockResolvedValue({
      status: "disponivel",
      tombo: createTombo("100002"),
    } satisfies BuscarTomboMovimentacaoResult);

    const { result } = renderHook(() => useTomboSelection());

    await act(async () => {
      await result.current.addTombo("100002");
    });

    await waitFor(() => expect(result.current.tombos).toHaveLength(1));

    act(() => {
      result.current.removeTombo("100002");
    });

    expect(result.current.tombos).toHaveLength(0);
  });

  it("exibe feedback de erro quando o tombo não é encontrado", async () => {
    buscarTomboParaMovimentacaoMock.mockResolvedValue({
      status: "nao_encontrado",
      codigo: "999999",
    } satisfies BuscarTomboMovimentacaoResult);

    const { result } = renderHook(() => useTomboSelection());

    await act(async () => {
      await result.current.addTombo("999999");
    });

    expect(result.current.tombos).toHaveLength(0);
    expect(showToastMock).toHaveBeenCalledWith(
      "error",
      "Tombo 999999 não encontrado.",
    );
  });

  it("evita reprocessar o mesmo tombo enquanto a busca ainda está em andamento", async () => {
    const pendingLookup = deferred<BuscarTomboMovimentacaoResult>();
    buscarTomboParaMovimentacaoMock.mockReturnValueOnce(pendingLookup.promise);

    const { result } = renderHook(() => useTomboSelection());

    act(() => {
      void result.current.addTombo("100003");
    });

    await waitFor(() => expect(result.current.isAddingTombo).toBe(true));

    let shouldReprocess = true;

    await act(async () => {
      shouldReprocess = await result.current.addTombo("100003");
    });

    expect(shouldReprocess).toBe(false);
    expect(buscarTomboParaMovimentacaoMock).toHaveBeenCalledTimes(1);
    expect(showToastMock).toHaveBeenCalledWith(
      "info",
      "Tombo 100003 já está sendo processado.",
    );

    await act(async () => {
      pendingLookup.resolve({
        status: "disponivel",
        tombo: createTombo("100003"),
      });
      await pendingLookup.promise;
    });
  });
});
