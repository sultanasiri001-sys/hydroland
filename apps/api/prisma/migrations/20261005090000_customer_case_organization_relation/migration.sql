-- AddForeignKey
ALTER TABLE "CustomerCase" ADD CONSTRAINT "CustomerCase_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

