CREATE TABLE "DocumentRevision" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "contentHash" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdByAccountId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DocumentRevision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DocumentRevision_documentId_version_key"
ON "DocumentRevision"("documentId", "version");

CREATE INDEX "DocumentRevision_documentId_createdAt_idx"
ON "DocumentRevision"("documentId", "createdAt");

CREATE INDEX "DocumentRevision_createdByAccountId_createdAt_idx"
ON "DocumentRevision"("createdByAccountId", "createdAt");

ALTER TABLE "DocumentRevision"
ADD CONSTRAINT "DocumentRevision_documentId_fkey"
FOREIGN KEY ("documentId") REFERENCES "ManagedDocument"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DocumentRevision"
ADD CONSTRAINT "DocumentRevision_createdByAccountId_fkey"
FOREIGN KEY ("createdByAccountId") REFERENCES "Account"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill version 1 for documents that predate immutable revision snapshots.
INSERT INTO "DocumentRevision" (
  "id","documentId","version","contentHash","payload","createdByAccountId","createdAt"
)
SELECT
  md5(random()::text || clock_timestamp()::text || d."id"),
  d."id",
  d."version",
  d."contentHash",
  d."payload",
  d."createdByAccountId",
  d."updatedAt"
FROM "ManagedDocument" d
ON CONFLICT ("documentId","version") DO NOTHING;
