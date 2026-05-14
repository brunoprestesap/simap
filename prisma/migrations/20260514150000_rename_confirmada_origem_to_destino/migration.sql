-- Renomeia o valor do enum: confirmação passa a ser feita pelo responsável do DESTINO
ALTER TYPE "StatusMovimentacao" RENAME VALUE 'CONFIRMADA_ORIGEM' TO 'CONFIRMADA_DESTINO';
