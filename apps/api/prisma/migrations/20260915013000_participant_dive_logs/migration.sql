ALTER TABLE "DiveLog" ADD COLUMN "sourceParticipantId" TEXT;
ALTER TABLE "DiveLog" ALTER COLUMN "accountId" DROP NOT NULL;

DROP INDEX IF EXISTS "DiveLog_accountId_sourceTripId_key";

CREATE UNIQUE INDEX "DiveLog_sourceTripId_sourceParticipantId_key"
ON "DiveLog"("sourceTripId", "sourceParticipantId")
WHERE "sourceParticipantId" IS NOT NULL;

CREATE INDEX "DiveLog_sourceParticipantId_idx"
ON "DiveLog"("sourceParticipantId");

ALTER TABLE "DiveLog"
ADD CONSTRAINT "DiveLog_sourceParticipantId_fkey"
FOREIGN KEY ("sourceParticipantId") REFERENCES "BookingParticipant"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
