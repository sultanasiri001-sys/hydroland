-- Defense-in-depth constraints for financial and rewards ledgers.
-- Application logic already enforces these invariants; PostgreSQL now rejects invalid persisted states too.

ALTER TABLE "Wallet"
  ADD CONSTRAINT "Wallet_balanceMinor_nonnegative"
  CHECK ("balanceMinor" >= 0);

ALTER TABLE "WalletEntry"
  ADD CONSTRAINT "WalletEntry_amountMinor_positive"
  CHECK ("amountMinor" > 0),
  ADD CONSTRAINT "WalletEntry_balanceAfterMinor_nonnegative"
  CHECK ("balanceAfterMinor" >= 0);

ALTER TABLE "RewardAccount"
  ADD CONSTRAINT "RewardAccount_points_nonnegative"
  CHECK ("points" >= 0);

ALTER TABLE "RewardEntry"
  ADD CONSTRAINT "RewardEntry_points_positive"
  CHECK ("points" > 0),
  ADD CONSTRAINT "RewardEntry_balanceAfter_nonnegative"
  CHECK ("balanceAfter" >= 0);
