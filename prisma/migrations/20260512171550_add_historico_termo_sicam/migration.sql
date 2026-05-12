-- CreateTable
CREATE TABLE "HistoricoTermoSicam" (
    "id" TEXT NOT NULL,
    "tomboId" TEXT NOT NULL,
    "nuTermo" INTEGER NOT NULL,
    "anTermo" INTEGER NOT NULL,
    "tiTermo" INTEGER NOT NULL,
    "codLotacao" INTEGER,
    "codLotacaoOrigem" INTEGER,
    "codSetor" INTEGER,
    "nomeSetor" TEXT,
    "matriculaResponsavel" TEXT,
    "dataTermo" TIMESTAMP(3),
    "termoAssinado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HistoricoTermoSicam_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HistoricoTermoSicam_tomboId_dataTermo_idx" ON "HistoricoTermoSicam"("tomboId", "dataTermo" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "HistoricoTermoSicam_tomboId_nuTermo_anTermo_tiTermo_key" ON "HistoricoTermoSicam"("tomboId", "nuTermo", "anTermo", "tiTermo");

-- AddForeignKey
ALTER TABLE "HistoricoTermoSicam" ADD CONSTRAINT "HistoricoTermoSicam_tomboId_fkey" FOREIGN KEY ("tomboId") REFERENCES "Tombo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
