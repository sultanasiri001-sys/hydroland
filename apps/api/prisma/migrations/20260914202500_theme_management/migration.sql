CREATE TABLE "ThemeSchedule" (
  "id" TEXT NOT NULL,
  "themeId" TEXT NOT NULL,
  "name" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ThemeSchedule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ThemeSchedule_valid_window" CHECK ("endsAt" > "startsAt"),
  CONSTRAINT "ThemeSchedule_valid_status" CHECK ("status" IN ('DRAFT','PUBLISHED','ARCHIVED'))
);

CREATE INDEX "ThemeSchedule_status_startsAt_endsAt_idx"
  ON "ThemeSchedule"("status", "startsAt", "endsAt");

CREATE INDEX "ThemeSchedule_themeId_idx" ON "ThemeSchedule"("themeId");
