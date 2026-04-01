-- CreateEnum
CREATE TYPE "PerfilUsuario" AS ENUM ('TECNICO_TI', 'SERVIDOR_RESPONSAVEL', 'SERVIDOR_SEMAP', 'GESTOR_ADMIN');

-- CreateEnum
CREATE TYPE "StatusMovimentacao" AS ENUM ('PENDENTE_CONFIRMACAO', 'CONFIRMADA_ORIGEM', 'REGISTRADA_SICAM', 'NAO_CONFIRMADA');

-- CreateEnum
CREATE TYPE "TipoNotificacao" AS ENUM ('SAIDA_TOMBO', 'ENTRADA_TOMBO', 'CONFIRMACAO_REALIZADA', 'REGISTRO_SICAM', 'IMPORTACAO_CSV');

-- CreateTable
CREATE TABLE "Unidade" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setor" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Servidor" (
    "id" TEXT NOT NULL,
    "matricula" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "unidadeId" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Servidor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tombo" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "descricaoMaterial" TEXT NOT NULL,
    "codigoFornecedor" TEXT,
    "nomeFornecedor" TEXT,
    "unidadeId" TEXT NOT NULL,
    "setorId" TEXT,
    "servidorResponsavelId" TEXT NOT NULL,
    "saida" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tombo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "matricula" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "perfil" "PerfilUsuario" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Movimentacao" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "unidadeOrigemId" TEXT NOT NULL,
    "unidadeDestinoId" TEXT NOT NULL,
    "tecnicoId" TEXT NOT NULL,
    "status" "StatusMovimentacao" NOT NULL DEFAULT 'PENDENTE_CONFIRMACAO',
    "tokenConfirmacao" TEXT NOT NULL,
    "tokenExpiraEm" TIMESTAMP(3) NOT NULL,
    "confirmadoEm" TIMESTAMP(3),
    "confirmadoPorNome" TEXT,
    "protocoloSicam" TEXT,
    "dataRegistroSicam" TIMESTAMP(3),
    "observacoesSicam" TEXT,
    "registradoSicamPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Movimentacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemMovimentacao" (
    "id" TEXT NOT NULL,
    "movimentacaoId" TEXT NOT NULL,
    "tomboId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemMovimentacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "detalhes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notificacao" (
    "id" TEXT NOT NULL,
    "tipo" "TipoNotificacao" NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "link" TEXT,
    "usuarioDestinoId" TEXT NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notificacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportacaoCSV" (
    "id" TEXT NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "totalRegistros" INTEGER NOT NULL,
    "novos" INTEGER NOT NULL,
    "atualizados" INTEGER NOT NULL,
    "erros" INTEGER NOT NULL,
    "importadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportacaoCSV_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Unidade_codigo_key" ON "Unidade"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Setor_codigo_key" ON "Setor"("codigo");

-- CreateIndex
CREATE INDEX "Setor_unidadeId_idx" ON "Setor"("unidadeId");

-- CreateIndex
CREATE UNIQUE INDEX "Servidor_matricula_key" ON "Servidor"("matricula");

-- CreateIndex
CREATE INDEX "Servidor_matricula_idx" ON "Servidor"("matricula");

-- CreateIndex
CREATE INDEX "Servidor_unidadeId_idx" ON "Servidor"("unidadeId");

-- CreateIndex
CREATE UNIQUE INDEX "Tombo_numero_key" ON "Tombo"("numero");

-- CreateIndex
CREATE INDEX "Tombo_numero_idx" ON "Tombo"("numero");

-- CreateIndex
CREATE INDEX "Tombo_unidadeId_idx" ON "Tombo"("unidadeId");

-- CreateIndex
CREATE INDEX "Tombo_servidorResponsavelId_idx" ON "Tombo"("servidorResponsavelId");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_matricula_key" ON "Usuario"("matricula");

-- CreateIndex
CREATE INDEX "Usuario_matricula_idx" ON "Usuario"("matricula");

-- CreateIndex
CREATE UNIQUE INDEX "Movimentacao_codigo_key" ON "Movimentacao"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Movimentacao_tokenConfirmacao_key" ON "Movimentacao"("tokenConfirmacao");

-- CreateIndex
CREATE INDEX "Movimentacao_status_idx" ON "Movimentacao"("status");

-- CreateIndex
CREATE INDEX "Movimentacao_tokenConfirmacao_idx" ON "Movimentacao"("tokenConfirmacao");

-- CreateIndex
CREATE INDEX "Movimentacao_createdAt_idx" ON "Movimentacao"("createdAt");

-- CreateIndex
CREATE INDEX "Movimentacao_unidadeOrigemId_idx" ON "Movimentacao"("unidadeOrigemId");

-- CreateIndex
CREATE INDEX "Movimentacao_unidadeDestinoId_idx" ON "Movimentacao"("unidadeDestinoId");

-- CreateIndex
CREATE INDEX "ItemMovimentacao_movimentacaoId_idx" ON "ItemMovimentacao"("movimentacaoId");

-- CreateIndex
CREATE INDEX "ItemMovimentacao_tomboId_idx" ON "ItemMovimentacao"("tomboId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemMovimentacao_movimentacaoId_tomboId_key" ON "ItemMovimentacao"("movimentacaoId", "tomboId");

-- CreateIndex
CREATE INDEX "AuditLog_entidade_entidadeId_idx" ON "AuditLog"("entidade", "entidadeId");

-- CreateIndex
CREATE INDEX "AuditLog_usuarioId_idx" ON "AuditLog"("usuarioId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Notificacao_usuarioDestinoId_idx" ON "Notificacao"("usuarioDestinoId");

-- CreateIndex
CREATE INDEX "Notificacao_lida_idx" ON "Notificacao"("lida");

-- CreateIndex
CREATE INDEX "Notificacao_createdAt_idx" ON "Notificacao"("createdAt");

-- CreateIndex
CREATE INDEX "ImportacaoCSV_importadoPorId_idx" ON "ImportacaoCSV"("importadoPorId");

-- CreateIndex
CREATE INDEX "ImportacaoCSV_createdAt_idx" ON "ImportacaoCSV"("createdAt");

-- AddForeignKey
ALTER TABLE "Setor" ADD CONSTRAINT "Setor_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Servidor" ADD CONSTRAINT "Servidor_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tombo" ADD CONSTRAINT "Tombo_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tombo" ADD CONSTRAINT "Tombo_setorId_fkey" FOREIGN KEY ("setorId") REFERENCES "Setor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tombo" ADD CONSTRAINT "Tombo_servidorResponsavelId_fkey" FOREIGN KEY ("servidorResponsavelId") REFERENCES "Servidor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimentacao" ADD CONSTRAINT "Movimentacao_unidadeOrigemId_fkey" FOREIGN KEY ("unidadeOrigemId") REFERENCES "Unidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimentacao" ADD CONSTRAINT "Movimentacao_unidadeDestinoId_fkey" FOREIGN KEY ("unidadeDestinoId") REFERENCES "Unidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimentacao" ADD CONSTRAINT "Movimentacao_tecnicoId_fkey" FOREIGN KEY ("tecnicoId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimentacao" ADD CONSTRAINT "Movimentacao_registradoSicamPorId_fkey" FOREIGN KEY ("registradoSicamPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemMovimentacao" ADD CONSTRAINT "ItemMovimentacao_movimentacaoId_fkey" FOREIGN KEY ("movimentacaoId") REFERENCES "Movimentacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemMovimentacao" ADD CONSTRAINT "ItemMovimentacao_tomboId_fkey" FOREIGN KEY ("tomboId") REFERENCES "Tombo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_usuarioDestinoId_fkey" FOREIGN KEY ("usuarioDestinoId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportacaoCSV" ADD CONSTRAINT "ImportacaoCSV_importadoPorId_fkey" FOREIGN KEY ("importadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
