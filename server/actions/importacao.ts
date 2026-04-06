"use server";

import { requireRoleAction } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { parseCsvSicam } from "@/server/services/csv-parser";
import { registrarAuditoria } from "@/server/services/audit";
import type { CsvRow, CsvParseError } from "@/server/services/csv-parser";

export interface ImportacaoPreview {
  totalRegistros: number;
  registros: CsvRow[];
  erros: CsvParseError[];
}

export interface ImportacaoResult {
  success: boolean;
  error?: string;
  data?: {
    total: number;
    novos: number;
    atualizados: number;
    erros: number;
    errosDetalhe: CsvParseError[];
  };
}

// ─── Preview (parse only, no DB) ──────────────────────────

export async function previewImportacaoCsv(
  formData: FormData,
): Promise<{ success: boolean; error?: string; data?: ImportacaoPreview }> {
  const { user, error: authError } = await requireRoleAction(["GESTOR_ADMIN"]);
  if (authError) return { success: false, error: authError };

  const file = formData.get("arquivo") as File | null;
  if (!file || !file.name.toLowerCase().endsWith(".csv")) {
    return { success: false, error: "Selecione um arquivo CSV válido." };
  }

  const buffer = await file.arrayBuffer();
  const { registros, erros } = parseCsvSicam(buffer);

  return {
    success: true,
    data: { totalRegistros: registros.length + erros.length, registros, erros },
  };
}

// ─── Helpers de resolução de entidades ────────────────────

async function resolverUnidades(registros: CsvRow[]) {
  const codigosUnicos = [
    ...new Set(registros.map((r) => r.codigoLotacao).filter(Boolean)),
  ] as string[];

  const existentes = await prisma.unidade.findMany({
    where: { codigo: { in: codigosUnicos } },
    select: { id: true, codigo: true },
  });

  const mapa = new Map(existentes.map((u) => [u.codigo, u.id]));

  const novos = codigosUnicos.filter((c) => !mapa.has(c));
  if (novos.length > 0) {
    await prisma.unidade.createMany({
      data: novos.map((codigo) => {
        const row = registros.find((r) => r.codigoLotacao === codigo)!;
        return { codigo, descricao: row.descricaoLotacao ?? codigo };
      }),
      skipDuplicates: true,
    });

    const criadas = await prisma.unidade.findMany({
      where: { codigo: { in: novos } },
      select: { id: true, codigo: true },
    });
    for (const u of criadas) mapa.set(u.codigo, u.id);
  }

  return mapa;
}

async function resolverSetores(
  registros: CsvRow[],
  mapaUnidades: Map<string, string>,
) {
  const pares = registros
    .filter((r) => r.codigoSetor && r.codigoLotacao)
    .map((r) => ({
      codigo: r.codigoSetor!,
      unidadeId: mapaUnidades.get(r.codigoLotacao!)!,
      nome: r.nomeSetor ?? r.codigoSetor!,
    }))
    .filter((p) => p.unidadeId);

  const chavesUnicas = [...new Set(pares.map((p) => `${p.codigo}|${p.unidadeId}`))];

  const existentes = await prisma.setor.findMany({
    where: {
      OR: chavesUnicas.map((ch) => {
        const [codigo, unidadeId] = ch.split("|");
        return { codigo, unidadeId };
      }),
    },
    select: { id: true, codigo: true, unidadeId: true },
  });

  const mapa = new Map(
    existentes.map((s) => [`${s.codigo}|${s.unidadeId}`, s.id]),
  );

  const novos = pares.filter(
    (p) => !mapa.has(`${p.codigo}|${p.unidadeId}`),
  );
  const novosUnicos = [
    ...new Map(novos.map((n) => [`${n.codigo}|${n.unidadeId}`, n])).values(),
  ];

  if (novosUnicos.length > 0) {
    await prisma.setor.createMany({
      data: novosUnicos.map((s) => ({
        codigo: s.codigo,
        nome: s.nome,
        unidadeId: s.unidadeId,
      })),
      skipDuplicates: true,
    });

    const criados = await prisma.setor.findMany({
      where: {
        OR: novosUnicos.map((s) => ({
          codigo: s.codigo,
          unidadeId: s.unidadeId,
        })),
      },
      select: { id: true, codigo: true, unidadeId: true },
    });
    for (const s of criados) mapa.set(`${s.codigo}|${s.unidadeId}`, s.id);
  }

  return mapa;
}

