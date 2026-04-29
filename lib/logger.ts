import pino from "pino";

const isProd = process.env.NODE_ENV === "production";
const level = process.env.LOG_LEVEL ?? (isProd ? "info" : "debug");

export const logger = pino({
  level,
  base: { service: "simap" },
  redact: {
    paths: [
      "password",
      "senha",
      "*.password",
      "*.senha",
      "headers.authorization",
      "headers.cookie",
    ],
    censor: "[redacted]",
  },
  transport: isProd
    ? undefined
    : {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:HH:MM:ss" },
      },
});

export type Logger = typeof logger;

export const authLogger = logger.child({ module: "auth" });
export const ldapLogger = logger.child({ module: "ldap" });
export const emailLogger = logger.child({ module: "email" });
export const movimentacaoLogger = logger.child({ module: "movimentacao" });
