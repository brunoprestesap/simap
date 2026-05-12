import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  listarTodosTombosAtivos,
  buscarHistoricoTermosBatch,
  type SicamTombo,
  type SicamTermoHistorico,
} from "@/server/queries/sicam";

const syncLogger = logger.child({ module: "sicam-sync" });

// Tamanho da página da query Oracle. ~7-8k tombos típicos → ~14-16 páginas.
// Páginas maiores reduzem roundtrips ao Oracle mas aumentam pico de memória.
const SYNC_PAGE_SIZE = 500;

// Timeout maior que o default — sync pode legitimamente demorar mais do que
// queries online. Cada página Oracle deve completar em até 15s.
const SYNC_QUERY_TIMEOUT_MS = 15_000;

export interface SicamSyncResult {
  sincronizacaoId: string;
  totalProcessados: number;
  novos: number;
  atualizados: number;
  erros: number;
  duracaoMs: number;
  historicosSincronizados: number;
  errosFaseHistorico: number;
}

/**
 * Executa um ciclo completo de sincronização do SICAM Oracle para o cache
 * local Prisma. Itera todos os tombos ativos do SICAM e:
 *
 * - **Upsert Unidades** quando aparece código de lotação novo (descricao = código);
 * - **Upsert Setores** quando aparece código de setor novo dentro da unidade;
 * - **Vincula Usuario** quando a matrícula responsável existe no SIMAP (não cria);
 * - **Upsert Tombo** atualizando descrição, fornecedor, lotação, setor, responsável.
 *
 * Não toca em tombos que sumiram do SICAM (decisão explícita — admin remove
 * via CRUD se quiser). Falhas por tombo são isoladas (contam em `erros`) e
 * não abortam o ciclo. Falha global (ex: Oracle off) marca a sincronização
 * como ERRO e lança.
 */
