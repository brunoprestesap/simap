import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  listarTodosTombosAtivos,
  buscarHistoricoTermosBatch,
  buscarNumerosAlteradosSicam,
  buscarTombosSicamPorNumeros,
  type SicamTombo,
  type SicamTermoHistorico,
} from "@/server/queries/sicam";
import { criarNotificacoes } from "@/server/services/notificacao";
import { buscarEmailsPorMatriculas } from "@/server/services/ldap";
import { enviarEmail } from "@/server/services/email";

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

export interface SyncOptions {
  /** ID do usuário que disparou o sync. Undefined = sistema automático (cron). */
  iniciadoPorId?: string;
  /** true quando disparado pelo cron (exibido como "Automática" no painel admin). */
  automatica?: boolean;
  /**
   * 'COMPLETA' processa todos os tombos ativos do Oracle.
   * 'DIFERENCIAL' processa apenas tombos com HISTORICO_TOMBO.DT_CRIACAO >= `desde`.
   * Padrão: 'COMPLETA'.
   */
  modo?: "COMPLETA" | "DIFERENCIAL";
  /** Data base para o sync diferencial. Obrigatório quando modo='DIFERENCIAL'. */
  desde?: Date;
}

interface BatchResult {
  novos: number;
  atualizados: number;
  erros: number;
  historicosSincronizados: number;
  errosFaseHistorico: number;
  tombosLocaisPorNumero: Map<string, string>;
}

/**
 * Processa um lote de tombos vindos do Oracle:
 * 1. Upsert de Unidade, Setor, Tombo (Fase 1)
 * 2. Upsert do TERMO atual como histórico (Fase 1b)
 * 3. Upsert de histórico de transferências do Oracle (Fase 2)
 *
 * Falhas por tombo são isoladas e contam em `erros` sem abortar o lote.
 */
