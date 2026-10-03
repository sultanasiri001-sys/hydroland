FROM node:22-bookworm-slim AS base
# Prisma's generated Linux engine and migration CLI require OpenSSL at runtime.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS manifests
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/mobile/package.json apps/mobile/package.json

FROM manifests AS build
RUN npm ci --workspace=@hydroland/api --include-workspace-root=false --ignore-scripts
COPY apps/api apps/api
RUN npm run db:generate --workspace=@hydroland/api \
  && npm run build --workspace=@hydroland/api

FROM manifests AS runtime-dependencies
RUN npm ci --workspace=@hydroland/api --include-workspace-root=false --omit=dev --ignore-scripts \
  && mkdir -p apps/api/node_modules

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=runtime-dependencies --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=runtime-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=runtime-dependencies --chown=node:node /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build --chown=node:node /app/node_modules/@prisma/engines ./node_modules/@prisma/engines
COPY --from=build --chown=node:node /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build --chown=node:node /app/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=node:node /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=node:node /app/apps/api/prisma ./apps/api/prisma
COPY --from=build --chown=node:node /app/apps/api/scripts ./apps/api/scripts

EXPOSE 3001
USER node
# Compose retains its existing direct-start contract.
CMD ["node", "apps/api/dist/main.js"]
