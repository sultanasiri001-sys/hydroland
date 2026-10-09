import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { FinanceAccessService } from './finance-access.service';
import { financeKey } from './finance-native-key';
import { calculateFinanceShiftTotals, FinanceEntryType } from './finance-shift.domain';

@Injectable()
export class FinanceWorkspaceService {
  constructor(private readonly db: DatabaseService, private readonly access: FinanceAccessService) {}

  centers(accountId: string) {
    return this.db.$queryRaw<Array<{id:string;name:string;organizationName:string}>>`
      SELECT DISTINCT c."id",c."nameAr" AS "name",o."displayName" AS "organizationName"
      FROM "Employment" e JOIN "Account" a ON a."id"=e."accountId"
      JOIN "OrgUnit" c ON c."id"=e."orgUnitId" AND c."organizationId"=e."organizationId"
      JOIN "Organization" o ON o."id"=c."organizationId"
      JOIN "Position" p ON p."id"=e."positionId" AND p."orgUnitId"=c."id"
      WHERE a."id"=${financeKey('Account','id',accountId)} AND a."status"='ACTIVE'
        AND e."status"='ACTIVE' AND c."type"='CENTER' AND c."active"=TRUE AND p."active"=TRUE
        AND p."code" IN ('BRANCH_ACCOUNTANT','CENTER_ACCOUNTANT') ORDER BY c."nameAr",c."id"`;
  }

  workspace(accountId: string, centerOrgUnitId: string) {
    return this.db.serializable(async tx => {
      const scope=await this.access.requireBranchAccountant(accountId,centerOrgUnitId,tx);
      await this.access.requireCenterOrganizationAccountant(accountId,scope.organizationId,tx);
      const shifts=await tx.$queryRaw<Array<{id:string;status:string;openingBalanceMinor:number;currency:string;openedAt:Date}>>`
        SELECT "id","status"::text,"openingBalanceMinor","currency","openedAt" FROM "FinanceAccountantShift"
        WHERE "centerOrgUnitId"=${financeKey('FinanceAccountantShift','centerOrgUnitId',scope.organizationId)}
          AND "accountantAccountId"=${financeKey('FinanceAccountantShift','accountantAccountId',accountId)}
          AND "status" IN ('OPEN','HANDOVER_PENDING')`;
      const shift=shifts[0]??null;
      const groups=shift?await tx.$queryRaw<Array<{type:FinanceEntryType;amountMinor:bigint}>>`
        SELECT "type"::text,SUM("amountMinor")::bigint AS "amountMinor" FROM "FinanceShiftEntry"
        WHERE "shiftId"=${financeKey('FinanceShiftEntry','shiftId',shift.id)} GROUP BY "type"`:[];
      const totals=shift?calculateFinanceShiftTotals(shift.openingBalanceMinor,groups.map(row=>({...row,amountMinor:Number(row.amountMinor)}))):null;
      if(totals&&Object.values(totals).some(value=>!Number.isSafeInteger(value)))throw new Error('FINANCE_AMOUNT_INVALID');
      const entries=shift?await tx.$queryRaw<Array<{id:string;type:string;amountMinor:number;description:string|null;createdAt:Date}>>`
        SELECT "id","type"::text,"amountMinor","description","createdAt" FROM "FinanceShiftEntry"
        WHERE "shiftId"=${financeKey('FinanceShiftEntry','shiftId',shift.id)} ORDER BY "createdAt" DESC,"id" DESC LIMIT 50`:[];
      // Recipient discovery exposes only names and IDs of eligible, empty shifts in this center.
      const receivers=await tx.$queryRaw<Array<{accountId:string;name:string}>>`
        SELECT DISTINCT a."id" AS "accountId",concat_ws(' ',person."firstName",person."lastName") AS "name"
        FROM "Employment" e JOIN "Account" a ON a."id"=e."accountId"
        JOIN "Person" person ON person."id"=a."personId"
        JOIN "Position" p ON p."id"=e."positionId" AND p."orgUnitId"=e."orgUnitId"
        JOIN "FinanceAccountantShift" s ON s."accountantAccountId"=a."id" AND s."centerOrgUnitId"=e."organizationId"
        WHERE e."orgUnitId"=${financeKey('OrgUnit','id',centerOrgUnitId)} AND e."organizationId"=${financeKey('Organization','id',scope.organizationId)}
          AND a."id"<>${financeKey('Account','id',accountId)} AND a."status"='ACTIVE' AND e."status"='ACTIVE'
          AND p."active"=TRUE AND p."code" IN ('BRANCH_ACCOUNTANT','CENTER_ACCOUNTANT')
          AND s."status"='OPEN' AND s."currency"='SAR' AND s."openingBalanceMinor"=0
          AND NOT EXISTS(SELECT 1 FROM "FinanceShiftEntry" x WHERE x."shiftId"=s."id")
          AND NOT EXISTS(SELECT 1 FROM "FinanceShiftHandover" h WHERE h."toShiftId"=s."id" AND h."status"='PENDING')
        ORDER BY "name",a."id"`;
      const handovers=await tx.$queryRaw<Array<{id:string;direction:string;counterpartyName:string;expectedCashMinor:number;actualCashMinor:number|null;varianceMinor:number|null;varianceReason:string|null}>>`
        SELECT h."id",CASE WHEN h."toAccountantId"=${financeKey('Account','id',accountId)} THEN 'INCOMING' ELSE 'OUTGOING' END AS "direction",
          concat_ws(' ',person."firstName",person."lastName") AS "counterpartyName",
          h."expectedCashMinor",h."actualCashMinor",h."varianceMinor",h."varianceReason"
        FROM "FinanceShiftHandover" h
        JOIN "FinanceAccountantShift" source ON source."id"=h."fromShiftId" AND source."accountantAccountId"=h."fromAccountantId"
        JOIN "FinanceAccountantShift" receiver ON receiver."id"=h."toShiftId" AND receiver."accountantAccountId"=h."toAccountantId" AND receiver."centerOrgUnitId"=source."centerOrgUnitId"
        JOIN "Account" other ON other."id"=CASE WHEN h."toAccountantId"=${financeKey('Account','id',accountId)} THEN h."fromAccountantId" ELSE h."toAccountantId" END
        JOIN "Person" person ON person."id"=other."personId"
        WHERE source."centerOrgUnitId"=${financeKey('FinanceAccountantShift','centerOrgUnitId',scope.organizationId)} AND h."status"='PENDING'
          AND source."status"='HANDOVER_PENDING' AND receiver."status"='OPEN'
          AND (h."fromAccountantId"=${financeKey('Account','id',accountId)} OR h."toAccountantId"=${financeKey('Account','id',accountId)})
        ORDER BY h."createdAt",h."id"`;
      return {centerOrgUnitId,shift,totals,entries,entryLimit:50,receivers,handovers};
    });
  }
}