async function resolverServidores(
  registros: CsvRow[],
  mapaUnidades: Map<string, string>,
) {
  const matriculasUnicas = [
    ...new Set(registros.map((r) => r.matriculaResponsavel).filter(Boolean)),
  ] as string[];

  const existentes = await prisma.servidor.findMany({
    where: { matricula: { in: matriculasUnicas } },
    select: { id: true, matricula: true },
  });

  const mapa = new Map(existentes.map((s) => [s.matricula, s.id]));

  const novos = matriculasUnicas.filter((m) => !mapa.has(m));
  if (novos.length > 0) {
    // Servidores só podem ser criados com unidade (campo obrigatório)
    const novosComUnidade = novos.filter((matricula) => {
      const row = registros.find((r) => r.matriculaResponsavel === matricula)!;
      return row.codigoLotacao && mapaUnidades.has(row.codigoLotacao);
    });

    if (novosComUnidade.length > 0) {
      await prisma.servidor.createMany({
        data: novosComUnidade.map((matricula) => {
          const row = registros.find(
            (r) => r.matriculaResponsavel === matricula,
          )!;
          return {
            matricula,
            nome: row.nomeResponsavel ?? matricula,
            unidadeId: mapaUnidades.get(row.codigoLotacao!)!,
          };
        }),
        skipDuplicates: true,
      });
    }

    const criados = await prisma.servidor.findMany({
      where: { matricula: { in: novos } },
      select: { id: true, matricula: true },
    });
    for (const s of criados) mapa.set(s.matricula, s.id);
  }

  return mapa;
}

// ─── Confirmação (processamento em batch) ─────────────────

const BATCH_SIZE = 500;

