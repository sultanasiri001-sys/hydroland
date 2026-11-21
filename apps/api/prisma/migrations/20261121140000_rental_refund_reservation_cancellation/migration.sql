-- Release only an unused reservation; its immutable ledger/key binding remains.
ALTER TABLE "RentalRefundOperation" DROP CONSTRAINT "RentalRefundOperation_status_check";
ALTER TABLE "RentalRefundOperation" ADD CONSTRAINT "RentalRefundOperation_status_check"
 CHECK ("status" IN ('RESERVED','DISPATCHED','RECONCILIATION_REQUIRED','SUCCEEDED','CANCELLED'));
ALTER TABLE "RentalRefundOperation" ADD CONSTRAINT "RentalRefundOperation_cancellation_check"
 CHECK ("status"<>'CANCELLED' OR ("dispatchedAt" IS NULL AND "providerResult" IS NULL
   AND "confirmedAt" IS NULL AND "resultingRefundedMinor" IS NULL));
