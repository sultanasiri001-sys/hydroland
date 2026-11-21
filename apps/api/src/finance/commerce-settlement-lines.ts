import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

type CommerceType='STORE_ORDER'|'TRAINING_ENROLLMENT'|'EQUIPMENT_RENTAL';
type Refund = { id: string; amountMinor: number; baseline: number; refundedAt: string };
type CommerceMatch = {
  id: string; moyasarPaymentId: string; amountMinor: number; currency: string;
  sourceType: CommerceType; verified: boolean; refundedMinor: number; refunds?: Refund[];
};

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
    SELECT c."id",c."providerPaymentId" AS "moyasarPaymentId",c."amountMinor",c."currency",c."sourceType",e."providerRefundedMinor" AS "refundedMinor",
      COALESCE(c."provider"='MOYASAR' AND ((e."providerRefundedMinor"=0 AND c."status"='CAPTURED')
      OR (e."providerRefundedMinor" BETWEEN 1 AND c."amountMinor" AND c."status"='RECONCILIATION_REQUIRED')) AND c."currency"='SAR'
      AND e."sourceId"=c."sourceId" AND e."sourceType"=c."sourceType" AND e."organizationId"=c."organizationId"
      AND e."customerAccountId"=c."customerAccountId" AND e."provider"=c."provider"
      AND e."providerInvoiceId"=c."providerInvoiceId" AND e."contractSnapshot"=c."contractSnapshot"
      AND e."amountMinor"=c."amountMinor" AND e."currency"=c."currency" AND e."providerCapturedMinor"=c."amountMinor"
      AND e."providerVerifiedAt"<=clock_timestamp()
      AND e."providerSnapshot"->>'id'=c."providerPaymentId" AND e."providerSnapshot"->>'invoiceId'=c."providerInvoiceId"
      AND e."providerSnapshot"->'invoiceMetadata'->>'hydroland_checkout_id'=c.id
      AND e."providerSnapshot"->'invoiceMetadata'->>'hydroland_source_id'=c."sourceId"
      AND e."providerSnapshot"->'invoiceMetadata'->>'hydroland_source_type'=c."sourceType"
      AND e."providerSnapshot"->'invoiceMetadata'->>'hydroland_customer_account_id'=c."customerAccountId"
      AND e."providerSnapshot"->'invoiceMetadata'->>'hydroland_organization_id'=c."organizationId"
      AND c."providerResult"->'payment'->>'id'=c."providerPaymentId"
      AND c."providerResult"->'payment'->>'invoiceId'=c."providerInvoiceId"
      AND c."providerResult"->'payment'->>'currency'=c."currency"
      AND c."providerResult"->'payment'->>'status' IN ('paid','captured','refunded')
      AND c."providerResult"->'payment'->'capturedMinor'=to_jsonb(c."amountMinor")
      AND c."providerResult"->'payment'->'refundedMinor'=to_jsonb(e."providerRefundedMinor")
      AND (e."providerRefundedMinor">0 OR c."providerResult"->'payment'->>'status' IN ('paid','captured'))
      AND e."providerSnapshot"->'refundedMinor'=to_jsonb(e."providerRefundedMinor")
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
  const refunded = rows.filter(row => row.verified && row.refundedMinor > 0);
  if (refunded.length) await attachPostedRefunds(tx, organizationId, refunded);
  return result;
}

