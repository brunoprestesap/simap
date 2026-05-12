-- CreateEnum
CREATE TYPE "StatusSincronizacaoSicam" AS ENUM ('EM_ANDAMENTO', 'CONCLUIDA', 'ERRO');

-- CreateTable
CREATE TABLE "SincronizacaoSicam" (
    "id" TEXT NOT NULL,
    "status" "StatusSincronizacaoSicam" NOT NULL DEFAULT 'EM_ANDAMENTO',
    "totalProcessados" INTEGER NOT NULL DEFAULT 0,
    "novos" INTEGER NOT NULL DEFAULT 0,
    "atualizados" INTEGER NOT NULL DEFAULT 0,
    "erros" INTEGER NOT NULL DEFAULT 0,
    "mensagemErro" TEXT,
    "finalizadoEm" TIMESTAMP(3),
    "iniciadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SincronizacaoSicam_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SincronizacaoSicam_iniciadoPorId_idx" ON "SincronizacaoSicam"("iniciadoPorId");

-- CreateIndex
CREATE INDEX "SincronizacaoSicam_createdAt_idx" ON "SincronizacaoSicam"("createdAt");

-- CreateIndex
CREATE INDEX "SincronizacaoSicam_status_idx" ON "SincronizacaoSicam"("status");

-- AddForeignKey
ALTER TABLE "SincronizacaoSicam" ADD CONSTRAINT "SincronizacaoSicam_iniciadoPorId_fkey" FOREIGN KEY ("iniciadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
