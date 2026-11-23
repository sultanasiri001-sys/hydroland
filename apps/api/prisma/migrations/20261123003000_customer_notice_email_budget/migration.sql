CREATE TABLE "CustomerNoticeEmailBudget" (
  "month" TEXT PRIMARY KEY,
  "reservedHalalas" INTEGER NOT NULL CHECK ("reservedHalalas" >= 0)
);
