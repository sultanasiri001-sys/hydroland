CREATE TABLE "BookingParticipant" (
  "id" TEXT NOT NULL,
  "bookingId" UUID NOT NULL,
  "accountId" UUID,
  "fullName" TEXT NOT NULL,
  "certificationTitle" TEXT,
  "certificationNumber" TEXT,
  "certificationIssuer" TEXT,
  "eligibilityStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BookingParticipant_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "BookingParticipant_bookingId_eligibilityStatus_idx" ON "BookingParticipant"("bookingId", "eligibilityStatus");
CREATE INDEX "BookingParticipant_accountId_idx" ON "BookingParticipant"("accountId");
ALTER TABLE "BookingParticipant" ADD CONSTRAINT "BookingParticipant_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BookingParticipant" ADD CONSTRAINT "BookingParticipant_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;