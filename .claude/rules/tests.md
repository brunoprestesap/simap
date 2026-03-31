---
paths:
  - "**/*.test.*"
  - "**/*.spec.*"
  - "tests/**"
  - "e2e/**"
---

# Regras para Testes

- Testes unitários (Vitest): cubra toda lógica de negócio — parser CSV, validações Zod, cálculos de KPI, geração de tokens, formatação de dados.
- Testes de integração (Vitest + Testing Library): cubra Server Actions, middleware auth, CRUD completo.
- Testes E2E (Playwright): cubra os 7 fluxos críticos — login, importação CSV, nova movimentação (scanner), confirmação pública, backlog SEMAP, CRUD admin, dashboard.
- Nomeie testes descritivamente: `it('deve registrar movimentação com múltiplos tombos e enviar e-mails')`.
- Use factories/fixtures para dados de teste, nunca hardcode valores mágicos.
- Mock do LDAP e SMTP nos testes de integração. Nunca conecte a serviços reais em testes.
- Cobertura mínima alvo: 80% nos fluxos críticos.
