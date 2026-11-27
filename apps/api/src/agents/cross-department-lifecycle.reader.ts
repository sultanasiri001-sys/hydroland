import { Prisma } from '@prisma/client';

const numbers=(row:Record<string,bigint>)=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key,Number(value)]));

// These projections expose only recorded counts from the caller-owned snapshot.
// A linked record is not a new legal approval, physical inspection, payment or
// proof of every digest. Mutation services retain their stronger source checks.
export async function legalLifecycleCounts(tx:Prisma.TransactionClient,organizationId:string){
  const [row]=await tx.$queryRaw<Array<Record<string,bigint>>>`
    WITH scoped AS (
      SELECT l.*, EXISTS (
        SELECT 1 FROM "ManagedDocument" d
        JOIN "DocumentTemplate" t ON t."id"::text=d."templateId"::text AND t."organizationId"::text=d."organizationId"::text AND t."department"=d."department"
        JOIN "DocumentRevision" r ON r."documentId"::text=d."id"::text AND r."version"=d."version" AND r."contentHash"=d."contentHash" AND r."payload"=d."payload"
        WHERE d."id"::text=l."documentId"::text AND d."organizationId"::text=l."organizationId"::text
          AND d."department"='LEGAL_CONTRACTS_INSURANCE' AND d."status"::text IN ('SIGNED','ARCHIVED')
          AND d."version"=l."documentVersion" AND d."contentHash"=l."state"->'contractSnapshot'->>'contentHash'
          AND d."payload"=l."state"->'contractSnapshot'->'payload'
      ) AS "sourceMatches" FROM "LegalContractLifecycle" l WHERE l."organizationId"::text=${organizationId}
    )
    SELECT COUNT(*) AS "legalContractLifecycles",
      COUNT(*) FILTER (WHERE "state"->>'status'='OPEN') AS "openLegalContractLifecycles",
      COUNT(*) FILTER (WHERE "state"->>'status'='ARCHIVED') AS "archivedLegalContractLifecycles",
      COUNT(*) FILTER (WHERE NOT "sourceMatches") AS "inconsistentLegalContractSources",
      (SELECT COUNT(*) FROM "LegalContractLifecycleEvent" e JOIN scoped l ON l."id"=e."lifecycleId" AND l."organizationId"::text=e."organizationId"::text) AS "legalContractLifecycleEvents",
      (SELECT COUNT(*) FROM "LegalContractSettlementReference" s JOIN scoped l ON l."id"=s."lifecycleId" AND l."organizationId"::text=s."organizationId"::text) AS "legalContractSettlementReferences",
      (SELECT COUNT(*) FROM "LegalContractSettlementReference" s
        JOIN scoped l ON l."id"=s."lifecycleId" AND l."organizationId"::text=s."organizationId"::text AND l."sourceMatches"
        JOIN "FinanceEntry" f ON f."id"::text=s."financeEntryId"::text AND f."organizationId"::text=s."organizationId"::text
        JOIN "FinanceAccount" a ON a."id"::text=f."financeAccountId"::text AND a."organizationId"::text=f."organizationId"::text
        WHERE f."status"::text='POSTED' AND f."postedAt" IS NOT NULL AND f."referenceType"='B06_INSURANCE_CLAIM' AND f."referenceId"=s."claimId"
      ) AS "linkedPostedContractSettlements"
    FROM scoped`;
  return numbers(row);
}

export async function maintenanceLifecycleCounts(tx:Prisma.TransactionClient,organizationId:string){
  const [row]=await tx.$queryRaw<Array<Record<string,bigint>>>`
    WITH scoped AS (
      SELECT w.*, (
        (w."marineAssetId" IS NOT NULL AND EXISTS (
          SELECT 1 FROM "MarineAsset" a JOIN "MarineMaintenanceRecord" m ON m."marineAssetId"::text=a."id"::text
          WHERE a."id"::text=w."marineAssetId"::text AND a."organizationId"::text=w."organizationId"::text AND m."id"::text=w."maintenanceRecordId"::text
        )) OR (w."equipmentResourceId" IS NOT NULL AND EXISTS (
          SELECT 1 FROM "EquipmentBarcode" b JOIN "CalendarResource" r ON r."id"::text=b."resourceId"::text AND r."type"::text='EQUIPMENT'
          WHERE b."resourceId"::text=w."equipmentResourceId"::text AND b."organizationId"::text=w."organizationId"::text
        ))
      ) AS "sourceMatches" FROM "MaintenanceWorkOrder" w WHERE w."organizationId"::text=${organizationId}
    )
    SELECT COUNT(*) AS "maintenanceWorkOrders",
      COUNT(*) FILTER (WHERE "status" NOT IN ('CLOSED','REJECTED')) AS "openMaintenanceWorkOrders",
      COUNT(*) FILTER (WHERE "status"='CLOSED') AS "closedMaintenanceWorkOrders",
      COUNT(*) FILTER (WHERE NOT "sourceMatches") AS "inconsistentMaintenanceSources",
      (SELECT COUNT(*) FROM "MaintenancePreventivePlan" p WHERE p."organizationId"::text=${organizationId}) AS "maintenancePreventivePlans",
      (SELECT COUNT(*) FROM "MaintenanceCommand" c WHERE c."organizationId"::text=${organizationId}) AS "maintenanceCommands",
      (SELECT COUNT(*) FROM "MaintenancePartUsage" u JOIN scoped w ON w."id"=u."workOrderId" AND w."organizationId"::text=u."organizationId"::text) AS "maintenancePartUsageRecords",
      (SELECT COUNT(*) FROM "MaintenancePartUsage" u
        JOIN scoped w ON w."id"=u."workOrderId" AND w."organizationId"::text=u."organizationId"::text AND w."sourceMatches"
        JOIN "WarehouseIssuePosting" i ON i."organizationId"::text=u."organizationId"::text AND i."requestId"=u."issueRequestId"
        JOIN "WarehouseStockLot" l ON l."organizationId"::text=i."organizationId"::text AND l."lotId"=i."lotId"
        JOIN "WarehouseDecisionRequest" d ON d."organizationId"::text=i."organizationId"::text AND d."id"=i."requestId"
        CROSS JOIN LATERAL (SELECT COALESCE(w."metadata"->'partsReconciliation'->u."issueRequestId"->'snapshot',u."snapshot") AS proof) p
        WHERE i."acknowledgedAt" IS NOT NULL AND d."kind"='ISSUE' AND d."finalDecision"='APPROVE' AND d."finalizedAt" IS NOT NULL
          AND d."finalActorId"::text=i."approvedBy"::text AND d."details"->>'lotId'=i."lotId"
          AND d."details"->>'quantity'=i."quantity"::text AND d."details"->>'custodianId'=i."custodianId"::text
          AND p.proof->>'issueRequestId'=i."requestId" AND p.proof->>'lotId'=i."lotId"
          AND p.proof->>'issuedQuantity'=i."quantity"::text AND p.proof->>'unitCostMinor'=l."unitCostMinor"::text
          AND i."returned" BETWEEN 0 AND i."quantity" AND p.proof->>'returnedQuantity'=i."returned"::text
          AND p.proof->>'quantity'=(i."quantity"-i."returned")::text
          AND p.proof->>'totalCostMinor'=((i."quantity"-i."returned")::bigint*l."unitCostMinor")::text
      ) AS "linkedWarehousePartUsages"
    FROM scoped`;
  return numbers(row);
}
