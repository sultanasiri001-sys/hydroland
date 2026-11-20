ALTER TABLE "MarineAsset" ADD COLUMN "reviewCenterId" TEXT;
ALTER TABLE "MarineAssetDocument"
  ADD COLUMN "centerApprovedBy" TEXT,
  ADD COLUMN "reviewNote" TEXT;
