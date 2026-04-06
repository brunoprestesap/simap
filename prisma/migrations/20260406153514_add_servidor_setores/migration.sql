-- AlterTable
ALTER TABLE "Servidor" ADD COLUMN     "responsavelUnidade" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ServidorSetor" (
    "id" TEXT NOT NULL,
    "servidorId" TEXT NOT NULL,
    "setorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServidorSetor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServidorSetor_servidorId_idx" ON "ServidorSetor"("servidorId");

-- CreateIndex
CREATE INDEX "ServidorSetor_setorId_idx" ON "ServidorSetor"("setorId");

-- CreateIndex
CREATE UNIQUE INDEX "ServidorSetor_servidorId_setorId_key" ON "ServidorSetor"("servidorId", "setorId");

-- AddForeignKey
ALTER TABLE "ServidorSetor" ADD CONSTRAINT "ServidorSetor_servidorId_fkey" FOREIGN KEY ("servidorId") REFERENCES "Servidor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServidorSetor" ADD CONSTRAINT "ServidorSetor_setorId_fkey" FOREIGN KEY ("setorId") REFERENCES "Setor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
