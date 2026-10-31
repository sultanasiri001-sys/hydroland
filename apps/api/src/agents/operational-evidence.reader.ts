import { Prisma } from '@prisma/client';
import { DepartmentCode } from '../governance/department-ownership.domain';

// Only counts of owner-recorded evidence with the same current approved proof
// revision leave this reader. This never reconstructs physical stock balances,
// measured campaign totals, cash reconciliation or operating acceptance.
export async function operationalEvidenceCounts(tx:Prisma.TransactionClient,organizationId:string,department:DepartmentCode){
  const rows=await tx.$queryRaw<Array<{kind:string;count:bigint}>>`
    WITH qualified AS (
      SELECT e.* FROM "OperationalEvidence" e
      JOIN "OperationalEvidenceRevision" history ON history."evidenceId"=e."id" AND history."revision"=e."revision"
        AND (history."snapshot"-ARRAY['occurredAt','recordedAt','createdAt','updatedAt'])=(to_jsonb(e)-ARRAY['occurredAt','recordedAt','createdAt','updatedAt'])
        AND (history."snapshot"->>'occurredAt')::timestamptz=e."occurredAt" AT TIME ZONE 'UTC'
        AND (history."snapshot"->>'recordedAt')::timestamptz=e."recordedAt" AT TIME ZONE 'UTC'
        AND (history."snapshot"->>'createdAt')::timestamptz=e."createdAt" AT TIME ZONE 'UTC'
        AND (history."snapshot"->>'updatedAt')::timestamptz=e."updatedAt" AT TIME ZONE 'UTC'
      JOIN "ManagedDocument" d ON d."id"::text=e."proofDocumentId"::text AND d."organizationId"::text=e."organizationId"::text AND d."department"=e."department"
      JOIN "DocumentTemplate" t ON t."id"::text=d."templateId"::text AND t."organizationId"::text=e."organizationId"::text AND t."department"=e."department"
      JOIN "DocumentRevision" r ON r."documentId"::text=d."id"::text AND r."version"=e."proofVersion" AND r."contentHash"=e."proofContentHash" AND r."payload"=d."payload"
      WHERE e."organizationId"::text=${organizationId} AND e."department"=${department} AND e."status"='RECORDED' AND e."recordedAt" IS NOT NULL
        AND e."occurredAt"<=timezone('UTC',clock_timestamp()) AND d."version"=e."proofVersion" AND d."contentHash"=e."proofContentHash"
        AND d."status"::text IN ('APPROVED','SIGNED') AND d."approvedAt" IS NOT NULL AND d."approvedByAccountId" IS NOT NULL
        AND (d."status"::text<>'SIGNED' OR (d."signedAt" IS NOT NULL AND d."signedByAccountId" IS NOT NULL))
        AND (e."department"<>'INVENTORY_LOGISTICS' OR EXISTS (SELECT 1 FROM "StoreProduct" p WHERE p."id"::text=e."details"->>'productId' AND p."organizationId"::text=e."organizationId"::text AND p."kind"::text='GOODS'))
        AND (e."kind" NOT IN ('WAREHOUSE_BALANCE','WAREHOUSE_MOVEMENT') OR EXISTS (SELECT 1 FROM "WarehouseLocation" l WHERE l."id"=e."details"->>'locationId' AND l."organizationId"::text=e."organizationId"::text))
        AND (e."department"<>'ADMIN_AFFAIRS_RECORDS' OR EXISTS (SELECT 1 FROM "AdministrativeRecord" a JOIN "OrgUnit" u ON u."id"::text=a."unitId"::text WHERE a."id"::text=e."details"->>'recordId' AND a."organizationId"::text=e."organizationId"::text AND u."organizationId"::text=e."organizationId"::text))
        AND (e."department"<>'MARKETING_GROWTH' OR EXISTS (SELECT 1 FROM "MarketingCampaignDraft" c WHERE c."id"=e."details"->>'campaignDraftId' AND c."organizationId"::text=e."organizationId"::text AND (e."kind"<>'CAMPAIGN_PUBLICATION' OR c."channels" @> jsonb_build_array(e."details"->>'channel'))))
    )
    SELECT e."kind",COUNT(*) AS "count" FROM qualified e
    WHERE (e."kind"<>'CAMPAIGN_ANALYTICS' OR EXISTS (SELECT 1 FROM qualified p WHERE p."id"=e."details"->>'publicationEvidenceId' AND p."kind"='CAMPAIGN_PUBLICATION' AND p."details"->>'campaignDraftId'=e."details"->>'campaignDraftId' AND p."occurredAt"<=(e."details"->>'windowStart')::timestamp AND (e."details"->>'windowEnd')::timestamp<=e."occurredAt"))
      AND (e."kind"<>'RECORD_DISPOSAL' OR EXISTS (SELECT 1 FROM qualified h JOIN "ManagedDocument" a ON a."id"::text=e."details"->>'authorizationDocumentId' JOIN "DocumentTemplate" authorization_template ON authorization_template."id"::text=a."templateId"::text WHERE h."id"=e."details"->>'retentionEvidenceId' AND h."kind"='RECORD_RETENTION' AND h."details"->>'recordId'=e."details"->>'recordId' AND h."details"->>'hold'='false' AND (h."details"->>'retainUntil')::timestamp<=e."occurredAt" AND h."occurredAt"<=e."occurredAt" AND NOT EXISTS (SELECT 1 FROM "OperationalEvidence" h2 WHERE h2."organizationId"::text=e."organizationId"::text AND h2."status"='RECORDED' AND h2."kind"='RECORD_RETENTION' AND h2."details"->>'recordId'=h."details"->>'recordId' AND h2."occurredAt"<=e."occurredAt" AND (h2."occurredAt",h2."createdAt",h2."id")>(h."occurredAt",h."createdAt",h."id")) AND a."organizationId"::text=e."organizationId"::text AND authorization_template."organizationId"::text=e."organizationId"::text AND a."department"=e."department" AND authorization_template."department"=e."department" AND a."version"=(e."referenceBindings"->'authorization'->>'version')::int AND a."contentHash"=e."referenceBindings"->'authorization'->>'contentHash' AND EXISTS (SELECT 1 FROM "DocumentRevision" ar WHERE ar."documentId"::text=a."id"::text AND ar."version"=a."version" AND ar."contentHash"=a."contentHash" AND ar."payload"=a."payload") AND a."status"::text IN ('APPROVED','SIGNED') AND a."approvedAt" IS NOT NULL AND a."approvedByAccountId" IS NOT NULL AND (a."status"::text<>'SIGNED' OR (a."signedAt" IS NOT NULL AND a."signedByAccountId" IS NOT NULL))))
    GROUP BY e."kind"`;
  return Object.fromEntries(rows.map(r=>[r.kind,Number(r.count)]));
}

