-- Refatora HistoricoTermoSicam para usar HISTORICO_TOMBO + TERMO como fonte.
-- Substitui chave única (tomboId, dtTransferencia) por (tomboId, nuTermo, anTermo, tiTermo).

-- 1. Remover índice e constraint antigos
DROP INDEX IF EXISTS "HistoricoTermoSicam_tomboId_dtTransferencia_idx";
ALTER TABLE "HistoricoTermoSicam" DROP CONSTRAINT IF EXISTS "HistoricoTermoSicam_tomboId_dtTransferencia_key";

-- 2. Remover colunas antigas
ALTER TABLE "HistoricoTermoSicam" DROP COLUMN IF EXISTS "dtTransferencia";
ALTER TABLE "HistoricoTermoSicam" DROP COLUMN IF EXISTS "codLotacaoDestino";
ALTER TABLE "HistoricoTermoSicam" DROP COLUMN IF EXISTS "codSetorDestino";
ALTER TABLE "HistoricoTermoSicam" DROP COLUMN IF EXISTS "nomeSetorDestino";
ALTER TABLE "HistoricoTermoSicam" DROP COLUMN IF EXISTS "matriculaTransf";

-- 3. Adicionar novas colunas
ALTER TABLE "HistoricoTermoSicam" ADD COLUMN "nuTermo"       INTEGER       NOT NULL DEFAULT 0;
ALTER TABLE "HistoricoTermoSicam" ADD COLUMN "anTermo"       INTEGER       NOT NULL DEFAULT 0;
ALTER TABLE "HistoricoTermoSicam" ADD COLUMN "tiTermo"       INTEGER       NOT NULL DEFAULT 0;
ALTER TABLE "HistoricoTermoSicam" ADD COLUMN "dtTermo"       TIMESTAMP(3);
ALTER TABLE "HistoricoTermoSicam" ADD COLUMN "codLotacao"    INTEGER;
ALTER TABLE "HistoricoTermoSicam" ADD COLUMN "codSetor"      INTEGER;
ALTER TABLE "HistoricoTermoSicam" ADD COLUMN "nomeSetor"     TEXT;
ALTER TABLE "HistoricoTermoSicam" ADD COLUMN "matriculaResp" TEXT;

-- 4. Remover defaults temporários (usados só para migration com linhas existentes, já truncada)
ALTER TABLE "HistoricoTermoSicam" ALTER COLUMN "nuTermo" DROP DEFAULT;
ALTER TABLE "HistoricoTermoSicam" ALTER COLUMN "anTermo" DROP DEFAULT;
ALTER TABLE "HistoricoTermoSicam" ALTER COLUMN "tiTermo" DROP DEFAULT;

-- 5. Novo índice e constraint
CREATE INDEX "HistoricoTermoSicam_tomboId_idx" ON "HistoricoTermoSicam"("tomboId");
ALTER TABLE "HistoricoTermoSicam" ADD CONSTRAINT "HistoricoTermoSicam_tomboId_nuTermo_anTermo_tiTermo_key"
  UNIQUE ("tomboId", "nuTermo", "anTermo", "tiTermo");
