import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

type CommerceType='STORE_ORDER'|'TRAINING_ENROLLMENT'|'EQUIPMENT_RENTAL';
type CommerceMatch={id:string;moyasarPaymentId:string;amountMinor:number;currency:string;sourceType:CommerceType;verified:boolean};

/** Match the provider reference to the same customer, original checkout, collection receipt and independently posted revenue. */
export async function commerceSettlementCandidates(tx:Prisma.TransactionClient,organizationId:string,providerIds:string[]) {
  const result=new Map<string,CommerceMatch>();
  if(!providerIds.length)return result;
  // Finance also runs on pre-commerce schemas. An incomplete commerce installation is an error.
  const [schema]=await tx.$queryRaw<Array<{checkout:boolean;evidence:boolean}>>`
    SELECT to_regclass('"CommerceCheckout"') IS NOT NULL AS checkout,to_regclass('"CommerceCollectionEvidence"') IS NOT NULL AS evidence`;
  if(!schema.checkout&&!schema.evidence)return result;
  if(!schema.checkout||!schema.evidence)throw new ConflictException('Commerce settlement reconciliation requires the complete collection schema.');
  const rows=await tx.$queryRaw<CommerceMatch[]>`
    SELECT c."id",c."providerPaymentId" AS "moyasarPaymentId",c."amountMinor",c."currency",c."sourceType",
      COALESCE(c."provider"='MOYASAR' AND c."status"='CAPTURED' AND c."currency"='SAR'
      AND e."sourceId"=c."sourceId" AND e."sourceType"=c."sourceType" AND e."organizationId"=c."organizationId"
      AND e."customerAccountId"=c."customerAccountId" AND e."provider"=c."provider"
      AND e."providerInvoiceId"=c."providerInvoiceId" AND e."contractSnapshot"=c."contractSnapshot"
      AND e."amountMinor"=c."amountMinor" AND e."currency"=c."currency" AND e."providerCapturedMinor"=c."amountMinor"
      AND e."providerVerifiedAt"<=clock_timestamp() AND e."providerRefundedMinor"=0
      AND e."providerSnapshot"->>'id'=c."providerPaymentId" AND e."providerSnapshot"->>'invoiceId'=c."providerInvoiceId"
      AND e."providerSnapshot"->'invoiceMetadata'->>'hydroland_checkout_id'=c.id
      AND e."providerSnapshot"->'invoiceMetadata'->>'hydroland_source_id'=c."sourceId"
      AND e."providerSnapshot"->'invoiceMetadata'->>'hydroland_source_type'=c."sourceType"
      AND e."providerSnapshot"->'invoiceMetadata'->>'hydroland_customer_account_id'=c."customerAccountId"
      AND e."providerSnapshot"->'invoiceMetadata'->>'hydroland_organization_id'=c."organizationId"
      AND c."providerResult"->'payment'->>'id'=c."providerPaymentId"
      AND c."providerResult"->'payment'->>'invoiceId'=c."providerInvoiceId"
      AND c."providerResult"->'payment'->>'currency'=c."currency"
      AND c."providerResult"->'payment'->>'status' IN ('paid','captured')
      AND c."providerResult"->'payment'->'capturedMinor'=to_jsonb(c."amountMinor")
      AND c."providerResult"->'payment'->'refundedMinor'='0'::jsonb
      AND f."organizationId"::text=c."organizationId" AND f."type"='REVENUE' AND f."status"='POSTED'
      AND f."currency"=c."currency" AND f."amountMinor"=c."amountMinor" AND f."referenceId"::text=c."sourceId"
      AND f."referenceType"=CASE c."sourceType" WHEN 'STORE_ORDER' THEN 'STORE_ORDER_COLLECTION'
        WHEN 'TRAINING_ENROLLMENT' THEN 'TRAINING_ENROLLMENT_COLLECTION' WHEN 'EQUIPMENT_RENTAL' THEN 'EQUIPMENT_RENTAL_COLLECTION' END
      AND fa.active AND fa."organizationId"::text=c."organizationId" AND fa."currency"=c."currency"
      AND f."requestedByAccountId"<>f."approvedByAccountId" AND f."requestedByAccountId"<>f."postedByAccountId"
      AND f."approvedByAccountId"<>f."postedByAccountId" AND f."postedAt">=f."approvedAt" AND f."postedAt"<=clock_timestamp()
      AND EXISTS (SELECT 1 FROM "FinanceApproval" a WHERE a."financeEntryId"=f.id AND a."status"='APPROVED'
        AND a."requestedByAccountId"=f."requestedByAccountId" AND a."decidedByAccountId"=f."approvedByAccountId" AND a."decidedAt"=f."approvedAt")
      AND NOT EXISTS (SELECT 1 FROM "Payment" trip WHERE trip."moyasarPaymentId"=c."providerPaymentId"),false) AS verified
    FROM "CommerceCheckout" c LEFT JOIN "CommerceCollectionEvidence" e ON e."providerPaymentId"=c."providerPaymentId"
    LEFT JOIN "FinanceEntry" f ON f.id::text=e."financeEntryId"::text LEFT JOIN "FinanceAccount" fa ON fa.id=f."financeAccountId"
    WHERE c."organizationId"=${organizationId} AND c."sourceType" IN ('STORE_ORDER','TRAINING_ENROLLMENT','EQUIPMENT_RENTAL')
      AND c."providerPaymentId"=ANY(${providerIds}::text[])`;
  for(const row of rows)result.set(row.moyasarPaymentId,row);
  return result;
}