export async function financialCloseCounts(tx:Prisma.TransactionClient,organizationId:string){
  const [row]=await tx.$queryRaw<Array<Record<string,bigint>>>`
    SELECT
      (SELECT COUNT(*) FROM "FinanceSettlementImport" s JOIN "OrgUnit" u ON u."id"::text=s."centerOrgUnitId"::text WHERE u."organizationId"::text=${organizationId}) AS "settlementImports",
      (SELECT COUNT(*) FROM "FinanceSettlementImport" s JOIN "OrgUnit" u ON u."id"::text=s."centerOrgUnitId"::text WHERE u."organizationId"::text=${organizationId} AND s."status"::text='APPROVED' AND s."reviewedAt" IS NOT NULL) AS "approvedSettlementImports",
      (SELECT COUNT(*) FROM "FinanceSettlementImport" s JOIN "OrgUnit" u ON u."id"::text=s."centerOrgUnitId"::text WHERE u."organizationId"::text=${organizationId} AND s."mismatchedLineCount">0) AS "settlementImportsWithMismatches",
      (SELECT COUNT(*) FROM "FinancePeriodCloseSubmission" s JOIN "OrgUnit" u ON u."id"::text=s."centerOrgUnitId"::text WHERE u."organizationId"::text=${organizationId}) AS "periodCloseSubmissions",
      (SELECT COUNT(*) FROM "FinancePeriodCloseSubmission" s JOIN "OrgUnit" u ON u."id"::text=s."centerOrgUnitId"::text WHERE u."organizationId"::text=${organizationId} AND s."status"::text='CLOSED' AND s."closedAt" IS NOT NULL) AS "recordedClosedPeriods",
      (SELECT COUNT(*) FROM "FinanceShiftCloseSubmission" s JOIN "OrgUnit" u ON u."id"::text=s."centerOrgUnitId"::text JOIN "FinanceAccountantShift" f ON f."id"::text=s."shiftId"::text AND f."centerOrgUnitId"::text=u."id"::text WHERE u."organizationId"::text=${organizationId}) AS "shiftCloseSubmissions",
      (SELECT COUNT(*) FROM "FinanceShiftCloseSubmission" s JOIN "OrgUnit" u ON u."id"::text=s."centerOrgUnitId"::text JOIN "FinanceAccountantShift" f ON f."id"::text=s."shiftId"::text AND f."centerOrgUnitId"::text=u."id"::text WHERE u."organizationId"::text=${organizationId} AND s."status"::text='APPROVED' AND s."reviewedAt" IS NOT NULL) AS "approvedShiftCloseSubmissions"`;
  return Object.fromEntries(Object.entries(row).map(([k,v])=>[k,Number(v)]));
}
