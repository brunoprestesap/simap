-- AlterTable Usuario: lotação patrimonial e e-mail (ex-Servidor)
ALTER TABLE "Usuario" ADD COLUMN "email" TEXT,
ADD COLUMN "unidadeId" TEXT,
ADD COLUMN "setorId" TEXT,
ADD COLUMN "responsavelUnidade" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable Tombo: responsável via Usuario + espelho SICAM
ALTER TABLE "Tombo" ADD COLUMN "usuarioResponsavelId" TEXT,
ADD COLUMN "matriculaResponsavel" TEXT,
ADD COLUMN "nomeResponsavel" TEXT;

-- Copiar dados do responsável do tombo (Servidor → snapshot + Usuario quando existir)
UPDATE "Tombo" t
SET "matriculaResponsavel" = s.matricula,
    "nomeResponsavel" = s.nome,
    "usuarioResponsavelId" = u.id
FROM "Servidor" s
LEFT JOIN "Usuario" u ON u.matricula = s.matricula
WHERE t."servidorResponsavelId" IS NOT NULL
  AND t."servidorResponsavelId" = s.id;

-- Fundir cadastro organizacional do Servidor no Usuario (mesma matrícula)
UPDATE "Usuario" u
SET "email" = s.email,
    "unidadeId" = s."unidadeId",
    "responsavelUnidade" = s."responsavelUnidade"
FROM "Servidor" s
WHERE u.matricula = s.matricula;

-- Um setor de referência por matrícula (menor setorId vinculado no legado ServidorSetor)
UPDATE "Usuario" u
SET "setorId" = sub."setorId"
FROM (
  SELECT s.matricula, MIN(ss."setorId") AS "setorId"
  FROM "Servidor" s
  INNER JOIN "ServidorSetor" ss ON ss."servidorId" = s.id
  GROUP BY s.matricula
) sub
WHERE u.matricula = sub.matricula;

-- Índices e FKs em Usuario
CREATE INDEX "Usuario_unidadeId_idx" ON "Usuario"("unidadeId");
CREATE INDEX "Usuario_setorId_idx" ON "Usuario"("setorId");
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_setorId_fkey" FOREIGN KEY ("setorId") REFERENCES "Setor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Remover FK antiga Tombo → Servidor
ALTER TABLE "Tombo" DROP CONSTRAINT "Tombo_servidorResponsavelId_fkey";
DROP INDEX IF EXISTS "Tombo_servidorResponsavelId_idx";
ALTER TABLE "Tombo" DROP COLUMN "servidorResponsavelId";

CREATE INDEX "Tombo_usuarioResponsavelId_idx" ON "Tombo"("usuarioResponsavelId");
ALTER TABLE "Tombo" ADD CONSTRAINT "Tombo_usuarioResponsavelId_fkey" FOREIGN KEY ("usuarioResponsavelId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Remover legado Servidor / ServidorSetor
DROP TABLE "ServidorSetor";
DROP TABLE "Servidor";
