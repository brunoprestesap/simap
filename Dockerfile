FROM node:20-slim AS base
WORKDIR /app

FROM base AS deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --ignore-scripts

FROM base AS builder
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app

# System deps: openssl (Prisma), curl (healthcheck), libaio1 (Oracle Thick mode)
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    curl \
    libaio1 \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Oracle Instant Client Basic Lite — necessário para suportar password verifier
# 10G (NJS-116) presente nos servidores Oracle legados da JFAP/TRF-1.
# Thin mode não suporta esse tipo de autenticação.
RUN mkdir -p /opt/oracle \
    && cd /opt/oracle \
    && curl -fsSL -o ic.zip \
       https://download.oracle.com/otn_software/linux/instantclient/2380000/instantclient-basiclite-linux.x64-23.8.0.25.04.zip \
    && unzip -q ic.zip \
    && rm ic.zip \
    && echo /opt/oracle/instantclient_23_8 > /etc/ld.so.conf.d/oracle-ic.conf \
    && ldconfig

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Thick mode: aponta para o Instant Client embutido na imagem
ENV SICAM_ORACLE_INSTANT_CLIENT_DIR=/opt/oracle/instantclient_23_8
# Config isolada (sqlnet.ora) copiada abaixo — evita conflito com TNS_ADMIN global
ENV SICAM_ORACLE_CONFIG_DIR=/opt/oracle-config

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Oracle config (sqlnet.ora) isolado do TNS_ADMIN do sistema
COPY --from=builder --chown=nextjs:nodejs /app/deploy/oracle-config /opt/oracle-config

# Prisma CLI + deps transitivas para migrate deploy em runtime
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT}/api/health" >/dev/null || exit 1

CMD ["node", "server.js"]
