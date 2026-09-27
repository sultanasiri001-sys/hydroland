ALTER TABLE "WorkforceCenterDepartment"
  ADD COLUMN IF NOT EXISTS "maxLevel" TEXT NOT NULL DEFAULT 'L1';

ALTER TABLE "WorkforceCenterDepartment"
  ADD CONSTRAINT "WorkforceCenterDepartment_maxLevel_check"
  CHECK ("maxLevel" IN ('L1', 'L2', 'L3', 'L4'));

CREATE INDEX IF NOT EXISTS "WorkforceCenterDepartment_org_status_level_idx"
  ON "WorkforceCenterDepartment"("organizationId", "status", "maxLevel");
