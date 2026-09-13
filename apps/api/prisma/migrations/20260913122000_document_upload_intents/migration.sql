-- CreateEnum
CREATE TYPE "DocumentUploadIntentStatus" AS ENUM ('CREATED', 'UPLOADED', 'SCANNING', 'CLEAN', 'REJECTED', 'EXPIRED', 'CONSUMED');

-- CreateTable
CREATE TABLE "DocumentUploadIntent" (
    "id" UUID NOT NULL,
    "publicId" TEXT NOT NULL,
    "personId" UUID NOT NULL,
    "credentialId" UUID,
    "roleRequestId" UUID,
    "documentType" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "declaredMimeType" TEXT NOT NULL,
    "declaredByteSize" INTEGER NOT NULL,
    "storageObjectKey" TEXT NOT NULL,
    "status" "DocumentUploadIntentStatus" NOT NULL DEFAULT 'CREATED',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "uploadedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "DocumentUploadIntent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentUploadIntent_publicId_key" ON "DocumentUploadIntent"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentUploadIntent_storageObjectKey_key" ON "DocumentUploadIntent"("storageObjectKey");

-- CreateIndex
CREATE INDEX "DocumentUploadIntent_personId_status_expiresAt_idx" ON "DocumentUploadIntent"("personId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "DocumentUploadIntent_credentialId_idx" ON "DocumentUploadIntent"("credentialId");

-- CreateIndex
CREATE INDEX "DocumentUploadIntent_roleRequestId_idx" ON "DocumentUploadIntent"("roleRequestId");

-- AddForeignKey
ALTER TABLE "DocumentUploadIntent" ADD CONSTRAINT "DocumentUploadIntent_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentUploadIntent" ADD CONSTRAINT "DocumentUploadIntent_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "ProfessionalCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentUploadIntent" ADD CONSTRAINT "DocumentUploadIntent_roleRequestId_fkey" FOREIGN KEY ("roleRequestId") REFERENCES "ProfessionalRoleRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
