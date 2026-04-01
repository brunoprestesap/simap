-- DropIndex
DROP INDEX "Setor_codigo_key";

-- CreateIndex
CREATE UNIQUE INDEX "Setor_codigo_unidadeId_key" ON "Setor"("codigo", "unidadeId");
