-- AlterEnum
ALTER TYPE "TipoNotificacao" ADD VALUE 'SINCRONIZACAO_SICAM';

-- DropForeignKey
ALTER TABLE "SincronizacaoSicam" DROP CONSTRAINT "SincronizacaoSicam_iniciadoPorId_fkey";

-- AlterTable
ALTER TABLE "SincronizacaoSicam" ADD COLUMN     "automatica" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "iniciadoPorId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "SincronizacaoSicam" ADD CONSTRAINT "SincronizacaoSicam_iniciadoPorId_fkey" FOREIGN KEY ("iniciadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
