import { z } from "zod/v4";

const CsvRowSchema = z.object({
  tipoTombo: z.string().optional(),
  numeroTombo: z.string().min(1, "Número do tombo é obrigatório"),
  descricaoMaterial: z.string().min(1, "Descrição do material é obrigatória"),
  codigoFornecedor: z.string().optional(),
  nomeFornecedor: z.string().optional(),
  codigoLotacao: z.string().optional(),
  descricaoLotacao: z.string().optional(),
  codigoSetor: z.string().optional(),
  nomeSetor: z.string().optional(),
  matriculaResponsavel: z.string().optional(),
  nomeResponsavel: z.string().optional(),
  saida: z.string().optional(),
});

export type CsvRow = z.infer<typeof CsvRowSchema>;

export interface CsvParseError {
  linha: number;
  campo?: string;
  mensagem: string;
}

export interface CsvParseResult {
  registros: CsvRow[];
  erros: CsvParseError[];
}

/**
 * Normaliza string para comparação: remove acentos, lowercase, trim.
 */
function normalizeHeader(s: string): string {
  return s
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Mapeamento flexível: chave normalizada → campo do schema.
 * Inclui variações comuns que o SICAM pode exportar.
 */
const HEADER_TO_FIELD: Record<string, keyof CsvRow> = {};

const HEADER_ALIASES: [string[], keyof CsvRow][] = [
  [["tipo tombo", "tipo", "tipo_tombo"], "tipoTombo"],
  [["numero tombo", "numero do tombo", "n tombo", "nr tombo", "num tombo", "numero_tombo"], "numeroTombo"],
  [["descricao material", "descricao do material", "descricao", "material", "desc material", "descricao_material"], "descricaoMaterial"],
  [["codigo fornecedor", "cod fornecedor", "fornecedor codigo", "codigo_fornecedor"], "codigoFornecedor"],
  [["nome fornecedor", "fornecedor", "fornecedor nome", "nome_fornecedor"], "nomeFornecedor"],
  [["codigo lotacao", "cod lotacao", "lotacao codigo", "lotacao", "codigo_lotacao"], "codigoLotacao"],
  [["descricao lotacao", "desc lotacao", "lotacao descricao", "nome lotacao", "descricao_lotacao"], "descricaoLotacao"],
  [["codigo setor", "cod setor", "setor codigo", "setor", "codigo_setor"], "codigoSetor"],
  [["nome setor", "setor nome", "descricao setor", "nome_setor"], "nomeSetor"],
  [["matricula responsavel", "matricula responsavel termo", "matricula", "responsavel matricula", "mat responsavel", "matricula_responsavel", "matricula atribuido"], "matriculaResponsavel"],
  [["nome responsavel", "nome responsavel termo", "responsavel", "responsavel nome", "nome_responsavel", "nome atribuido"], "nomeResponsavel"],
  [["saida", "data saida", "dt saida", "data_saida"], "saida"],
];

// Build lookup map from all aliases
for (const [aliases, field] of HEADER_ALIASES) {
  for (const alias of aliases) {
    HEADER_TO_FIELD[alias] = field;
  }
}

function matchHeader(rawHeader: string): keyof CsvRow | null {
  const normalized = normalizeHeader(rawHeader);
  return HEADER_TO_FIELD[normalized] ?? null;
}

/**
 * Decodifica buffer de CSV Latin-1 (ISO-8859-1) para string UTF-8
 */
/**
 * Detecta encoding e decodifica o buffer.
 * Suporta UTF-8 (com ou sem BOM) e Latin-1 (ISO-8859-1).
 */
function decodeBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);

  // Detecta BOM UTF-8 (EF BB BF)
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(buffer);
  }

  // Tenta UTF-8 primeiro
  try {
    const utf8 = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    return utf8;
  } catch {
    // Fallback para Latin-1
    return new TextDecoder("iso-8859-1").decode(buffer);
  }
}

/**
 * Divide uma linha CSV respeitando campos entre aspas
 */
function splitCsvLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  let fieldStart = true;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (fieldStart && !inQuotes) {
        // Aspas no início do campo: inicia campo entre aspas
        inQuotes = true;
        fieldStart = false;
      } else if (inQuotes && line[i + 1] === '"') {
        // Aspas duplas dentro de campo entre aspas: aspas escapadas
        current += '"';
        i++;
      } else if (inQuotes) {
        // Aspas de fechamento do campo entre aspas
        inQuotes = false;
      } else {
        // Aspas no meio de campo não-aspas: trata como caractere literal
        // (ex: 21,50" para polegadas)
        current += char;
        fieldStart = false;
      }
    } else if (char === delimiter && !inQuotes) {
      fields.push(current);
      current = "";
      fieldStart = true;
    } else {
      current += char;
      fieldStart = false;
    }
  }

  fields.push(current);
  return fields;
}

/**
 * Parseia o conteúdo CSV do SICAM.
 * Encoding: Latin-1 (ISO-8859-1)
 * Delimitador: ponto e vírgula (;)
 */
