FROM node:22-bookworm-slim

WORKDIR /app
COPY . .

# Install the exact dependency graph from the committed lockfile, then generate
# the Prisma client before compiling the API.
RUN npm ci --ignore-scripts \
  && npm run db:generate --workspace=@hydroland/api \
  && npm run build --workspace=@hydroland/api

ENV NODE_ENV=production
EXPOSE 10000

# Migrations run before the API accepts requests. DATABASE_URL and JWT_SECRET are injected by Render.
CMD ["sh", "-c", "npm run db:deploy --workspace=@hydroland/api && npm run start --workspace=@hydroland/api"]
