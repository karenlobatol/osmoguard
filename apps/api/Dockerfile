# syntax=docker/dockerfile:1.7
# API de Osmoguard (Fastify + Prisma). Contexto de build: raíz del monorepo.

FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY packages/engine/package.json packages/engine/
COPY packages/contracts/package.json packages/contracts/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY tsconfig.base.json ./
COPY packages packages
COPY apps/api apps/api
RUN cd apps/api && npx prisma generate && npx tsup

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates tini && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY packages/engine/package.json packages/engine/
COPY packages/contracts/package.json packages/contracts/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
# Solo dependencias de producción de la API (los paquetes del monorepo van empaquetados en dist).
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund -w @osmoguard/api && npm cache clean --force
COPY apps/api/prisma apps/api/prisma
RUN cd apps/api && npx prisma generate
COPY --from=build /app/apps/api/dist apps/api/dist
COPY apps/api/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh && chown -R node:node /app
USER node
WORKDIR /app/apps/api
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/usr/bin/tini", "--", "docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
