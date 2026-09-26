import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';

export type PolicyState = 'ENABLED' | 'DISABLED' | 'REVIEW';
export type PolicyRule = {
  id:string;
  category:string;
  ruleKey:string;
  labelAr:string;
  labelEn:string|null;
  state:PolicyState;
  description:string|null;
  metadata:unknown;
  updatedByAccountId:string|null;
  createdAt:Date;
  updatedAt:Date;
};

@Injectable()
export class PolicyControlService {
  constructor(private readonly db:DatabaseService,private readonly audit:AuditService) {}

  list(category?:string){
    const normalized=category?.trim().toUpperCase();
    return this.db.$queryRawUnsafe<PolicyRule[]>(
      `SELECT * FROM "PolicyControl" ${normalized?'WHERE "category"=$1':''} ORDER BY "category","labelAr"`,
      ...(normalized?[normalized]:[]),
    );
  }

  async get(category:string,ruleKey:string):Promise<PolicyRule>{
    const rows=await this.db.$queryRaw<PolicyRule[]>`
      SELECT * FROM "PolicyControl"
      WHERE "category"=${category.toUpperCase()} AND "ruleKey"=${ruleKey.toUpperCase()}
      LIMIT 1
    `;
    if(!rows[0])throw new NotFoundException('Policy rule not found.');
    return rows[0];
  }

  async state(category:string,ruleKey:string,fallback:PolicyState='ENABLED'):Promise<PolicyState>{
    const rows=await this.db.$queryRaw<Array<{state:string}>>`
      SELECT "state" FROM "PolicyControl"
      WHERE "category"=${category.toUpperCase()} AND "ruleKey"=${ruleKey.toUpperCase()}
      LIMIT 1
    `;
    const value=rows[0]?.state;
    return value==='DISABLED'||value==='REVIEW'||value==='ENABLED'?value:fallback;
  }

  async setState(accountId:string,category:string,ruleKey:string,state:PolicyState,reason?:string){
    if(!['ENABLED','DISABLED','REVIEW'].includes(state))throw new BadRequestException('Invalid policy state.');
    const current=await this.get(category,ruleKey);
    const rows=await this.db.$queryRaw<PolicyRule[]>`
      UPDATE "PolicyControl"
      SET "state"=${state},
          "updatedByAccountId"=(SELECT a."id" FROM "Account" a WHERE a."id"::text=${accountId} LIMIT 1),
          "updatedAt"=NOW()
      WHERE "id"::text=${current.id}
      RETURNING *
    `;
    await this.audit.record({action:'POLICY_STATE_CHANGED',resource:'PolicyControl',resourceId:current.id,metadata:{accountId,category:current.category,ruleKey:current.ruleKey,previousState:current.state,state,reason:reason?.trim()||null}});
    return rows[0];
  }

  async upsert(accountId:string,input:{category?:string;ruleKey?:string;labelAr?:string;labelEn?:string|null;description?:string|null;state?:PolicyState}){
    const category=input.category?.trim().toUpperCase(),ruleKey=input.ruleKey?.trim().toUpperCase(),labelAr=input.labelAr?.trim();
    if(!category||!ruleKey||!labelAr)throw new BadRequestException('category, ruleKey and labelAr are required.');
    const state=input.state??'REVIEW';
    if(!['ENABLED','DISABLED','REVIEW'].includes(state))throw new BadRequestException('Invalid policy state.');
    const rows=await this.db.$queryRaw<PolicyRule[]>`
      INSERT INTO "PolicyControl"("id","category","ruleKey","labelAr","labelEn","state","description","updatedByAccountId","createdAt","updatedAt")
      VALUES(
        gen_random_uuid()::text,
        ${category},
        ${ruleKey},
        ${labelAr},
        ${input.labelEn?.trim()||null},
        ${state},
        ${input.description?.trim()||null},
        (SELECT a."id" FROM "Account" a WHERE a."id"::text=${accountId} LIMIT 1),
        NOW(),
        NOW()
      )
      ON CONFLICT("category","ruleKey") DO UPDATE SET
        "labelAr"=EXCLUDED."labelAr",
        "labelEn"=EXCLUDED."labelEn",
        "description"=EXCLUDED."description",
        "state"=EXCLUDED."state",
        "updatedByAccountId"=EXCLUDED."updatedByAccountId",
        "updatedAt"=NOW()
      RETURNING *
    `;
    await this.audit.record({action:'POLICY_RULE_UPSERTED',resource:'PolicyControl',resourceId:rows[0].id,metadata:{accountId,category,ruleKey,state}});
    return rows[0];
  }

  async decision(category:string,ruleKey:string){
    const state=await this.state(category,ruleKey);
    return {state,enforce:state==='ENABLED',review:state==='REVIEW',bypass:state==='DISABLED'};
  }
}
