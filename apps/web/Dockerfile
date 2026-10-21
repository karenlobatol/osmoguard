# syntax=docker/dockerfile:1.7
# Frontend PWA de Osmoguard servido por nginx. Contexto de build: raíz del monorepo.

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/engine/package.json packages/engine/
COPY packages/contracts/package.json packages/contracts/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY tsconfig.base.json ./
COPY packages packages
COPY apps/web apps/web
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN cd apps/web && npx tsc --noEmit && npx vite build

FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY deploy/nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
