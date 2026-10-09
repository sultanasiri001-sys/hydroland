ALTER TABLE "MarineAssetDocument"
  ADD COLUMN "storageKey" TEXT,
  ADD COLUMN "originalName" TEXT,
  ADD COLUMN "mimeType" TEXT,
  ADD COLUMN "byteSize" INTEGER,
  ADD COLUMN "sha256" TEXT;

CREATE UNIQUE INDEX "MarineAssetDocument_storageKey_key" ON "MarineAssetDocument"("storageKey");
CREATE UNIQUE INDEX "MarineAssetDocument_sha256_key" ON "MarineAssetDocument"("sha256");
