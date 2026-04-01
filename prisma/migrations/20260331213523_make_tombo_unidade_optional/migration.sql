-- DropForeignKey
ALTER TABLE "Tombo" DROP CONSTRAINT "Tombo_unidadeId_fkey";

-- AlterTable
ALTER TABLE "Tombo" ALTER COLUMN "unidadeId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Tombo" ADD CONSTRAINT "Tombo_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE SET NULL ON UPDATE CASCADE;
