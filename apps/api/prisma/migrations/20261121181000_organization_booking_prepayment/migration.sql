-- Each organization's booking can claim at most one hosted payment, regardless of retries or delegate.
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_organization_prepayment_booking_key"
ON "Payment" ("bookingId") WHERE "contractSnapshot" ? 'organizationPaymentAuthorization';