/** The two refund journals record the same provider balance, with different source references. */
async function attachPostedRefunds(tx: Prisma.TransactionClient, organizationId: string, products: CommerceMatch[]) {
  const ids = products.map(product => product.id);
  const rows = await tx.$queryRaw<Array<Refund & { checkoutId: string; valid: boolean }>>`
    WITH journal AS (
      SELECT r.id, r."checkoutId", r."amountMinor", r."baselineRefundedMinor" AS baseline,
        r."providerResult"->'payment' AS proof, r."providerPaymentId", r."providerInvoiceId", r."financeEntryId",
        r."requestedByAccountId" AS preparer, r."approvedByAccountId" AS approver, r."executedByAccountId" AS executor,
        r."confirmedAt" AS posted, r."rentalId" AS reference, 'EQUIPMENT_RENTAL_REFUND' AS kind,
        c."sourceType"='EQUIPMENT_RENTAL' AND r."rentalId"=c."sourceId" AND r."currency"=c."currency"
          AND r."collectionEvidenceId"=e.id AND r."resultingRefundedMinor"=r."baselineRefundedMinor"+r."amountMinor"
          AND r."providerResult"->>'source'='REFUND_POST_RESPONSE' AS bound
      FROM "RentalRefundOperation" r JOIN "CommerceCheckout" c ON c.id=r."checkoutId"
        JOIN "CommerceCollectionEvidence" e ON e."providerPaymentId"=c."providerPaymentId"
      WHERE r."checkoutId"=ANY(${ids}::text[]) AND r."status"='SUCCEEDED' AND r."organizationId"=${organizationId}
      UNION ALL
      SELECT r.id,r."checkoutId",r."amountMinor",r."baselineMinor",r."providerResult",r."providerPaymentId",r."providerInvoiceId",
        r."financeEntryId",r."preparerId",r."approverId",r."executorId",r."postedAt",r."claimId",
        CASE c."sourceType" WHEN 'TRAINING_ENROLLMENT' THEN 'COURSE_CANCELLATION_REFUND'
          WHEN 'STORE_ORDER' THEN 'STORE_GOODS_RETURN_REFUND' END,
        r."originalAmountMinor"=c."amountMinor" AND c."sourceType" IN ('TRAINING_ENROLLMENT','STORE_ORDER')
      FROM "CheckoutRefund" r JOIN "CommerceCheckout" c ON c.id=r."checkoutId"
      WHERE r."checkoutId"=ANY(${ids}::text[]) AND r."status"='POSTED' AND r."organizationId"=${organizationId}
    )
    SELECT j.id,j."checkoutId",j."amountMinor",j.baseline,j.proof->>'refundedAt' AS "refundedAt",
      COALESCE(j.bound AND j."amountMinor">0 AND j.posted=f."postedAt" AND j.posted<=clock_timestamp()
        AND c."providerPaymentId"=j."providerPaymentId" AND c."providerInvoiceId"=j."providerInvoiceId"
        AND j.proof->>'id'=j."providerPaymentId" AND j.proof->>'invoiceId'=j."providerInvoiceId"
        AND j.proof->>'currency'=c."currency" AND j.proof->>'status' IN ('paid','captured','refunded')
        AND j.proof->'capturedMinor'=to_jsonb(c."amountMinor") AND j.proof->'amountMinor'=to_jsonb(c."amountMinor")
        AND j.proof->'refundedMinor'=to_jsonb(j.baseline+j."amountMinor")
        AND f."organizationId"::text=c."organizationId" AND f.type='REFUND' AND f.status='POSTED'
        AND f."referenceType"=j.kind AND f."referenceId"::text=j.reference AND f.currency=c.currency
        AND f."amountMinor"=j."amountMinor" AND f."approvedAt"<=f."postedAt" AND a.active
        AND a."organizationId"=f."organizationId" AND a.currency=f.currency
        AND f."requestedByAccountId"::text=j.preparer AND f."approvedByAccountId"::text=j.approver AND f."postedByAccountId"::text=j.executor
        AND j.preparer<>j.approver AND j.preparer<>j.executor AND j.approver<>j.executor
        AND EXISTS (SELECT 1 FROM "FinanceApproval" x WHERE x."financeEntryId"=f.id AND x.status='APPROVED'
          AND x."requestedByAccountId"=f."requestedByAccountId" AND x."decidedByAccountId"=f."approvedByAccountId"
          AND x."decidedAt"=f."approvedAt"),false) AS valid
    FROM journal j JOIN "CommerceCheckout" c ON c.id=j."checkoutId"
      LEFT JOIN "FinanceEntry" f ON f.id::text=j."financeEntryId"::text
      LEFT JOIN "FinanceAccount" a ON a.id=f."financeAccountId"
    ORDER BY j."checkoutId",j.baseline,j.id`;
  const byId = new Map(products.map(product => [product.id, product]));
  const totals = new Map<string, number>();
  for (const row of rows) {
    const product = byId.get(row.checkoutId)!;
    if (!row.valid || !Number.isFinite(Date.parse(row.refundedAt)) || row.baseline !== (totals.get(row.checkoutId) ?? 0)) {
      product.verified = false;
    }
    (product.refunds ??= []).push(row);
    totals.set(row.checkoutId, row.baseline + row.amountMinor);
  }
  for (const product of products) {
    if (totals.get(product.id) !== product.refundedMinor) product.verified = false;
  }
}

export type SettlementAmounts = {
  type: string; paymentAmountMinor: number | null; netAmountMinor: number | null; settlementAmountMinor: number | null;
  feeMinor: number | null; taxMinor: number | null; transactedAt: string | null;
};

export function matchProductLine(product: CommerceMatch, line: SettlementAmounts) {
  const { netAmountMinor: net, settlementAmountMinor: settled, feeMinor: fee, taxMinor: tax } = line;
  if (!product.verified || product.amountMinor !== line.paymentAmountMinor || net === null || settled !== net ||
      fee === null || tax === null || ![net, fee, tax].every(Number.isSafeInteger)) return null;
  // The provider reports fees inclusive of VAT. A refunded fee can have a negative sign.
  if ((fee >= 0 && (tax < 0 || tax > fee)) || (fee < 0 && (tax > 0 || tax < fee))) return null;
  if (line.type === 'payment') return fee >= 0 && net === product.amountMinor - fee ? { key: 'payment' } : null;
  if (line.type !== 'refund' || !line.transactedAt) return null;
  const matches = product.refunds?.filter(refund => -refund.amountMinor === net + fee &&
    Date.parse(refund.refundedAt) === Date.parse(line.transactedAt!));
  return matches?.length === 1 ? { key: matches[0].id } : null;
}
