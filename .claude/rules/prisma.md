---
paths:
  - "prisma/**"
---

# Regras para Prisma Schema e Migrations

- Nunca delete ou modifique migrations já aplicadas. Crie novas migrations para alterações.
- Use `@default(cuid())` para IDs primários.
- Sempre adicione `createdAt DateTime @default(now())` e `updatedAt DateTime @updatedAt` em todas as tabelas.
- A tabela de auditoria (AuditLog) NUNCA deve ter onDelete: Cascade. Registros de auditoria são permanentes.
- Use enums do Prisma para campos com valores fixos (ex.: StatusMovimentacao, PerfilUsuario, TipoNotificacao).
- Nomeie tabelas em PascalCase singular (ex.: Tombo, Unidade, Movimentacao).
- Nomeie campos em camelCase (ex.: codigoLotacao, nomeResponsavel).
- Sempre adicione índices (`@@index`) em campos usados em filtros e buscas: numeroTombo, matriculaResponsavel, codigoLotacao, status, createdAt.