export async function executarSincronizacaoSicam(
  iniciadoPorId: string,
): Promise<SicamSyncResult> {
  const inicio = Date.now();

  const sincronizacao = await prisma.sincronizacaoSicam.create({
    data: {
      iniciadoPorId,
      status: "EM_ANDAMENTO",
    },
  });

  syncLogger.info(
    { sincronizacaoId: sincronizacao.id, iniciadoPorId },
    "Sincronização SICAM iniciada",
  );

  let totalProcessados = 0;
  let novos = 0;
  let atualizados = 0;
  let erros = 0;
  let historicosSincronizados = 0;
  let errosFaseHistorico = 0;

  try {
    // Caches em memória — populados sob demanda conforme aparecem códigos
    // novos. Evitam roundtrip ao Postgres a cada tombo.
    const unidades = new Map<string, { id: string }>();
    for (const u of await prisma.unidade.findMany({
      select: { id: true, codigo: true },
    })) {
      unidades.set(u.codigo, { id: u.id });
    }

    const setores = new Map<string, { id: string }>();
    for (const s of await prisma.setor.findMany({
      select: { id: true, codigo: true, unidadeId: true },
    })) {
      setores.set(`${s.unidadeId}:${s.codigo}`, { id: s.id });
    }

    let pagina = 1;
    let totalPaginas = 1;

    do {
      const lote = await listarTodosTombosAtivos({
        pagina,
        porPagina: SYNC_PAGE_SIZE,
        timeoutMs: SYNC_QUERY_TIMEOUT_MS,
      });
      totalPaginas = lote.totalPaginas;

      // Pre-fetch tombos locais correspondentes ao lote para decidir
      // novo vs atualização em apenas 1 roundtrip ao Postgres por página.
      const numerosLote = lote.tombos.map((t) => t.numero);
      const existentesLote = await prisma.tombo.findMany({
        where: { numero: { in: numerosLote } },
        select: { id: true, numero: true },
      });
      const tombosLocaisPorNumero = new Map(
        existentesLote.map((t) => [t.numero, t.id]),
      );

      // Pre-fetch usuários por matrícula do lote — vinculamos
      // usuarioResponsavelId quando existe, senão só guardamos o snapshot.
      const matriculasLote = [
        ...new Set(
          lote.tombos
            .map((t) => t.matriculaResponsavel?.toUpperCase())
            .filter((m): m is string => Boolean(m)),
        ),
      ];
      const usuariosLote = await prisma.usuario.findMany({
        where: { matricula: { in: matriculasLote } },
        select: { id: true, matricula: true },
      });
      const usuariosPorMatricula = new Map(
        usuariosLote.map((u) => [u.matricula, u.id]),
      );

      for (const tombo of lote.tombos) {
        try {
          const { unidadeId, setorId } = await resolverLocalizacao(
            tombo,
            unidades,
            setores,
          );

          const usuarioResponsavelId = tombo.matriculaResponsavel
            ? (usuariosPorMatricula.get(
                tombo.matriculaResponsavel.toUpperCase(),
              ) ?? null)
            : null;

          const dadosTombo = {
            descricaoMaterial: tombo.descricaoMaterial,
            codigoFornecedor: tombo.codigoFornecedor,
            nomeFornecedor: tombo.nomeFornecedor,
            unidadeId,
            setorId,
            usuarioResponsavelId,
            matriculaResponsavel: tombo.matriculaResponsavel,
            ativo: true,
          };

          const idExistente = tombosLocaisPorNumero.get(tombo.numero);
          if (idExistente) {
            await prisma.tombo.update({
              where: { id: idExistente },
              data: dadosTombo,
            });
            atualizados++;
          } else {
            const criado = await prisma.tombo.create({
              data: { numero: tombo.numero, ...dadosTombo },
              select: { id: true },
            });
            // Registra o ID no mapa para que a fase 2 (histórico) inclua
            // tombos novos criados neste mesmo ciclo de sync.
            tombosLocaisPorNumero.set(tombo.numero, criado.id);
            novos++;
          }
          totalProcessados++;

          // Fase 1b: grava o TERMO atual como entrada de histórico.
          // Garante que todo tombo com TERMO no SICAM tenha ≥1 entrada visível
          // mesmo que nunca tenha sido transferido (sem HISTORICO_TOMBO 'E').
          if (tombo.nuTermo !== null && tombo.anTermo !== null && tombo.tiTermo !== null) {
            const localTomboId = tombosLocaisPorNumero.get(tombo.numero);
            if (localTomboId) {
              try {
                await prisma.historicoTermoSicam.upsert({
                  where: {
                    tomboId_nuTermo_anTermo_tiTermo: {
                      tomboId: localTomboId,
                      nuTermo: tombo.nuTermo,
                      anTermo: tombo.anTermo,
                      tiTermo: tombo.tiTermo,
                    },
                  },
                  create: {
                    tomboId: localTomboId,
                    nuTermo: tombo.nuTermo,
                    anTermo: tombo.anTermo,
                    tiTermo: tombo.tiTermo,
                    dtTermo: tombo.dataTermo,
                    codLotacao: tombo.codLotacao,
                    codSetor: tombo.codSetor,
                    nomeSetor: tombo.nomeSetor,
                    matriculaResp: tombo.matriculaResponsavel,
                  },
                  update: {
                    dtTermo: tombo.dataTermo,
                    codLotacao: tombo.codLotacao,
                    codSetor: tombo.codSetor,
                    nomeSetor: tombo.nomeSetor,
                    matriculaResp: tombo.matriculaResponsavel,
                  },
                });
                historicosSincronizados++;
              } catch (errCurrentTermo) {
                syncLogger.error(
                  { err: errCurrentTermo, numero: tombo.numero },
                  "Falha ao upsert TERMO atual no histórico",
                );
              }
            }
          }
        } catch (errTombo) {
          erros++;
          syncLogger.error(
            { err: errTombo, numero: tombo.numero },
            "Falha ao sincronizar tombo individual",
          );
        }
      }

      // Fase 2 do lote: sincronizar histórico de termos dos tombos cujo upsert
      // local foi bem-sucedido. Tombos com erro na fase 1 são omitidos — não
      // têm ID local confiável ainda.
      const numerosComLocal = lote.tombos
        .map((t) => t.numero)
        .filter((n) => tombosLocaisPorNumero.has(n));

      if (numerosComLocal.length > 0) {
        try {
          const termosBatch = await buscarHistoricoTermosBatch(numerosComLocal, {
            timeoutMs: SYNC_QUERY_TIMEOUT_MS,
          });

          for (const [nuTombo, termos] of termosBatch) {
            const tomboId = tombosLocaisPorNumero.get(nuTombo);
            if (!tomboId) continue;

            for (const termo of termos as SicamTermoHistorico[]) {
              try {
                await prisma.historicoTermoSicam.upsert({
                  where: {
                    tomboId_nuTermo_anTermo_tiTermo: {
                      tomboId,
                      nuTermo: termo.nuTermo,
                      anTermo: termo.anTermo,
                      tiTermo: termo.tiTermo,
                    },
                  },
                  create: {
                    tomboId,
                    nuTermo: termo.nuTermo,
                    anTermo: termo.anTermo,
                    tiTermo: termo.tiTermo,
                    dtTermo: termo.dtTermo,
                    codLotacao: termo.codLotacao,
                    codSetor: termo.codSetor,
                    nomeSetor: termo.nomeSetor,
                    matriculaResp: termo.matriculaResp,
                  },
                  update: {
                    dtTermo: termo.dtTermo,
                    codLotacao: termo.codLotacao,
                    codSetor: termo.codSetor,
                    nomeSetor: termo.nomeSetor,
                    matriculaResp: termo.matriculaResp,
                  },
                });
                historicosSincronizados++;
              } catch (errTermo) {
                errosFaseHistorico++;
                syncLogger.error(
                  { err: errTermo, nuTombo, nuTermo: termo.nuTermo },
                  "Falha ao sincronizar termo histórico individual",
                );
              }
            }
          }
        } catch (errTermosBatch) {
          // Falha na fase 2 (ex: tabela inexistente, coluna com nome errado)
          // é logada mas não aborta o ciclo — tombos já foram sincronizados.
          errosFaseHistorico += numerosComLocal.length;
          syncLogger.error(
            { err: errTermosBatch, pagina },
            "Falha ao buscar lote de histórico Oracle — histórico não sincronizado para esta página",
          );
        }
      }

      // Atualiza progresso parcial — admin pode acompanhar em outra aba.
      await prisma.sincronizacaoSicam.update({
        where: { id: sincronizacao.id },
        data: { totalProcessados, novos, atualizados, erros },
      });

      syncLogger.info(
        {
          sincronizacaoId: sincronizacao.id,
          pagina,
          totalPaginas,
          totalProcessados,
        },
        "Página de sincronização processada",
      );

      pagina++;
    } while (pagina <= totalPaginas);

    const duracaoMs = Date.now() - inicio;

    await prisma.sincronizacaoSicam.update({
      where: { id: sincronizacao.id },
      data: {
        status: "CONCLUIDA",
        finalizadoEm: new Date(),
        totalProcessados,
        novos,
        atualizados,
        erros,
      },
    });

    syncLogger.info(
      {
        sincronizacaoId: sincronizacao.id,
        totalProcessados,
        novos,
        atualizados,
        erros,
        historicosSincronizados,
        errosFaseHistorico,
        duracaoMs,
      },
      "Sincronização SICAM concluída",
    );

    return {
      sincronizacaoId: sincronizacao.id,
      totalProcessados,
      novos,
      atualizados,
      erros,
      duracaoMs,
      historicosSincronizados,
      errosFaseHistorico,
    };
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : "Erro desconhecido";
    syncLogger.error(
      { err, sincronizacaoId: sincronizacao.id },
      "Sincronização SICAM abortada",
    );

    await prisma.sincronizacaoSicam.update({
      where: { id: sincronizacao.id },
      data: {
        status: "ERRO",
        finalizadoEm: new Date(),
        mensagemErro: mensagem.slice(0, 2000),
        totalProcessados,
        novos,
        atualizados,
        erros,
      },
    });

    throw err;
  }
}

