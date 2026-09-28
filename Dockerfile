FROM node:22-bookworm-slim AS build

WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/mobile/package.json apps/mobile/package.json
RUN npm ci --ignore-scripts
COPY apps/api apps/api
RUN npm run db:generate --workspace=@hydroland/api \
  && npm run build --workspace=@hydroland/api

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=node:node /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=node:node /app/apps/api/prisma ./apps/api/prisma
COPY --from=build --chown=node:node /app/apps/api/scripts ./apps/api/scripts

EXPOSE 10000
USER node

# Database migrations run before the API accepts requests. Runtime secrets are injected by the platform.
CMD ["sh", "-c", "npm run db:deploy --workspace=@hydroland/api && node apps/api/dist/main.js"]
