import { PrismaClient, PerfilUsuario, StatusMovimentacao, TipoNotificacao } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // ─── Limpeza (ordem inversa das dependências) ───────────
  await prisma.auditLog.deleteMany();
  await prisma.notificacao.deleteMany();
  await prisma.importacaoCSV.deleteMany();
  await prisma.itemMovimentacao.deleteMany();
  await prisma.movimentacao.deleteMany();
  await prisma.tombo.deleteMany();
  await prisma.servidorSetor.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.servidor.deleteMany();
  await prisma.setor.deleteMany();
  await prisma.unidade.deleteMany();
  console.log("  Dados anteriores removidos.");

  // ─── Unidades ────────────────────────────────────────────
  const unidades = await Promise.all([
    prisma.unidade.create({
      data: { codigo: "SECAD", descricao: "Secretaria Administrativa" },
    }),
    prisma.unidade.create({
      data: { codigo: "NTI", descricao: "Núcleo de Tecnologia da Informação" },
    }),
    prisma.unidade.create({
      data: { codigo: "1VARA", descricao: "Secretaria da 1ª Vara Federal" },
    }),
    prisma.unidade.create({
      data: { codigo: "2VARA", descricao: "Secretaria da 2ª Vara Federal" },
    }),
    prisma.unidade.create({
      data: { codigo: "SEMAP", descricao: "Seção de Material e Patrimônio" },
    }),
  ]);

  const [secad, nti, vara1, vara2, semap] = unidades;

  // ─── Setores ─────────────────────────────────────────────
  const setores = await Promise.all([
    prisma.setor.create({ data: { codigo: "SECAD-ADM", nome: "Administração Geral", unidadeId: secad.id } }),
    prisma.setor.create({ data: { codigo: "SECAD-RH", nome: "Recursos Humanos", unidadeId: secad.id } }),
    prisma.setor.create({ data: { codigo: "NTI-INFRA", nome: "Infraestrutura", unidadeId: nti.id } }),
    prisma.setor.create({ data: { codigo: "NTI-SIST", nome: "Sistemas", unidadeId: nti.id } }),
    prisma.setor.create({ data: { codigo: "1VARA-GAB", nome: "Gabinete do Juiz", unidadeId: vara1.id } }),
    prisma.setor.create({ data: { codigo: "1VARA-SEC", nome: "Secretaria", unidadeId: vara1.id } }),
    prisma.setor.create({ data: { codigo: "2VARA-GAB", nome: "Gabinete do Juiz", unidadeId: vara2.id } }),
    prisma.setor.create({ data: { codigo: "2VARA-SEC", nome: "Secretaria", unidadeId: vara2.id } }),
    prisma.setor.create({ data: { codigo: "SEMAP-PAT", nome: "Patrimônio", unidadeId: semap.id } }),
    prisma.setor.create({ data: { codigo: "SEMAP-ALM", nome: "Almoxarifado", unidadeId: semap.id } }),
  ]);

  // ─── Servidores ──────────────────────────────────────────
  const servidores = await Promise.all([
    prisma.servidor.create({ data: { matricula: "AP20151", nome: "Carlos Eduardo Silva", email: "carlos.silva@jfap.jus.br", unidadeId: nti.id, responsavelUnidade: true } }),
    prisma.servidor.create({ data: { matricula: "AP20152", nome: "Ana Paula Souza", email: "ana.souza@jfap.jus.br", unidadeId: nti.id } }),
    prisma.servidor.create({ data: { matricula: "AP20153", nome: "Roberto Oliveira", email: "roberto.oliveira@jfap.jus.br", unidadeId: vara1.id } }),
    prisma.servidor.create({ data: { matricula: "AP20154", nome: "Maria Fernanda Costa", email: "maria.costa@jfap.jus.br", unidadeId: vara1.id } }),
    prisma.servidor.create({ data: { matricula: "AP20155", nome: "João Pedro Santos", email: "joao.santos@jfap.jus.br", unidadeId: vara2.id, responsavelUnidade: true } }),
    prisma.servidor.create({ data: { matricula: "AP20156", nome: "Luciana Rodrigues", email: "luciana.rodrigues@jfap.jus.br", unidadeId: vara2.id } }),
    prisma.servidor.create({ data: { matricula: "AP20157", nome: "Fernando Almeida", email: "fernando.almeida@jfap.jus.br", unidadeId: semap.id, responsavelUnidade: true } }),
    prisma.servidor.create({ data: { matricula: "AP20158", nome: "Patrícia Lima", email: "patricia.lima@jfap.jus.br", unidadeId: semap.id } }),
    prisma.servidor.create({ data: { matricula: "AP20159", nome: "Ricardo Mendes", email: "ricardo.mendes@jfap.jus.br", unidadeId: secad.id } }),
    prisma.servidor.create({ data: { matricula: "AP20160", nome: "Juliana Pereira", email: "juliana.pereira@jfap.jus.br", unidadeId: secad.id } }),
  ]);

  // ─── Vinculações Servidor-Setor ────────────────────────
  // AP20152 (Ana Paula / NTI) → apenas setor Infraestrutura
  // AP20153 (Roberto / 1ªVara) → Gabinete + Secretaria
  // AP20154 (Maria / 1ªVara) → apenas Secretaria
  // AP20156 (Luciana / 2ªVara) → apenas Gabinete
  // AP20158 (Patrícia / SEMAP) → apenas Patrimônio
  // AP20159 (Ricardo / SECAD) → Administração + RH
  // AP20160 (Juliana / SECAD) → apenas RH
  const [secadAdm, secadRh, ntiInfra, , vara1Gab, vara1Sec, vara2Gab, , semapPat] = setores;
  await prisma.servidorSetor.createMany({
    data: [
      { servidorId: servidores[1].id, setorId: ntiInfra.id },
      { servidorId: servidores[2].id, setorId: vara1Gab.id },
      { servidorId: servidores[2].id, setorId: vara1Sec.id },
      { servidorId: servidores[3].id, setorId: vara1Sec.id },
      { servidorId: servidores[5].id, setorId: vara2Gab.id },
      { servidorId: servidores[7].id, setorId: semapPat.id },
      { servidorId: servidores[8].id, setorId: secadAdm.id },
      { servidorId: servidores[8].id, setorId: secadRh.id },
      { servidorId: servidores[9].id, setorId: secadRh.id },
    ],
  });

  // ─── Usuários (1 de cada perfil) ────────────────────────
  const usuarios = await Promise.all([
    prisma.usuario.create({ data: { matricula: "AP20151", nome: "Carlos Eduardo Silva", perfil: PerfilUsuario.TECNICO_TI } }),
    prisma.usuario.create({ data: { matricula: "AP20153", nome: "Roberto Oliveira", perfil: PerfilUsuario.SERVIDOR_RESPONSAVEL } }),
    prisma.usuario.create({ data: { matricula: "AP20157", nome: "Fernando Almeida", perfil: PerfilUsuario.SERVIDOR_SEMAP } }),
    prisma.usuario.create({ data: { matricula: "AP20159", nome: "Ricardo Mendes", perfil: PerfilUsuario.GESTOR_ADMIN } }),
    prisma.usuario.create({ data: { matricula: "AP20256", nome: "Bruno Prestes", perfil: PerfilUsuario.SERVIDOR_RESPONSAVEL } }),
  ]);

  const [tecnico, responsavel, semapUser, gestor] = usuarios;

  // ─── Tombos (50) ─────────────────────────────────────────
  const materiais = [
    "Monitor LED 24\" Dell", "Desktop Dell OptiPlex 7090", "Notebook Lenovo ThinkPad",
    "Impressora HP LaserJet Pro", "Switch Cisco 24 portas", "Nobreak APC 1500VA",
    "Telefone IP Grandstream", "Cadeira Presidente Ergonômica", "Mesa de Trabalho 1,60m",
    "Ar Condicionado Split 12000 BTUs", "Armário de Aço 2 portas", "Estante de Aço 6 prateleiras",
    "Scanner Fujitsu fi-7160", "Projetor Epson PowerLite", "Tela de Projeção 100\"",
    "Webcam Logitech C920", "Headset Plantronics", "Fragmentadora de Papel",
    "Cofre Digital", "Gaveteiro Móvel 3 gavetas",
  ];

  const tombos = [];
  for (let i = 0; i < 50; i++) {
    const unidadeIdx = i % 5;
    const unidade = unidades[unidadeIdx];
    const setoresUnidade = setores.filter((s) => s.unidadeId === unidade.id);
    const setor = setoresUnidade[i % setoresUnidade.length];
    const servidoresUnidade = servidores.filter((s) => s.unidadeId === unidade.id);
    const servidor = servidoresUnidade[i % servidoresUnidade.length];

    tombos.push(
      prisma.tombo.create({
        data: {
          numero: String(100000 + i),
          descricaoMaterial: materiais[i % materiais.length],
          codigoFornecedor: `F${String(1000 + (i % 10))}`,
          nomeFornecedor: `Fornecedor ${String.fromCharCode(65 + (i % 10))}`,
          unidadeId: unidade.id,
          setorId: setor.id,
          servidorResponsavelId: servidor.id,
        },
      }),
    );
  }
  const tombosCriados = await Promise.all(tombos);

  // ─── Movimentações (5) ───────────────────────────────────
  const now = new Date();
  const tokenExpiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const mov1 = await prisma.movimentacao.create({
    data: {
      unidadeOrigemId: nti.id,
      unidadeDestinoId: vara1.id,
      tecnicoId: tecnico.id,
      status: StatusMovimentacao.PENDENTE_CONFIRMACAO,
      tokenExpiraEm: tokenExpiry,
      itens: {
        create: [
          { tomboId: tombosCriados[1].id },
          { tomboId: tombosCriados[6].id },
        ],
      },
    },
  });

  const mov2 = await prisma.movimentacao.create({
    data: {
      unidadeOrigemId: vara1.id,
      unidadeDestinoId: vara2.id,
      tecnicoId: tecnico.id,
      status: StatusMovimentacao.CONFIRMADA_ORIGEM,
      tokenExpiraEm: tokenExpiry,
      confirmadoEm: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      confirmadoPorNome: "Roberto Oliveira",
      itens: {
        create: [{ tomboId: tombosCriados[2].id }],
      },
    },
  });

  const mov3 = await prisma.movimentacao.create({
    data: {
      unidadeOrigemId: vara2.id,
      unidadeDestinoId: semap.id,
      tecnicoId: tecnico.id,
      status: StatusMovimentacao.REGISTRADA_SICAM,
      tokenExpiraEm: tokenExpiry,
      confirmadoEm: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      confirmadoPorNome: "João Pedro Santos",
      protocoloSicam: "SICAM-2026-001234",
      dataRegistroSicam: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      observacoesSicam: "Registro efetuado sem pendências.",
      registradoSicamPorId: semapUser.id,
      itens: {
        create: [
          { tomboId: tombosCriados[4].id },
          { tomboId: tombosCriados[9].id },
        ],
      },
    },
  });

  const mov4 = await prisma.movimentacao.create({
    data: {
      unidadeOrigemId: secad.id,
      unidadeDestinoId: nti.id,
      tecnicoId: tecnico.id,
      status: StatusMovimentacao.NAO_CONFIRMADA,
      tokenExpiraEm: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      itens: {
        create: [{ tomboId: tombosCriados[14].id }],
      },
    },
  });

  const mov5 = await prisma.movimentacao.create({
    data: {
      unidadeOrigemId: semap.id,
      unidadeDestinoId: secad.id,
      tecnicoId: tecnico.id,
      status: StatusMovimentacao.PENDENTE_CONFIRMACAO,
      tokenExpiraEm: tokenExpiry,
      itens: {
        create: [
          { tomboId: tombosCriados[7].id },
          { tomboId: tombosCriados[12].id },
          { tomboId: tombosCriados[17].id },
        ],
      },
    },
  });

  // ─── Notificações (10) ──────────────────────────────────
  await Promise.all([
    prisma.notificacao.create({ data: { tipo: TipoNotificacao.SAIDA_TOMBO, titulo: "Saída de tombo registrada", mensagem: "O tombo 100001 foi movimentado do NTI para a 1ª Vara.", link: `/movimentacao/${mov1.id}`, usuarioDestinoId: responsavel.id } }),
    prisma.notificacao.create({ data: { tipo: TipoNotificacao.SAIDA_TOMBO, titulo: "Saída de tombo registrada", mensagem: "O tombo 100006 foi movimentado do NTI para a 1ª Vara.", link: `/movimentacao/${mov1.id}`, usuarioDestinoId: responsavel.id } }),
    prisma.notificacao.create({ data: { tipo: TipoNotificacao.CONFIRMACAO_REALIZADA, titulo: "Confirmação realizada", mensagem: "Roberto Oliveira confirmou a movimentação da 1ª Vara para a 2ª Vara.", link: `/movimentacao/${mov2.id}`, usuarioDestinoId: tecnico.id } }),
    prisma.notificacao.create({ data: { tipo: TipoNotificacao.REGISTRO_SICAM, titulo: "Registro no SICAM concluído", mensagem: "Movimentação registrada no SICAM com protocolo SICAM-2026-001234.", link: `/movimentacao/${mov3.id}`, usuarioDestinoId: tecnico.id, lida: true } }),
    prisma.notificacao.create({ data: { tipo: TipoNotificacao.ENTRADA_TOMBO, titulo: "Entrada de tombo", mensagem: "O tombo 100002 foi recebido na 2ª Vara.", link: `/movimentacao/${mov2.id}`, usuarioDestinoId: responsavel.id } }),
    prisma.notificacao.create({ data: { tipo: TipoNotificacao.SAIDA_TOMBO, titulo: "Saída de tombos", mensagem: "3 tombos foram movimentados da SEMAP para a SECAD.", link: `/movimentacao/${mov5.id}`, usuarioDestinoId: semapUser.id } }),
    prisma.notificacao.create({ data: { tipo: TipoNotificacao.IMPORTACAO_CSV, titulo: "Importação CSV concluída", mensagem: "50 registros importados com sucesso.", usuarioDestinoId: tecnico.id, lida: true } }),
    prisma.notificacao.create({ data: { tipo: TipoNotificacao.SAIDA_TOMBO, titulo: "Atenção: movimentação não confirmada", mensagem: "A movimentação da SECAD para NTI não foi confirmada no prazo.", link: `/movimentacao/${mov4.id}`, usuarioDestinoId: gestor.id } }),
    prisma.notificacao.create({ data: { tipo: TipoNotificacao.CONFIRMACAO_REALIZADA, titulo: "Confirmação pendente", mensagem: "Há movimentações aguardando sua confirmação.", link: "/movimentacao", usuarioDestinoId: responsavel.id } }),
    prisma.notificacao.create({ data: { tipo: TipoNotificacao.REGISTRO_SICAM, titulo: "Backlog atualizado", mensagem: "2 movimentações aguardam registro no SICAM.", link: "/backlog", usuarioDestinoId: semapUser.id } }),
  ]);

  // ─── AuditLog ────────────────────────────────────────────
  await prisma.auditLog.create({
    data: {
      acao: "IMPORTACAO_CSV",
      entidade: "ImportacaoCSV",
      entidadeId: "seed",
      usuarioId: tecnico.id,
      detalhes: { nomeArquivo: "tombos_2026.csv", totalRegistros: 50, novos: 50 },
    },
  });

  console.log("Seed completed successfully!");
  console.log(`  - ${unidades.length} unidades`);
  console.log(`  - ${setores.length} setores`);
  console.log(`  - ${servidores.length} servidores (3 responsáveis por unidade inteira)`);
  console.log(`  - 9 vinculações servidor-setor`);
  console.log(`  - 4 usuários`);
  console.log(`  - ${tombosCriados.length} tombos`);
  console.log(`  - 5 movimentações`);
  console.log(`  - 10 notificações`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
