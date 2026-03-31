---
paths:
  - "server/**"
---

# Regras para Server Actions e Lógica Server-Side

- Toda Server Action deve começar com `'use server'`.
- Valide TODOS os inputs com Zod antes de qualquer operação no banco.
- Verifique autenticação e autorização (perfil do usuário) no início de toda action.
- Retorne objetos tipados `{ success: boolean, data?: T, error?: string }` — nunca lance exceções para erros esperados.
- Registre operações de movimentação na tabela de auditoria (AuditLog) automaticamente.
- O CSV do SICAM usa encoding Latin-1 (iso-8859-1) e delimitador ponto e vírgula (;). O parser deve tratar isso explicitamente.
- Tokens de confirmação pública devem ser gerados com crypto.randomUUID() e ter validade configurável via env TOKEN_EXPIRY_DAYS.
- Envio de e-mail nunca deve bloquear a resposta ao usuário. Use fire-and-forget com log de erro.
