CREATE TYPE "EmergencyPhraseStatus" AS ENUM ('DRAFT','REVIEW','APPROVED','RETIRED');
CREATE TABLE "EmergencyPhrase" (
 "id" TEXT NOT NULL,"key" TEXT NOT NULL,"category" TEXT NOT NULL,"sourceArabic" TEXT NOT NULL,
 "status" "EmergencyPhraseStatus" NOT NULL DEFAULT 'DRAFT',"version" INTEGER NOT NULL DEFAULT 1,
 "createdByAccountId" TEXT NOT NULL,"reviewedByAccountId" TEXT,"reviewedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "EmergencyPhrase_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EmergencyPhrase_key_key" ON "EmergencyPhrase"("key");
CREATE INDEX "EmergencyPhrase_category_status_idx" ON "EmergencyPhrase"("category","status");
CREATE TABLE "EmergencyPhraseTranslation" (
 "id" TEXT NOT NULL,"phraseId" TEXT NOT NULL,"languageCode" TEXT NOT NULL,"text" TEXT NOT NULL,
 "createdByAccountId" TEXT NOT NULL,"reviewedByAccountId" TEXT,"reviewedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "EmergencyPhraseTranslation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EmergencyPhraseTranslation_phraseId_languageCode_key" ON "EmergencyPhraseTranslation"("phraseId","languageCode");
CREATE INDEX "EmergencyPhraseTranslation_languageCode_reviewedAt_idx" ON "EmergencyPhraseTranslation"("languageCode","reviewedAt");
ALTER TABLE "EmergencyPhraseTranslation" ADD CONSTRAINT "EmergencyPhraseTranslation_phraseId_fkey" FOREIGN KEY ("phraseId") REFERENCES "EmergencyPhrase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
