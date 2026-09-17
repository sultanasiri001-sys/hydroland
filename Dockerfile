FROM node:22-bookworm-slim

WORKDIR /app
COPY . .

# This repository does not commit a lockfile yet. Install dependencies during the image build,
# then generate the Prisma client before compiling the API.
RUN npm install --ignore-scripts \
  && npm run db:generate --workspace=@hydroland/api \
  && npm run build --workspace=@hydroland/api

ENV NODE_ENV=production
EXPOSE 10000

# Migrations run before the API accepts requests. DATABASE_URL and JWT_SECRET are injected by Render.
CMD ["sh", "-c", "(cd apps/api && npx prisma migrate resolve --rolled-back 20260916070000_hr_candidate_verification_workflow || true) && npm run db:deploy --workspace=@hydroland/api && npm run start --workspace=@hydroland/api"]
