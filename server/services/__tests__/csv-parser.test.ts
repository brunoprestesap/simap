import { describe, it, expect } from "vitest";
import { parseCsvSicam } from "../csv-parser";

function toBuffer(content: string, encoding: "utf-8" | "latin1" = "latin1"): ArrayBuffer {
  if (encoding === "latin1") {
    // Simulate Latin-1 encoding
    const bytes = new Uint8Array(content.length);
    for (let i = 0; i < content.length; i++) {
      bytes[i] = content.charCodeAt(i) & 0xff;
    }
    return bytes.buffer;
  }
  return new TextEncoder().encode(content).buffer;
}

const VALID_HEADER =
  "Número Tombo;Descrição Material;Código Fornecedor;Nome Fornecedor;Código Lotação;Descrição Lotação;Código Setor;Nome Setor;Matrícula Responsável;Nome Responsável;Saída";

function makeRow(overrides: Record<string, string> = {}): string {
  const defaults: Record<string, string> = {
    numero: "100001",
    descricao: "Monitor LED 24",
    codFornecedor: "F1001",
    nomeFornecedor: "Fornecedor A",
    codLotacao: "NTI",
    descLotacao: "Núcleo de TI",
    codSetor: "NTI-INFRA",
    nomeSetor: "Infraestrutura",
    matricula: "AP20151",
    nomeResponsavel: "Carlos Silva",
    saida: "",
  };
  const merged = { ...defaults, ...overrides };
  return [
    merged.numero,
    merged.descricao,
    merged.codFornecedor,
    merged.nomeFornecedor,
    merged.codLotacao,
    merged.descLotacao,
    merged.codSetor,
    merged.nomeSetor,
    merged.matricula,
    merged.nomeResponsavel,
    merged.saida,
  ].join(";");
}

