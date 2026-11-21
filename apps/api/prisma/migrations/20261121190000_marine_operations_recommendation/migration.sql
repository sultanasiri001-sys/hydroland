ALTER TABLE "MarineAssetDocument" ADD COLUMN "operationsRecommendedBy" TEXT;
-- In-flight center approvals still require a recommendation. Completed decisions retain their history.
UPDATE "MarineAssetDocument" SET "status" = 'OPERATIONS_PENDING'
WHERE "status" IN ('PLATFORM_PENDING', 'ON_HOLD') AND "centerApprovedBy" IS NOT NULL;
