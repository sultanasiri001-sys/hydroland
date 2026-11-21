import { Prisma } from '@prisma/client';

export type InvoiceKey = { sourceType: string; sourceId: string };
export type InvoiceRow = InvoiceKey & {
  amountMinor: number; currency: string; occurredAt: Date; sellerId: string | null; sellerName: string | null;
  buyerOrganizationId: string | null; isPurchase: boolean; isSale: boolean; canAttach: boolean; number: string | null; nativeStatus: string | null; hasDocument: boolean;
};

// Keep the original payment/order as identity even if finance reconciles it later.
// An old basket with unknown or mixed suppliers belongs only to the buyer.
export function invoiceRegister(accountId: string, key?: InvoiceKey) {
  return Prisma.sql`
    WITH managed AS (
      SELECT DISTINCT o.id::text AS id FROM "Organization" o
      JOIN "OrganizationMember" m ON m."organizationId"=o.id
      WHERE o.status='ACTIVE' AND m."accountId"::text=${accountId} AND m.status='ACTIVE'
        AND (m.role='ADMIN' OR (m.role='OWNER' AND o."ownerId"=m."accountId"))
        AND EXISTS (SELECT 1 FROM "RoleAssignment" a WHERE a."accountId"=m."accountId" AND a.status='ACTIVE'
          AND a.role::text=CASE WHEN o.kind='MARINE_OPERATOR' THEN 'BOAT_OWNER'
            WHEN o.kind ILIKE '%DIVE%' OR o.kind ILIKE '%CENTER%' THEN 'DIVE_CENTER' ELSE 'ORGANIZATION' END)
      UNION
      SELECT o.id::text FROM "Employment" e
      JOIN "Organization" o ON o.id=e."organizationId" AND o.status='ACTIVE'
      JOIN "OrgUnit" u ON u.id=e."orgUnitId" AND u."organizationId"=o.id AND u.type='CENTER' AND u.active
      JOIN "Position" p ON p.id=e."positionId" AND p."orgUnitId"=u.id AND p.active
      WHERE e."accountId"::text=${accountId} AND e.status='ACTIVE' AND p.code IN ('BRANCH_ACCOUNTANT','CENTER_ACCOUNTANT')
        AND NOT EXISTS (SELECT 1 FROM "OrgUnit" u2 WHERE u2."organizationId"=o.id AND u2.type='CENTER' AND u2.active AND u2.id<>u.id)
    ), sources AS (
      SELECT e."sourceType", e."sourceId"::text, e."organizationId"::text AS seller, e."customerAccountId"::text AS buyer,
        NULL::text AS buyer_org, e."amountMinor", e.currency, e."createdAt" AS occurred, NULL::text AS num, NULL::text AS native
      FROM "CommerceCollectionEvidence" e
      WHERE e."sourceType" IN ('TRAINING_ENROLLMENT','EQUIPMENT_RENTAL','RENTAL_DAMAGE')
      UNION ALL
      SELECT 'TRIP_PAYMENT', p.id::text,
        COALESCE(e."organizationId"::text,i."contractSnapshot"#>>'{issuer,organizationId}',p."contractSnapshot"#>>'{issuer,organizationId}'),
        p."accountId"::text, COALESCE(p."contractSnapshot"#>>'{organizationPaymentAuthorization,buyerOrganizationId}',p."contractSnapshot"->>'buyerOrganizationId',b."organizationId"::text),
        p."amountMinor",p.currency,p."createdAt",i.number,i.status::text
      FROM "Payment" p JOIN "Booking" b ON b.id=p."bookingId"
      LEFT JOIN "Invoice" i ON i."paymentId"=p.id
      LEFT JOIN "CommerceCollectionEvidence" e ON e."sourceType"='ORGANIZATION_BOOKING_PREPAYMENT'
        AND e."sourceId"::text=b.id::text AND e."providerSnapshot"->>'paymentId'=p.id::text
      WHERE i.id IS NOT NULL OR e.id IS NOT NULL OR p.status IN ('CAPTURED','REFUNDED')
      UNION ALL
      SELECT 'STORE_ORDER', o.id::text,COALESCE(e."organizationId"::text,lines.seller),o."accountId"::text,NULL::text,
        o."totalMinor",o.currency,o."createdAt",i.number,i.status::text
      FROM "StoreOrder" o LEFT JOIN "StorePayment" p ON p."orderId"=o.id
      LEFT JOIN "StoreInvoice" i ON i."paymentId"=p.id
      LEFT JOIN "CommerceCollectionEvidence" e ON e."sourceType"='STORE_ORDER' AND e."sourceId"::text=o.id::text
      LEFT JOIN LATERAL (
        SELECT CASE WHEN COUNT(*)=COUNT(NULLIF(item."contractSnapshot"#>>'{issuer,organizationId}',''))
          AND COUNT(DISTINCT item."contractSnapshot"#>>'{issuer,organizationId}')=1
          THEN MIN(item."contractSnapshot"#>>'{issuer,organizationId}') END AS seller
        FROM "StoreOrderItem" item WHERE item."orderId"=o.id
      ) lines ON e.id IS NULL
      WHERE i.id IS NOT NULL OR e.id IS NOT NULL OR p.status IN ('CAPTURED','REFUNDED')
      UNION ALL
      SELECT 'INSTRUCTOR_SERVICE', earning.id::text, 'instructor:' || earning."instructorAccountId"::text, NULL::text,
        earning."centerOrganizationId"::text,earning."amountMinor",earning.currency,earning."createdAt",NULL::text,
        CASE WHEN earning.status='VOIDED' THEN 'VOID' END
      FROM "InstructorEarning" earning
      LEFT JOIN "AccountInvoiceDocument" original ON original."sourceType"='INSTRUCTOR_SERVICE'
        AND original."sourceId"=earning.id::text AND original."sellerId"='instructor:' || earning."instructorAccountId"::text
        AND original."buyerOrganizationId"=earning."centerOrganizationId"::text
      WHERE earning."centerOrganizationId" IS NOT NULL AND (original."sourceId" IS NOT NULL OR (
        earning.status IN ('APPROVED','SETTLED') AND earning."approvedAt" IS NOT NULL
        AND earning."approvedByAccountId"::text<>earning."instructorAccountId"::text AND earning."amountMinor">0
        AND (SELECT agreement.mode FROM "InstructorCompensationAgreement" agreement
          WHERE agreement."organizationId"::text=earning."centerOrganizationId"::text
          AND agreement."instructorAccountId"::text=earning."instructorAccountId"::text
          AND agreement."recordedAt"<=earning."createdAt" ORDER BY agreement.revision DESC LIMIT 1)
          IN ('FIXED','PERCENTAGE','FIXED_PLUS_PERCENTAGE')
        AND (SELECT BOOL_AND(e."workerClass" IN ('INDEPENDENT_PROFESSIONAL','CONTRACTOR'))
          FROM "Employment" e WHERE e."organizationId"::text=earning."centerOrganizationId"::text
          AND e."accountId"::text=earning."instructorAccountId"::text AND e.status IN ('ACTIVE','ON_LEAVE','TERMINATED','OFFBOARDED')
          AND COALESCE(e."startsAt",e."createdAt")<=earning."createdAt"
          AND (e."endsAt">=earning."createdAt" OR (e."endsAt" IS NULL AND e.status IN ('ACTIVE','ON_LEAVE'))))
      ))
    ), parties AS (
      SELECT s.*, ((s.buyer_org IS NULL AND s.buyer=${accountId}) OR mb.id IS NOT NULL) AS purchase, (ms.id IS NOT NULL OR COALESCE(s.seller='instructor:' || ${accountId},FALSE)) AS sale,
        (ms.id IS NOT NULL OR (COALESCE(s.seller='instructor:' || ${accountId},FALSE) AND EXISTS (
          SELECT 1 FROM "RoleAssignment" a WHERE a."accountId"::text=${accountId} AND a.role='INSTRUCTOR' AND a.status='ACTIVE'))) AS attach
      FROM sources s LEFT JOIN managed mb ON mb.id=s.buyer_org LEFT JOIN managed ms ON ms.id=s.seller
      ${key ? Prisma.sql`WHERE s."sourceType"=${key.sourceType} AND s."sourceId"=${key.sourceId}` : Prisma.empty}
    )
    SELECT s."sourceType",s."sourceId",s."amountMinor",s.currency,s.occurred AS "occurredAt",s.seller AS "sellerId",
      COALESCE(o."displayName",NULLIF(concat_ws(' ',person."firstName",person."lastName"),'')) AS "sellerName",
      s.buyer_org AS "buyerOrganizationId",s.purchase AS "isPurchase",s.sale AS "isSale",s.attach AS "canAttach",s.native AS "nativeStatus",
      COALESCE(d.number,CASE WHEN s.native IN ('ISSUED','PAID','VOID') THEN s.num END) AS number,
      d."sourceId" IS NOT NULL AS "hasDocument"
    FROM parties s LEFT JOIN "Organization" o ON o.id::text=s.seller
    LEFT JOIN "Account" instructor ON s."sourceType"='INSTRUCTOR_SERVICE' AND s.seller='instructor:' || instructor.id::text
    LEFT JOIN "Person" person ON person.id=instructor."personId"
    LEFT JOIN "AccountInvoiceDocument" d ON d."sourceType"=s."sourceType" AND d."sourceId"=s."sourceId" AND d."sellerId"=s.seller
      AND d."buyerOrganizationId" IS NOT DISTINCT FROM s.buyer_org
    WHERE (s.purchase OR s.sale)`;
}
