import {Injectable} from '@nestjs/common';
import {DatabaseService} from '../database/database.service';

export type FinanceEmploymentScope={accountId:string;organizationId:string;centerOrgUnitId:string;positionCode:string|null};

@Injectable()
export class FinanceAccessService{
  constructor(private readonly db:DatabaseService){}

  async requireBranchAccountant(accountId:string,centerOrgUnitId:string):Promise<FinanceEmploymentScope>{
    if(!accountId||!centerOrgUnitId)throw new Error('FINANCE_ACCESS_IDENTITY_REQUIRED');
    const rows=await this.db.$queryRaw<Array<FinanceEmploymentScope>>`
      SELECT e."accountId",e."organizationId",e."orgUnitId" AS "centerOrgUnitId",p."code" AS "positionCode"
      FROM "Employment" e
      JOIN "OrgUnit" c ON c."id"=e."orgUnitId"
      LEFT JOIN "Position" p ON p."id"=e."positionId"
      WHERE e."accountId"=${accountId}
        AND e."status"='ACTIVE'
        AND c."id"=${centerOrgUnitId}
        AND c."type"='CENTER'
        AND c."active"=TRUE
        AND (p."code" IN ('BRANCH_ACCOUNTANT','CENTER_ACCOUNTANT') OR p."titleEn" ILIKE '%accountant%' OR p."titleAr" LIKE '%محاسب%')
      LIMIT 1`;
    const scope=rows[0];
    if(!scope)throw new Error('FINANCE_BRANCH_ACCOUNTANT_ACCESS_DENIED');
    return scope;
  }
}