describe("parseCsvSicam", () => {
  it("deve parsear CSV válido com sucesso", () => {
    const csv = `${VALID_HEADER}\n${makeRow()}\n${makeRow({ numero: "100002", descricao: "Notebook Lenovo" })}`;
    const result = parseCsvSicam(toBuffer(csv));

    expect(result.registros).toHaveLength(2);
    expect(result.erros).toHaveLength(0);
    expect(result.registros[0].numeroTombo).toBe("100001");
    expect(result.registros[0].descricaoMaterial).toBe("Monitor LED 24");
    expect(result.registros[1].numeroTombo).toBe("100002");
  });

  it("deve retornar erro para arquivo vazio", () => {
    const result = parseCsvSicam(toBuffer(""));

    expect(result.registros).toHaveLength(0);
    expect(result.erros).toHaveLength(1);
    expect(result.erros[0].mensagem).toContain("vazio");
  });

  it("deve retornar erro para cabeçalho inválido", () => {
    const csv = "Coluna1;Coluna2;Coluna3\nval1;val2;val3";
    const result = parseCsvSicam(toBuffer(csv));

    expect(result.registros).toHaveLength(0);
    expect(result.erros).toHaveLength(1);
    expect(result.erros[0].mensagem).toContain("Cabeçalho inválido");
  });

  it("deve retornar erro para campos obrigatórios faltando", () => {
    const csv = `${VALID_HEADER}\n;Descrição;F1;;NTI;Núcleo;;;;;;`;
    const result = parseCsvSicam(toBuffer(csv));

    expect(result.erros.length).toBeGreaterThan(0);
    expect(result.erros.some((e) => e.campo === "numeroTombo")).toBe(true);
  });

  it("deve parsear CSV com caracteres acentuados (Latin-1)", () => {
    const csv = `${VALID_HEADER}\n${makeRow({ descricao: "Cadeir\xe3o Ergon\xf4mico", descLotacao: "Secretaria da 1\xaa Vara" })}`;
    const result = parseCsvSicam(toBuffer(csv));

    expect(result.registros).toHaveLength(1);
    expect(result.registros[0].descricaoMaterial).toContain("Cadeirão");
  });

  it("deve lidar com campos entre aspas", () => {
    const csv = `${VALID_HEADER}\n100001;"Monitor LED 24; polegadas";F1001;Fornecedor A;NTI;Núcleo de TI;NTI-INFRA;Infra;AP20151;Carlos;`;
    const result = parseCsvSicam(toBuffer(csv));

    expect(result.registros).toHaveLength(1);
    expect(result.registros[0].descricaoMaterial).toBe(
      'Monitor LED 24; polegadas',
    );
  });

  it("deve parsear múltiplas linhas com mix de válidos e inválidos", () => {
    const csv = [
      VALID_HEADER,
      makeRow({ numero: "100001" }),
      makeRow({ numero: "", descricao: "Sem tombo" }), // invalid
      makeRow({ numero: "100003" }),
    ].join("\n");

    const result = parseCsvSicam(toBuffer(csv));

    expect(result.registros).toHaveLength(2);
    expect(result.erros).toHaveLength(1);
    expect(result.erros[0].linha).toBe(3);
  });

  it("deve lidar com linhas em branco no final", () => {
    const csv = `${VALID_HEADER}\n${makeRow()}\n\n\n`;
    const result = parseCsvSicam(toBuffer(csv));

    expect(result.registros).toHaveLength(1);
    expect(result.erros).toHaveLength(0);
  });

  it("deve tratar aspas literais no meio do campo (ex: polegadas 21,50\")", () => {
    const csv = `${VALID_HEADER}\n${makeRow({ descricao: 'MONITOR DE LED. 21,50". MARCA AOC. MODELO E2270PWHE' })}`;
    const result = parseCsvSicam(toBuffer(csv));

    expect(result.registros).toHaveLength(1);
    expect(result.registros[0].descricaoMaterial).toBe(
      'MONITOR DE LED. 21,50". MARCA AOC. MODELO E2270PWHE',
    );
    expect(result.registros[0].numeroTombo).toBe("100001");
    expect(result.registros[0].codigoLotacao).toBe("NTI");
  });

  it("deve mergear semicolons embutidos na descrição quando linha tem campos excedentes", () => {
    // Simula descrição do SICAM com specs técnicas separadas por ;
    const descricaoComSemicolons =
      "MICRO PENTIUM XEON 450 MHZ; 256MB RAM; CONT. SCSI FAST WIDE; TECLADO;CABO;DRIVER;FAXMOD";
    // A descrição tem 6 semicolons extras (7 partes ao invés de 1)
    const row = [
      "100001",
      descricaoComSemicolons, // será splitado em 7 campos pelo parser
      "F1001",
      "Fornecedor A",
      "NTI",
      "Núcleo de TI",
      "NTI-INFRA",
      "Infraestrutura",
      "AP20151",
      "Carlos Silva",
      "",
    ].join(";");
    const csv = `${VALID_HEADER}\n${row}`;
    const result = parseCsvSicam(toBuffer(csv));

    expect(result.registros).toHaveLength(1);
    expect(result.registros[0].descricaoMaterial).toBe(descricaoComSemicolons);
    expect(result.registros[0].numeroTombo).toBe("100001");
    expect(result.registros[0].codigoFornecedor).toBe("F1001");
    expect(result.registros[0].codigoLotacao).toBe("NTI");
    expect(result.registros[0].descricaoLotacao).toBe("Núcleo de TI");
    expect(result.registros[0].codigoSetor).toBe("NTI-INFRA");
    expect(result.registros[0].nomeSetor).toBe("Infraestrutura");
    expect(result.registros[0].matriculaResponsavel).toBe("AP20151");
  });

  it("deve tratar campo saída como opcional", () => {
    const csv = `${VALID_HEADER}\n${makeRow({ saida: "2026-01-15" })}`;
    const result = parseCsvSicam(toBuffer(csv));

    expect(result.registros).toHaveLength(1);
    expect(result.registros[0].saida).toBe("2026-01-15");
  });
});
