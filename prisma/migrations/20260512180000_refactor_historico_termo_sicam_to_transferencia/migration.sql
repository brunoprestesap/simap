-- Refactora HistoricoTermoSicam: fonte real é HISTORICO_ITEM_TERMO
-- (WHERE FG_TRANSFERENCIA = 'S'), não TERMO diretamente.
-- A tabela foi criada há minutos e não tem dados de produção — drop+recreate é seguro.

DROP TABLE "HistoricoTermoSicam";

CREATE TABLE "HistoricoTermoSicam" (
    "id"                TEXT NOT NULL,
    "tomboId"           TEXT NOT NULL,
    "dtTransferencia"   TIMESTAMP(3) NOT NULL,
    "codLotacaoDestino" INTEGER,
    "codSetorDestino"   INTEGER,
    "nomeSetorDestino"  TEXT,
    "matriculaTransf"   TEXT,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HistoricoTermoSicam_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HistoricoTermoSicam_tomboId_dtTransferencia_key"
    ON "HistoricoTermoSicam"("tomboId", "dtTransferencia");

CREATE INDEX "HistoricoTermoSicam_tomboId_dtTransferencia_idx"
    ON "HistoricoTermoSicam"("tomboId", "dtTransferencia" DESC);

ALTER TABLE "HistoricoTermoSicam"
    ADD CONSTRAINT "HistoricoTermoSicam_tomboId_fkey"
    FOREIGN KEY ("tomboId") REFERENCES "Tombo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