async function resolverLocalizacao(
  tombo: SicamTombo,
  unidades: Map<string, { id: string }>,
  setores: Map<string, { id: string }>,
): Promise<{ unidadeId: string | null; setorId: string | null }> {
  if (tombo.codLotacao === null) {
    return { unidadeId: null, setorId: null };
  }

  const codigoUnidade = String(tombo.codLotacao);
  let unidade = unidades.get(codigoUnidade);
  if (!unidade) {
    const criada = await prisma.unidade.create({
      data: { codigo: codigoUnidade, descricao: codigoUnidade },
      select: { id: true },
    });
    syncLogger.warn(
      { codigoUnidade },
      "Unidade criada sem descrição longa — edite em /admin/unidades",
    );
    unidade = criada;
    unidades.set(codigoUnidade, criada);
  }

  if (tombo.codSetor === null) {
    return { unidadeId: unidade.id, setorId: null };
  }

  const codigoSetor = String(tombo.codSetor);
  const chaveSetor = `${unidade.id}:${codigoSetor}`;
  let setor = setores.get(chaveSetor);
  if (!setor) {
    const criado = await prisma.setor.create({
      data: {
        codigo: codigoSetor,
        nome: tombo.nomeSetor ?? codigoSetor,
        unidadeId: unidade.id,
      },
      select: { id: true },
    });
    setor = criado;
    setores.set(chaveSetor, criado);
  }

  return { unidadeId: unidade.id, setorId: setor.id };
}
