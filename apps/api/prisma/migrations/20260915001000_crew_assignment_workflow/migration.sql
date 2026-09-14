CREATE TABLE "CrewAssignment" (
  "id" TEXT NOT NULL,
  "tripId" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "roleType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "replacesAssignmentId" TEXT,
  "respondedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CrewAssignment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CrewAssignment_tripId_status_idx" ON "CrewAssignment"("tripId", "status");
CREATE INDEX "CrewAssignment_accountId_status_idx" ON "CrewAssignment"("accountId", "status");
CREATE INDEX "CrewAssignment_resourceId_idx" ON "CrewAssignment"("resourceId");
ALTER TABLE "CrewAssignment" ADD CONSTRAINT "CrewAssignment_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CrewAssignment" ADD CONSTRAINT "CrewAssignment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CrewAssignment" ADD CONSTRAINT "CrewAssignment_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "CalendarResource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;