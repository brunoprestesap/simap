-- DropForeignKey
ALTER TABLE "Tombo" DROP CONSTRAINT "Tombo_servidorResponsavelId_fkey";

-- AlterTable
ALTER TABLE "Tombo" ALTER COLUMN "servidorResponsavelId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Tombo" ADD CONSTRAINT "Tombo_servidorResponsavelId_fkey" FOREIGN KEY ("servidorResponsavelId") REFERENCES "Servidor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