export function parseCsvSicam(buffer: ArrayBuffer): CsvParseResult {
  const content = decodeBuffer(buffer);
  const lines = content.split(/\r?\n/).filter((line) => line.trim() !== "");

  if (lines.length === 0) {
    return {
      registros: [],
      erros: [{ linha: 0, mensagem: "Arquivo vazio." }],
    };
  }

  // Parse header
  const headerLine = lines[0];
  const headers = splitCsvLine(headerLine, ";");

  // Map headers to fields using flexible matching
  const headerMapping: (keyof CsvRow | null)[] = headers.map((h) =>
    matchHeader(h),
  );

  const matched = headerMapping.filter(Boolean) as (keyof CsvRow)[];
  const requiredFields: (keyof CsvRow)[] = [
    "numeroTombo",
    "descricaoMaterial",
  ];
  const missingFields = requiredFields.filter((f) => !matched.includes(f));

  if (missingFields.length > 0) {
    const foundHeaders = headers.map((h) => h.trim()).join(", ");
    return {
      registros: [],
      erros: [
        {
          linha: 1,
          mensagem: `Cabeçalho inválido. Campos não reconhecidos. Colunas encontradas: [${foundHeaders}]. Campos obrigatórios faltando: ${missingFields.join(", ")}.`,
        },
      ],
    };
  }

  const registros: CsvRow[] = [];
  const erros: CsvParseError[] = [];

  // Detecta posições de campos de texto livre e suas âncoras no header.
  // O CSV do SICAM pode ter semicolons dentro de 3 campos de texto livre:
  //   - Descrição Material (âncora: próximo campo "Livro Material" = ".")
  //   - Observação Termo (âncora: próximo campo "Código Lotação" = numérico)
  //   - Observação Tombo (último campo de texto livre, absorve excesso restante)
  const normalHeaders = headers.map((h) => normalizeHeader(h));
  const descIdx = normalHeaders.findIndex((h) => h === "descricao material");
  const livroIdx = normalHeaders.findIndex((h) => h === "livro material");
  const obsTermoIdx = normalHeaders.findIndex((h) => h === "observacao termo");
  const codLotacaoIdx = normalHeaders.findIndex((h) => h === "codigo lotacao");
  const obsTomboIdx = normalHeaders.findIndex((h) => h === "observacao tombo");

  for (let i = 1; i < lines.length; i++) {
    const fields = splitCsvLine(lines[i], ";");
    const lineNumber = i + 1;

    // Mergeia semicolons embutidos em campos de texto livre do SICAM.
    // Usa campos-âncora adjacentes para detectar onde estão os extras.
    if (fields.length > headers.length) {
      const hasAnchors = livroIdx !== -1;

      if (hasAnchors) {
        // 1. Descrição Material: âncora é "Livro Material" (sempre "." no SICAM)
        if (descIdx !== -1) {
          while (fields.length > headers.length && fields[descIdx + 1]?.trim() !== ".") {
            fields[descIdx] = fields[descIdx] + ";" + fields[descIdx + 1];
            fields.splice(descIdx + 1, 1);
          }
        }

        // 2. Observação Termo: âncora é "Código Lotação" (numérico, 1-6 dígitos)
        if (obsTermoIdx !== -1 && codLotacaoIdx !== -1) {
          while (fields.length > headers.length && !/^\d{1,6}$/.test(fields[obsTermoIdx + 1]?.trim())) {
            fields[obsTermoIdx] = fields[obsTermoIdx] + ";" + fields[obsTermoIdx + 1];
            fields.splice(obsTermoIdx + 1, 1);
          }
        }

        // 3. Observação Tombo: absorve qualquer excesso restante
        if (obsTomboIdx !== -1) {
          while (fields.length > headers.length) {
            fields[obsTomboIdx] = fields[obsTomboIdx] + ";" + fields[obsTomboIdx + 1];
            fields.splice(obsTomboIdx + 1, 1);
          }
        }
      } else if (descIdx !== -1) {
        // Fallback: sem âncoras, mergeia todo excesso na descrição
        const excess = fields.length - headers.length;
        const merged = fields.slice(descIdx, descIdx + excess + 1).join(";");
        fields.splice(descIdx, excess + 1, merged);
      }
    }

    const rawRow: Record<string, string> = {};
    for (let j = 0; j < headerMapping.length; j++) {
      const fieldName = headerMapping[j];
      if (fieldName) {
        const value = fields[j]?.trim() ?? "";
        // Não sobrescrever um valor preenchido com string vazia
        // (ex: Matrícula Atribuído vazia não deve apagar Matrícula Responsável Termo)
        if (!value && rawRow[fieldName]) continue;
        rawRow[fieldName] = value;
      }
    }

    const result = CsvRowSchema.safeParse(rawRow);

    if (result.success) {
      // Filtrar registros com Tipo Tombo = "L" (liquidados/baixados)
      const tipo = result.data.tipoTombo?.trim().toUpperCase();
      if (tipo === "L") {
        continue;
      }
      // Filtrar registros com Saída = "SAIU" (tombos que já saíram)
      const saida = result.data.saida?.trim().toUpperCase();
      if (saida === "SAIU") {
        continue;
      }
      registros.push(result.data);
    } else {
      for (const issue of result.error.issues) {
        erros.push({
          linha: lineNumber,
          campo: issue.path.join("."),
          mensagem: issue.message,
        });
      }
    }
  }

  return { registros, erros };
}
