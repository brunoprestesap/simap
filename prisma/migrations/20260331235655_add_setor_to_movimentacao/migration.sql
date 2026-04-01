-- AlterTable
ALTER TABLE "Movimentacao" ADD COLUMN     "setorDestinoId" TEXT,
ADD COLUMN     "setorOrigemId" TEXT;

-- CreateIndex
CREATE INDEX "Movimentacao_setorOrigemId_idx" ON "Movimentacao"("setorOrigemId");

-- CreateIndex
CREATE INDEX "Movimentacao_setorDestinoId_idx" ON "Movimentacao"("setorDestinoId");

-- AddForeignKey
ALTER TABLE "Movimentacao" ADD CONSTRAINT "Movimentacao_setorOrigemId_fkey" FOREIGN KEY ("setorOrigemId") REFERENCES "Setor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimentacao" ADD CONSTRAINT "Movimentacao_setorDestinoId_fkey" FOREIGN KEY ("setorDestinoId") REFERENCES "Setor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
