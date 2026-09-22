ALTER TABLE "DiveLog" ADD COLUMN "sourceTripId" TEXT;

CREATE UNIQUE INDEX "DiveLog_accountId_sourceTripId_key"
ON "DiveLog"("accountId", "sourceTripId");

CREATE INDEX "DiveLog_sourceTripId_idx"
ON "DiveLog"("sourceTripId");

ALTER TABLE "DiveLog"
ADD CONSTRAINT "DiveLog_sourceTripId_fkey"
FOREIGN KEY ("sourceTripId") REFERENCES "Trip"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
