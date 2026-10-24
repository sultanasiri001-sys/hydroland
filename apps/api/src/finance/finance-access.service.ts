import {Injectable} from '@nestjs/common';
import {Prisma} from '@prisma/client';
import {financeKey} from './finance-native-key';
import {DatabaseService} from '../database/database.service';

export type FinanceEmploymentScope={accountId:string;organizationId:string;centerOrgUnitId:string;positionCode:string};

@Injectable()
export class FinanceAccessService{
  constructor(private readonly db:DatabaseService){}

  async requireBranchAccountant(accountId:string,centerOrgUnitId:string,client:Pick<Prisma.TransactionClient,'$queryRaw'>=this.db):Promise<FinanceEmploymentScope>{
    if(!accountId||!centerOrgUnitId)throw new Error('FINANCE_ACCESS_IDENTITY_REQUIRED');
    const rows=await client.$queryRaw<Array<FinanceEmploymentScope>>`
      SELECT e."accountId",e."organizationId",e."orgUnitId" AS "centerOrgUnitId",p."code" AS "positionCode"
      FROM "Employment" e
      JOIN "Account" a ON a."id"=e."accountId"
      JOIN "OrgUnit" c ON c."id"=e."orgUnitId"
      JOIN "Position" p ON p."id"=e."positionId" AND p."orgUnitId"=c."id"
      WHERE e."accountId"=${financeKey('Account','id',accountId)}
        AND a."status"='ACTIVE'
        AND e."status"='ACTIVE'
        AND e."organizationId"=c."organizationId"
        AND c."id"=${financeKey('OrgUnit','id',centerOrgUnitId)}
        AND c."type"='CENTER'
        AND c."active"=TRUE
        AND p."active"=TRUE
        AND p."code" IN ('BRANCH_ACCOUNTANT','CENTER_ACCOUNTANT')
      LIMIT 1 FOR SHARE OF e,a,c,p`;
    const scope=rows[0];
    if(!scope)throw new Error('FINANCE_BRANCH_ACCOUNTANT_ACCESS_DENIED');
    return scope;
  }
  async requireCenterOrganizationAccountant(accountId:string,organizationId:string,client:Pick<Prisma.TransactionClient,'$queryRaw'>=this.db):Promise<FinanceEmploymentScope>{
    const centers=await client.$queryRaw<Array<{id:string}>>`SELECT "id" FROM "OrgUnit" WHERE "organizationId"=${financeKey('Organization','id',organizationId)} AND "type"='CENTER' AND "active"=TRUE ORDER BY "id" LIMIT 2 FOR SHARE`;
    if(centers.length!==1)throw new Error('FINANCE_CENTER_MAPPING_AMBIGUOUS');
    const scope=await this.requireBranchAccountant(accountId,centers[0].id,client);
    if(scope.organizationId!==organizationId)throw new Error('FINANCE_BRANCH_ACCOUNTANT_ACCESS_DENIED');
    return scope;
  }

}
