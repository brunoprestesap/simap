import { z } from "zod/v4";

// Centraliza a validação das variáveis de ambiente críticas. Um deploy sem secrets
// agora falha cedo com mensagem clara, em vez de explodir em runtime no primeiro
// lookup do Prisma ou no primeiro envio de e-mail.
//
// Uso: importar `env` e ler `env.DATABASE_URL`, `env.NEXTAUTH_SECRET` etc. Para módulos
// edge-compatíveis (middleware, auth.config.ts) NÃO importe daqui — Zod é Node-only
// quando usamos process.env diretamente; use process.env explicitamente nesses casos.

const envSchema = z.object({
  // Obrigatórias em qualquer ambiente
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória"),
  NEXTAUTH_SECRET: z
    .string()
    .min(16, "NEXTAUTH_SECRET deve ter pelo menos 16 caracteres"),

  // App
  APP_URL: z.string().url().optional(),
  APP_DOMAIN: z.string().optional(),
  APP_PORT: z.coerce.number().int().positive().optional(),
  TOKEN_EXPIRY_DAYS: z.coerce.number().int().positive().default(7),
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .optional(),
  ALLOWED_DEV_ORIGINS: z.string().optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_URL_INTERNAL: z.string().url().optional(),
  AUTH_TRUST_HOST: z.string().optional(),

  // SMTP
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),

  // LDAP
  LDAP_URL: z.string().optional(),
  LDAP_BIND_DN: z.string().optional(),
  LDAP_BIND_PASSWORD: z.string().optional(),
  LDAP_SEARCH_BASE: z.string().optional(),
  LDAP_SEARCH_FILTER: z.string().optional(),
  LDAP_USERNAME_CASE: z.enum(["upper", "lower", "preserve"]).optional(),
  LDAP_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
  LDAP_CONNECT_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
  LDAP_TLS_REJECT_UNAUTHORIZED: z.string().optional(),
  LDAP_DEFAULT_PROVISION_PERFIL: z
    .enum([
      "TECNICO_TI",
      "SERVIDOR_RESPONSAVEL",
      "SERVIDOR_SEMAP",
      "GESTOR_ADMIN",
    ])
    .optional(),

  // Postgres / Backup
  POSTGRES_USER: z.string().optional(),
  POSTGRES_PASSWORD: z.string().optional(),
  POSTGRES_DB: z.string().optional(),
  BACKUP_RETENTION_DAYS: z.coerce.number().int().positive().optional(),
  BACKUP_INTERVAL_SECONDS: z.coerce.number().int().positive().optional(),

  // Node runtime
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Variáveis de ambiente inválidas ou ausentes:\n${formatted}`,
    );
  }
  cached = parsed.data;
  return cached;
}

// Conveniência: lazy proxy. `env.DATABASE_URL` valida na primeira leitura.
export const env: Env = new Proxy({} as Env, {
  get(_t, prop: string) {
    return getEnv()[prop as keyof Env];
  },
});

// Apenas para testes — limpa o cache de validação.
export function __resetEnvCacheForTests() {
  cached = undefined;
}