export async function confirmarImportacaoCsv(
  formData: FormData,
): Promise<ImportacaoResult> {
  const { user, error: authError } = await requireRoleAction(["GESTOR_ADMIN"]);
  if (authError) return { success: false, error: authError };

  const file = formData.get("arquivo") as File | null;
  if (!file) {
    return { success: false, error: "Nenhum arquivo selecionado." };
  }

  const buffer = await file.arrayBuffer();
  const { registros, erros } = parseCsvSicam(buffer);

  const errosDetalhe: CsvParseError[] = [...erros];

  // Fase 1: Resolver entidades relacionadas em batch
  const mapaUnidades = await resolverUnidades(registros);
  const mapaSetores = await resolverSetores(registros, mapaUnidades);
  const mapaServidores = await resolverServidores(registros, mapaUnidades);

  // Fase 2: Identificar tombos existentes para separar creates de updates
  const todosNumeros = registros.map((r) => r.numeroTombo);
  const tombosExistentes = await prisma.tombo.findMany({
    where: { numero: { in: todosNumeros } },
    select: { id: true, numero: true },
  });
  const numerosExistentes = new Set(tombosExistentes.map((t) => t.numero));

  // Fase 3: Processar em batches
  let novos = 0;
  let atualizados = 0;
  let errosProcessamento = 0;

  for (let offset = 0; offset < registros.length; offset += BATCH_SIZE) {
    const batch = registros.slice(offset, offset + BATCH_SIZE);

    const paraAtualizar = batch.filter((r) => numerosExistentes.has(r.numeroTombo));
    const paraCriar = batch.filter((r) => !numerosExistentes.has(r.numeroTombo));

    // Updates em paralelo (limitado pelo batch)
    const updatePromises = paraAtualizar.map((row) => {
      const unidadeId = row.codigoLotacao
        ? mapaUnidades.get(row.codigoLotacao)
        : undefined;
      const setorId =
        row.codigoSetor && row.codigoLotacao
          ? mapaSetores.get(
              `${row.codigoSetor}|${mapaUnidades.get(row.codigoLotacao)}`,
            )
          : undefined;
      const servidorId = row.matriculaResponsavel
        ? mapaServidores.get(row.matriculaResponsavel)
        : undefined;

      return prisma.tombo
        .update({
          where: { numero: row.numeroTombo },
          data: {
            descricaoMaterial: row.descricaoMaterial,
            codigoFornecedor: row.codigoFornecedor ?? null,
            nomeFornecedor: row.nomeFornecedor ?? null,
            ...(unidadeId ? { unidadeId } : {}),
            ...(setorId ? { setorId } : {}),
            ...(servidorId ? { servidorResponsavelId: servidorId } : {}),
            saida: row.saida ?? null,
          },
        })
        .then(() => {
          atualizados++;
        })
        .catch((error: Error) => {
          errosProcessamento++;
          errosDetalhe.push({
            linha: registros.indexOf(row) + 2,
            mensagem: `Erro ao atualizar tombo ${row.numeroTombo}: ${error.message}`,
          });
        });
    });

    await Promise.all(updatePromises);

    // Creates em batch via createMany
    const dadosParaCriar = paraCriar
      .map((row, i) => {
        const unidadeId = row.codigoLotacao
          ? mapaUnidades.get(row.codigoLotacao)
          : undefined;
        const setorId =
          row.codigoSetor && row.codigoLotacao
            ? mapaSetores.get(
                `${row.codigoSetor}|${mapaUnidades.get(row.codigoLotacao)}`,
              )
            : undefined;
        const servidorId = row.matriculaResponsavel
          ? mapaServidores.get(row.matriculaResponsavel)
          : undefined;

        return {
          numero: row.numeroTombo,
          descricaoMaterial: row.descricaoMaterial,
          codigoFornecedor: row.codigoFornecedor ?? null,
          nomeFornecedor: row.nomeFornecedor ?? null,
          unidadeId: unidadeId ?? null,
          setorId: setorId ?? null,
          servidorResponsavelId: servidorId ?? null,
          saida: row.saida ?? null,
        };
      });

    if (dadosParaCriar.length > 0) {
      try {
        const result = await prisma.tombo.createMany({
          data: dadosParaCriar,
          skipDuplicates: true,
        });
        novos += result.count;
      } catch (error) {
        errosProcessamento += dadosParaCriar.length;
        errosDetalhe.push({
          linha: offset + 2,
          mensagem: `Erro ao criar batch: ${error instanceof Error ? error.message : "erro desconhecido"}`,
        });
      }
    }
  }

  // Fase 4: Registro de importação + notificações
  const importacao = await prisma.importacaoCSV.create({
    data: {
      nomeArquivo: file.name,
      totalRegistros: registros.length,
      novos,
      atualizados,
      erros: erros.length + errosProcessamento,
      importadoPorId: user!.id,
    },
  });

  const semapUsers = await prisma.usuario.findMany({
    where: { perfil: "SERVIDOR_SEMAP", ativo: true },
    select: { id: true },
  });

  if (semapUsers.length > 0) {
    await prisma.notificacao.createMany({
      data: semapUsers.map((u) => ({
        tipo: "IMPORTACAO_CSV" as const,
        titulo: "Importação CSV concluída",
        mensagem: `${registros.length} registros importados de ${file.name}. ${novos} novos, ${atualizados} atualizados.`,
        link: "/importacao",
        usuarioDestinoId: u.id,
      })),
    });
  }

  await registrarAuditoria(
    "IMPORTACAO_CSV",
    "ImportacaoCSV",
    importacao.id,
    user!.id,
    { nomeArquivo: file.name, total: registros.length, novos, atualizados, erros: erros.length + errosProcessamento },
  );

  return {
    success: true,
    data: {
      total: registros.length,
      novos,
      atualizados,
      erros: erros.length + errosProcessamento,
      errosDetalhe,
    },
  };
}
