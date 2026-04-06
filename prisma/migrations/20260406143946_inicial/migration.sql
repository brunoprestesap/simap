-- CreateIndex
CREATE INDEX "Movimentacao_tecnicoId_idx" ON "Movimentacao"("tecnicoId");

-- CreateIndex
CREATE INDEX "Movimentacao_registradoSicamPorId_idx" ON "Movimentacao"("registradoSicamPorId");

-- CreateIndex
CREATE INDEX "Movimentacao_status_createdAt_idx" ON "Movimentacao"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Movimentacao_unidadeOrigemId_status_idx" ON "Movimentacao"("unidadeOrigemId", "status");

-- CreateIndex
CREATE INDEX "Notificacao_usuarioDestinoId_lida_idx" ON "Notificacao"("usuarioDestinoId", "lida");

-- CreateIndex
CREATE INDEX "Tombo_setorId_idx" ON "Tombo"("setorId");

-- CreateIndex
CREATE INDEX "Tombo_unidadeId_ativo_idx" ON "Tombo"("unidadeId", "ativo");
