CREATE TABLE "StoreProductFeedback" AS
  SELECT a.id AS "accountId", p.id AS "productId" FROM "Account" a CROSS JOIN "StoreProduct" p WITH NO DATA;
ALTER TABLE "StoreProductFeedback"
  ADD COLUMN id TEXT PRIMARY KEY,
  ADD COLUMN kind TEXT NOT NULL CHECK (kind IN ('QUESTION','REVIEW')),
  ADD COLUMN body VARCHAR(1800) NOT NULL,
  ADD COLUMN rating INTEGER,
  ADD COLUMN reply VARCHAR(1800),
  ADD COLUMN published BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN revision INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "accountId" SET NOT NULL, ALTER COLUMN "productId" SET NOT NULL,
  ADD CONSTRAINT "StoreProductFeedback_rating_check" CHECK ((kind='QUESTION' AND rating IS NULL) OR (kind='REVIEW' AND rating BETWEEN 1 AND 5 AND rating IS NOT NULL)),
  ADD FOREIGN KEY ("accountId") REFERENCES "Account"(id) ON DELETE CASCADE,
  ADD FOREIGN KEY ("productId") REFERENCES "StoreProduct"(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX "StoreProductFeedback_one_review" ON "StoreProductFeedback" ("productId","accountId") WHERE kind='REVIEW';
CREATE INDEX "StoreProductFeedback_productId_published_createdAt_idx" ON "StoreProductFeedback" ("productId",published,"createdAt");