async function _processarBatch(
  tombos: SicamTombo[],
  unidades: Map<string, { id: string }>,
  setores: Map<string, { id: string }>,
): Promise<BatchResult> {
  let novos = 0;
  let atualizados = 0;
  let erros = 0;
  let historicosSincronizados = 0;
  let errosFaseHistorico = 0;

  const numeros = tombos.map((t) => t.numero);

  const existentes = await prisma.tombo.findMany({
    where: { numero: { in: numeros } },
    select: { id: true, numero: true },
  });
  const tombosLocaisPorNumero = new Map(existentes.map((t) => [t.numero, t.id]));

  const matriculas = [
    ...new Set(
      tombos
        .map((t) => t.matriculaResponsavel?.toUpperCase())
        .filter((m): m is string => Boolean(m)),
    ),
  ];
  const usuariosLote = await prisma.usuario.findMany({
    where: { matricula: { in: matriculas } },
    select: { id: true, matricula: true },
  });
  const usuariosPorMatricula = new Map(usuariosLote.map((u) => [u.matricula, u.id]));

  // Fase 1 + Fase 1b
  for (const tombo of tombos) {
    try {
      const { unidadeId, setorId } = await resolverLocalizacao(tombo, unidades, setores);

      const usuarioResponsavelId = tombo.matriculaResponsavel
        ? (usuariosPorMatricula.get(tombo.matriculaResponsavel.toUpperCase()) ?? null)
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
        await prisma.tombo.update({ where: { id: idExistente }, data: dadosTombo });
        atualizados++;
      } else {
        const criado = await prisma.tombo.create({
          data: { numero: tombo.numero, ...dadosTombo },
          select: { id: true },
        });
        tombosLocaisPorNumero.set(tombo.numero, criado.id);
        novos++;
      }

      // Fase 1b: TERMO atual como entrada de histórico.
      if (tombo.nuTermo !== null && tombo.anTermo !== null && tombo.tiTermo !== null) {
        const localId = tombosLocaisPorNumero.get(tombo.numero);
        if (localId) {
          try {
            await prisma.historicoTermoSicam.upsert({
              where: {
                tomboId_nuTermo_anTermo_tiTermo: {
                  tomboId: localId,
                  nuTermo: tombo.nuTermo,
                  anTermo: tombo.anTermo,
                  tiTermo: tombo.tiTermo,
                },
              },
              create: {
                tomboId: localId,
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

  // Fase 2: histórico de transferências para tombos com upsert bem-sucedido.
  const numerosComLocal = numeros.filter((n) => tombosLocaisPorNumero.has(n));
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
      errosFaseHistorico += numerosComLocal.length;
      syncLogger.error(
        { err: errTermosBatch },
        "Falha ao buscar lote de histórico Oracle — histórico não sincronizado para este lote",
      );
    }
  }

  return {
    novos,
    atualizados,
    erros,
    historicosSincronizados,
    errosFaseHistorico,
    tombosLocaisPorNumero,
  };
}

/**
 * Notifica todos os GESTOR_ADMIN ativos sobre uma falha no sync automático.
 * Fire-and-forget — nunca bloqueia nem relança.
 */
async function notificarFalhaSincronizacao(
  sincronizacaoId: string,
  mensagemErro: string,
): Promise<void> {
  const admins = await prisma.usuario.findMany({
    where: { perfil: "GESTOR_ADMIN", ativo: true },
    select: { id: true, matricula: true },
  });

  if (admins.length === 0) return;

  const ids = admins.map((a) => a.id);
  const matriculas = admins.map((a) => a.matricula);

  await criarNotificacoes({
    tipo: "SINCRONIZACAO_SICAM",
    titulo: "Falha na sincronização automática SICAM",
    mensagem: `O sync automático falhou: ${mensagemErro.slice(0, 200)}`,
    link: "/admin/sicam",
    usuarioDestinoIds: ids,
  });

  buscarEmailsPorMatriculas(matriculas)
    .then((emailMap) => {
      for (const matricula of matriculas) {
        const email = emailMap.get(matricula);
        if (email) {
          enviarEmail(
            email,
            "[SIMAP] Falha na sincronização automática SICAM",
            `<p>O sync automático SICAM falhou em <strong>${new Date().toLocaleString("pt-BR")}</strong>.</p>
             <p><strong>Erro:</strong> ${mensagemErro.slice(0, 500)}</p>
             <p>Acesse o <a href="/admin/sicam">painel SICAM</a> para detalhes e para disparar um sync manual.</p>`,
          );
        }
      }
    })
    .catch((err) => {
      syncLogger.error({ err, sincronizacaoId }, "Falha ao buscar e-mails para alerta de sync");
    });
}

/**
 * Executa um ciclo de sincronização do SICAM Oracle para o cache local Prisma.
 *
 * Suporta dois modos:
 * - **COMPLETA** (padrão): itera todos os tombos ativos do Oracle em páginas.
 * - **DIFERENCIAL**: busca apenas tombos com HISTORICO_TOMBO.DT_CRIACAO >= `desde`,
 *   reduzindo carga Oracle e duração em sincronizações diárias.
 *
 * Em ambos os modos:
 * - Upsert de Unidades e Setores quando aparecem códigos novos.
 * - Vincula Usuario por matrícula quando existe no SIMAP (não cria).
 * - Upsert de Tombo com descrição, fornecedor, lotação, setor, responsável.
 * - Upsert de HistoricoTermoSicam (Fase 1b + Fase 2).
 *
 * Falhas por tombo são isoladas. Falha global marca o registro como ERRO
 * e dispara notificação/e-mail aos GESTOR_ADMIN (apenas sync automático).
 */
export async function executarSincronizacaoSicam(
  options: SyncOptions = {},
): Promise<SicamSyncResult> {
  const { iniciadoPorId, automatica = false, modo = "COMPLETA", desde } = options;
  const inicio = Date.now();

  const emAndamento = await prisma.sincronizacaoSicam.findFirst({
    where: { status: "EM_ANDAMENTO" },
    select: { id: true },
  });
  if (emAndamento) {
    throw new Error(
      `Já existe uma sincronização em andamento (id: ${emAndamento.id}). Aguarde ela concluir antes de iniciar outra.`,
    );
  }

  const sincronizacao = await prisma.sincronizacaoSicam.create({
    data: {
      iniciadoPorId: iniciadoPorId ?? null,
      automatica,
      status: "EM_ANDAMENTO",
    },
  });

  syncLogger.info(
    { sincronizacaoId: sincronizacao.id, iniciadoPorId, automatica, modo },
    "Sincronização SICAM iniciada",
  );

  let totalProcessados = 0;
  let novos = 0;
  let atualizados = 0;
  let erros = 0;
  let historicosSincronizados = 0;
  let errosFaseHistorico = 0;

  try {
    const unidades = new Map<string, { id: string }>();
    for (const u of await prisma.unidade.findMany({ select: { id: true, codigo: true } })) {
      unidades.set(u.codigo, { id: u.id });
    }

    const setores = new Map<string, { id: string }>();
    for (const s of await prisma.setor.findMany({
      select: { id: true, codigo: true, unidadeId: true },
    })) {
      setores.set(`${s.unidadeId}:${s.codigo}`, { id: s.id });
    }

    if (modo === "DIFERENCIAL") {
      if (!desde) {
        throw new Error("SyncOptions.desde é obrigatório quando modo='DIFERENCIAL'");
      }

      const numerosAlterados = await buscarNumerosAlteradosSicam(desde, {
        timeoutMs: SYNC_QUERY_TIMEOUT_MS,
      });

      syncLogger.info(
        { sincronizacaoId: sincronizacao.id, desde, alterados: numerosAlterados.length },
        "Sync diferencial: tombos alterados identificados",
      );

      if (numerosAlterados.length === 0) {
        // Nenhuma mudança desde o último sync — concluir sem processar.
        const duracaoMs = Date.now() - inicio;
        await prisma.sincronizacaoSicam.update({
          where: { id: sincronizacao.id },
          data: { status: "CONCLUIDA", finalizadoEm: new Date(), totalProcessados: 0 },
        });
        syncLogger.info(
          { sincronizacaoId: sincronizacao.id, duracaoMs },
          "Sync diferencial concluído — nenhuma alteração detectada",
        );
        return {
          sincronizacaoId: sincronizacao.id,
          totalProcessados: 0,
          novos: 0,
          atualizados: 0,
          erros: 0,
          duracaoMs,
          historicosSincronizados: 0,
          errosFaseHistorico: 0,
        };
      }

      const tombosAlterados = await buscarTombosSicamPorNumeros(numerosAlterados, {
        timeoutMs: SYNC_QUERY_TIMEOUT_MS,
      });

      const resultado = await _processarBatch(tombosAlterados, unidades, setores);
      totalProcessados = resultado.novos + resultado.atualizados;
      novos = resultado.novos;
      atualizados = resultado.atualizados;
      erros = resultado.erros;
      historicosSincronizados = resultado.historicosSincronizados;
      errosFaseHistorico = resultado.errosFaseHistorico;
    } else {
      // Modo COMPLETA — pagina por todos os tombos ativos.
      let pagina = 1;
      let totalPaginas = 1;

      do {
        const lote = await listarTodosTombosAtivos({
          pagina,
          porPagina: SYNC_PAGE_SIZE,
          timeoutMs: SYNC_QUERY_TIMEOUT_MS,
        });
        totalPaginas = lote.totalPaginas;

        const resultado = await _processarBatch(lote.tombos, unidades, setores);
        totalProcessados += resultado.novos + resultado.atualizados;
        novos += resultado.novos;
        atualizados += resultado.atualizados;
        erros += resultado.erros;
        historicosSincronizados += resultado.historicosSincronizados;
        errosFaseHistorico += resultado.errosFaseHistorico;

        await prisma.sincronizacaoSicam.update({
          where: { id: sincronizacao.id },
          data: { totalProcessados, novos, atualizados, erros },
        });

        syncLogger.info(
          { sincronizacaoId: sincronizacao.id, pagina, totalPaginas, totalProcessados },
          "Página de sincronização processada",
        );

        pagina++;
      } while (pagina <= totalPaginas);
    }

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
        modo,
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
    syncLogger.error({ err, sincronizacaoId: sincronizacao.id }, "Sincronização SICAM abortada");

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

    // Alerta aos admins apenas em syncs automáticos — em manual o admin já vê o erro na UI.
    if (automatica) {
      notificarFalhaSincronizacao(sincronizacao.id, mensagem).catch(() => {});
    }

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
  const descricaoSarh = tombo.descLotacao ?? null;
  const ativoSarh = tombo.sarhInativo === null ? null : !tombo.sarhInativo;
  let unidade = unidades.get(codigoUnidade);
  if (!unidade) {
    const criada = await prisma.unidade.create({
      data: {
        codigo: codigoUnidade,
        descricao: descricaoSarh ?? codigoUnidade,
        ...(ativoSarh === false ? { ativo: false } : {}),
      },
      select: { id: true },
    });
    if (!descricaoSarh) {
      syncLogger.warn(
        { codigoUnidade },
        "Unidade criada sem descrição longa — SARH.RH_LOTACAO sem registro para esse código",
      );
    }
    unidade = criada;
    unidades.set(codigoUnidade, criada);
  } else {
    if (descricaoSarh) {
      await prisma.unidade.updateMany({
        where: { codigo: codigoUnidade, descricao: codigoUnidade },
        data: { descricao: descricaoSarh },
      });
    }
    if (ativoSarh === false) {
      await prisma.unidade.updateMany({
        where: { codigo: codigoUnidade, ativo: true },
        data: { ativo: false },
      });
    }
  }

  if (tombo.codSetor === null) {
    return { unidadeId: unidade.id, setorId: null };
  }

  const codigoSetor = String(tombo.codSetor);
  const chaveSetor = `${unidade.id}:${codigoSetor}`;
  let setor = setores.get(chaveSetor);
  if (!setor) {
    const criado = await prisma.setor.upsert({
      where: { codigo_unidadeId: { codigo: codigoSetor, unidadeId: unidade.id } },
      create: { codigo: codigoSetor, nome: tombo.nomeSetor ?? codigoSetor, unidadeId: unidade.id },
      update: {},
      select: { id: true },
    });
    setor = criado;
    setores.set(chaveSetor, criado);
  }

  return { unidadeId: unidade.id, setorId: setor.id };
}
