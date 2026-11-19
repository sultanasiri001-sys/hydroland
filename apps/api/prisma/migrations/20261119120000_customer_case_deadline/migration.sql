-- Explicit per-case deadlines are assigned by an authorized operator. No default
-- duration or automatic customer acceptance is inferred for existing cases.
ALTER TABLE "CustomerCase" ADD COLUMN "dueAt" TIMESTAMPTZ(3);
CREATE INDEX "CustomerCase_status_dueAt_idx" ON "CustomerCase"("status", "dueAt");
