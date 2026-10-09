import { ConflictException, Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { MoyasarSettlementProviderService } from '../payments/moyasar-settlement-provider.service';
import { MoyasarPaymentProviderService } from '../payments/moyasar-payment-provider.service';
import { FinanceAccessService } from './finance-access.service';
import { financeKey } from './finance-native-key';

type ProviderLine={payment_id?:unknown;type?:unknown;currency?:unknown;payment_amount?:unknown;amount?:unknown;settlement_amount?:unknown;fee?:unknown;tax?:unknown;transacted_at?:unknown};
type SafeLine={providerPaymentId:string;localPaymentId:string;type:string;currency:string;paymentAmountMinor:number|null;netAmountMinor:number|null;settlementAmountMinor:number|null;feeMinor:number|null;taxMinor:number|null;transactedAt:string|null;amountMatches:boolean};
const isRecord=(value:unknown):value is Record<string,unknown>=>Boolean(value&&typeof value==='object'&&!Array.isArray(value));
const intOrNull=(value:unknown)=>Number.isSafeInteger(value)?value as number:null;

@Injectable()
export class FinanceSettlementService {
  constructor(private readonly db:DatabaseService,private readonly access:FinanceAccessService,private readonly provider:MoyasarSettlementProviderService,private readonly paymentProvider:MoyasarPaymentProviderService){}

  async list(accountId:string,centerId:string){
    await this.db.serializable(async tx=>{
      if(await this.isReviewer(accountId,centerId,tx))return;
      const scope=await this.access.requireBranchAccountant(accountId,centerId,tx);
      await this.access.requireCenterOrganizationAccountant(accountId,scope.organizationId,tx);
    });
    const rows=await this.db.$queryRaw<Array<Record<string,unknown>>>`SELECT "id"::text AS "id","providerSettlementId","currency","grossAmountMinor","feeMinor","taxMinor","matchedLineCount","mismatchedLineCount","lines","status"::text AS "status","submittedAt","reviewedAt","importedByAccountId"::text AS "importedByAccountId" FROM "FinanceSettlementImport" WHERE "centerOrgUnitId"=${financeKey('FinanceSettlementImport','centerOrgUnitId',centerId)} ORDER BY "submittedAt" DESC,"id" DESC LIMIT 25`;
    const reviews=rows.length?await this.db.$queryRaw<Array<Record<string,unknown>>>`SELECT r."importId"::text AS "importId",r."reviewerAccountId"::text AS "reviewerAccountId",r."decision"::text AS "decision",r."note",r."createdAt" FROM "FinanceSettlementReview" r WHERE r."importId" IN (${Prisma.join(rows.map(row=>String(row.id)).map(id=>financeKey('FinanceSettlementReview','importId',id)))}) ORDER BY r."createdAt",r."id"` :[];
    return rows.map(row=>({...row,reviews:reviews.filter(review=>review.importId===row.id)}));
  }

  async syncPaymentReferences(accountId:string,centerId:string){
    const scope=await this.db.serializable(async tx=>{
      const current=await this.access.requireBranchAccountant(accountId,centerId,tx);
      await this.access.requireCenterOrganizationAccountant(accountId,current.organizationId,tx);
      return current;
    });
    const candidates=await this.db.$queryRaw<Array<{id:string;bookingId:string;providerReference:string;amountMinor:number;currency:string}>>`SELECT p."id"::text AS "id",p."bookingId"::text AS "bookingId",p."providerReference",p."amountMinor",p."currency" FROM "Payment" p JOIN "Booking" b ON b."id"=p."bookingId" JOIN "Trip" t ON t."id"=b."tripId" WHERE t."organizationId"=${financeKey('Organization','id',scope.organizationId)} AND p."status"='CAPTURED' AND p."providerReference" IS NOT NULL AND p."moyasarPaymentId" IS NULL ORDER BY p."createdAt",p."id" LIMIT 10`;
    let syncedCount=0,failedCount=0;
    for(let offset=0;offset<candidates.length;offset+=5){
      const batch=candidates.slice(offset,offset+5);
      const results=await Promise.allSettled(batch.map(async payment=>{
        const invoice=await this.paymentProvider.fetchInvoice(payment.providerReference);
        if(invoice.metadata.hydroland_payment_id!==payment.id||invoice.metadata.hydroland_booking_id!==payment.bookingId||invoice.amount!==payment.amountMinor||invoice.currency!==payment.currency||!['paid','captured'].includes(invoice.status))return false;
        const completed=invoice.payments.filter(item=>['paid','captured'].includes(item.status)&&item.amount===payment.amountMinor&&item.currency===payment.currency);
        if(completed.length!==1||!/^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.test(completed[0].id))return false;
        await this.db.$executeRaw`UPDATE "Payment" SET "moyasarPaymentId"=${completed[0].id.toLowerCase()} WHERE "id"::text=${payment.id} AND "providerReference"=${payment.providerReference} AND "moyasarPaymentId" IS NULL`;
        return true;
      }));
      for(const result of results)if(result.status==='fulfilled'&&result.value)syncedCount++;else failedCount++;
    }
    const counts=await this.db.$queryRaw<Array<{remaining:bigint}>>`SELECT COUNT(*)::bigint AS "remaining" FROM "Payment" p JOIN "Booking" b ON b."id"=p."bookingId" JOIN "Trip" t ON t."id"=b."tripId" WHERE t."organizationId"=${financeKey('Organization','id',scope.organizationId)} AND p."status"='CAPTURED' AND p."providerReference" IS NOT NULL AND p."moyasarPaymentId" IS NULL`;
    return{syncedCount,failedCount,remainingCount:Number(counts[0]?.remaining??0),batchSize:10};
  }

  async import(accountId:string,centerId:string,settlementId:string){
    if(typeof settlementId!=='string'||!/^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.test(settlementId.trim()))throw new Error('FINANCE_SETTLEMENT_REFERENCE_INVALID');
    const settlementRef=settlementId.trim().toLowerCase();
    const center=await this.db.serializable(async tx=>{
      const scope=await this.access.requireBranchAccountant(accountId,centerId,tx);
      await this.access.requireCenterOrganizationAccountant(accountId,scope.organizationId,tx);
      return scope;
    });
    const settlement=await this.provider.fetchSettlement(settlementRef);
    if(typeof settlement.id!=='string'||settlement.id.toLowerCase()!==settlementRef)throw new ConflictException('Provider settlement reference mismatch.');
    const rawLines=await this.allLines(settlementRef);
    const providerIds=[...new Set(rawLines.flatMap(row=>typeof row.payment_id==='string'&&/^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.test(row.payment_id)?[row.payment_id]:[]))];
    let payments:Array<{id:string;moyasarPaymentId:string;amountMinor:number;currency:string}>=[];
    if(providerIds.length)payments=await this.db.$queryRaw<Array<{id:string;moyasarPaymentId:string;amountMinor:number;currency:string}>>`SELECT p."id"::text AS "id",p."moyasarPaymentId",p."amountMinor",p."currency" FROM "Payment" p JOIN "Booking" b ON b."id"=p."bookingId" JOIN "Trip" t ON t."id"=b."tripId" WHERE p."moyasarPaymentId"=ANY(${providerIds}::text[]) AND t."organizationId"=${financeKey('Organization','id',center.organizationId)}`;
    const byProviderId=new Map(payments.map(payment=>[payment.moyasarPaymentId,payment]));
    const lines:SafeLine[]=[];
    for(const line of rawLines){
      if(typeof line.payment_id!=='string')continue;
      const payment=byProviderId.get(line.payment_id);
      if(!payment)continue;
      const type=typeof line.type==='string'?line.type.toLowerCase():'other';
      const currency=typeof line.currency==='string'?line.currency.toUpperCase():'';
      const paymentAmountMinor=intOrNull(line.payment_amount);
      const amountMatches=payment.currency===currency&&paymentAmountMinor===payment.amountMinor;
      lines.push({providerPaymentId:line.payment_id,localPaymentId:payment.id,type,currency,paymentAmountMinor,netAmountMinor:intOrNull(line.amount),settlementAmountMinor:intOrNull(line.settlement_amount),feeMinor:intOrNull(line.fee),taxMinor:intOrNull(line.tax),transactedAt:typeof line.transacted_at==='string'&&Number.isFinite(Date.parse(line.transacted_at))?new Date(line.transacted_at).toISOString():null,amountMatches});
    }
    const stableLines=lines.sort((a,b)=>a.providerPaymentId.localeCompare(b.providerPaymentId)||a.type.localeCompare(b.type)||String(a.transactedAt).localeCompare(String(b.transactedAt)));
    const contentHash=createHash('sha256').update(JSON.stringify({settlementId:settlementRef,currency:settlement.currency,lines:stableLines})).digest('hex');
    const matchedGross=stableLines.reduce((sum,line)=>sum+(line.type==='payment'?line.paymentAmountMinor??0:0),0);
    const feeMinor=stableLines.reduce((sum,line)=>sum+(line.feeMinor??0)-(line.taxMinor??0),0);
    const taxMinor=stableLines.reduce((sum,line)=>sum+(line.taxMinor??0),0);
    if(!Number.isSafeInteger(matchedGross)||matchedGross<0||matchedGross>2147483647||![feeMinor,taxMinor].every(value=>Number.isSafeInteger(value)&&Math.abs(value)<=2147483647))throw new Error('FINANCE_AMOUNT_INVALID');
    const existingRows=await this.db.$queryRaw<Array<Record<string,unknown>>>`SELECT "id"::text AS "id","providerSettlementId","status"::text AS "status","matchedLineCount","mismatchedLineCount" FROM "FinanceSettlementImport" WHERE "centerOrgUnitId"=${financeKey('FinanceSettlementImport','centerOrgUnitId',centerId)} AND "providerSettlementId"=${settlementRef} AND "contentHash"=${contentHash} LIMIT 1`;
    const existing=existingRows[0];
    if(existing)return existing;
    try{
      const id=randomUUID(),currency=typeof settlement.currency==='string'?settlement.currency:'SAR',mismatchedLineCount=stableLines.filter(line=>!line.amountMatches).length;
      await this.db.$transaction(async tx=>{
        await tx.$executeRaw`INSERT INTO "FinanceSettlementImport" ("id","centerOrgUnitId","providerSettlementId","contentHash","currency","grossAmountMinor","feeMinor","taxMinor","matchedLineCount","mismatchedLineCount","lines","status","importedByAccountId") VALUES (${financeKey('FinanceSettlementImport','id',id)},${financeKey('FinanceSettlementImport','centerOrgUnitId',centerId)},${settlementRef},${contentHash},${currency},${matchedGross},${feeMinor},${taxMinor},${stableLines.length},${mismatchedLineCount},${JSON.stringify(stableLines)}::jsonb,'SUBMITTED'::"FinanceSettlementImportStatus",${financeKey('FinanceSettlementImport','importedByAccountId',accountId)})`;
        await tx.auditEvent.create({data:{action:'FINANCE_SETTLEMENT_IMPORTED',resource:'FinanceSettlementImport',resourceId:id,metadata:{centerOrgUnitId:centerId,provider:'MOYASAR',providerSettlementId:settlementRef,matchedLineCount:stableLines.length,mismatchedLineCount,contentHash}}});
      });
      return{id,providerSettlementId:settlementRef,currency,grossAmountMinor:matchedGross,feeMinor,taxMinor,matchedLineCount:stableLines.length,mismatchedLineCount,lines:stableLines,status:'SUBMITTED',submittedAt:new Date(),reviewedAt:null,importedByAccountId:accountId};
    }catch(error){
      const databaseError=error&&typeof error==='object'?error as {code?:unknown;meta?:{code?:unknown}}:null;
      if(databaseError&&(databaseError.code==='P2002'||databaseError.meta?.code==='23505')){
        const duplicates=await this.db.$queryRaw<Array<Record<string,unknown>>>`SELECT "id"::text AS "id","providerSettlementId","status"::text AS "status","matchedLineCount","mismatchedLineCount" FROM "FinanceSettlementImport" WHERE "centerOrgUnitId"=${financeKey('FinanceSettlementImport','centerOrgUnitId',centerId)} AND "providerSettlementId"=${settlementRef} AND "contentHash"=${contentHash} LIMIT 1`;
        const duplicate=duplicates[0];
        if(duplicate)return duplicate;
      }
      throw error;
    }
  }

  async review(accountId:string,importId:string,decision:'APPROVED'|'REJECTED',note?:string){
    if(typeof importId!=='string'||!/^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.test(importId))throw new Error('FINANCE_SETTLEMENT_IMPORT_NOT_FOUND');
    if(!['APPROVED','REJECTED'].includes(decision))throw new Error('FINANCE_SETTLEMENT_DECISION_INVALID');
    if(note!=null&&(typeof note!=='string'||note.trim().length>1000))throw new Error('FINANCE_SETTLEMENT_NOTE_INVALID');
    if(decision==='REJECTED'&&(note?.trim().length??0)<10)throw new Error('FINANCE_SETTLEMENT_REJECTION_REASON_REQUIRED');
    return this.db.serializable(async tx=>{
      const rows=await tx.$queryRaw<Array<{id:string;centerOrgUnitId:string;importedByAccountId:string;status:string;mismatchedLineCount:number;matchedLineCount:number}>>`SELECT "id"::text AS "id","centerOrgUnitId"::text AS "centerOrgUnitId","importedByAccountId"::text AS "importedByAccountId","status"::text AS "status","mismatchedLineCount","matchedLineCount" FROM "FinanceSettlementImport" WHERE "id"=${financeKey('FinanceSettlementImport','id',importId)} FOR UPDATE`;
      const row=rows[0];if(!row)throw new Error('FINANCE_SETTLEMENT_IMPORT_NOT_FOUND');
      const centerRows=await tx.$queryRaw<Array<{organizationId:string}>>`SELECT "organizationId"::text AS "organizationId" FROM "OrgUnit" WHERE "id"=${financeKey('OrgUnit','id',row.centerOrgUnitId)} AND "type"='CENTER' AND "active"=TRUE`;
      const organizationId=centerRows[0]?.organizationId;if(!organizationId)throw new Error('FINANCE_SETTLEMENT_REVIEW_DENIED');
      if(!(await this.isReviewer(accountId,row.centerOrgUnitId,tx)))throw new Error('FINANCE_SETTLEMENT_REVIEW_DENIED');
      if(row.importedByAccountId===accountId)throw new Error('FINANCE_SETTLEMENT_REVIEW_SOD_VIOLATION');
      if(row.status!=='SUBMITTED')throw new Error('FINANCE_SETTLEMENT_ALREADY_REVIEWED');
      if(decision==='APPROVED'&&(row.mismatchedLineCount>0||row.matchedLineCount===0))throw new Error('FINANCE_SETTLEMENT_RECONCILIATION_BLOCKED');
      const prior=await tx.$queryRaw<Array<{reviewerAccountId:string;decision:string}>>`SELECT "reviewerAccountId"::text AS "reviewerAccountId","decision"::text AS "decision" FROM "FinanceSettlementReview" WHERE "importId"=${financeKey('FinanceSettlementReview','importId',importId)}`;
      const reviewerAccountIds=prior.filter(x=>x.decision==='APPROVED').map(x=>x.reviewerAccountId);
      if(reviewerAccountIds.includes(accountId))throw new Error('FINANCE_SETTLEMENT_REVIEW_SOD_VIOLATION');
      await tx.$executeRaw`INSERT INTO "FinanceSettlementReview" ("id","importId","reviewerAccountId","decision","note") VALUES (${financeKey('FinanceSettlementReview','id',randomUUID())},${financeKey('FinanceSettlementReview','importId',importId)},${financeKey('FinanceSettlementReview','reviewerAccountId',accountId)},${decision}::"FinancePeriodCloseApprovalDecision",${note?.trim()||null})`;
      const approvals=decision==='APPROVED'?reviewerAccountIds.length+1:0;
      const status=decision==='REJECTED'?'REJECTED':approvals>=2?'APPROVED':'SUBMITTED';
      await tx.$executeRaw`UPDATE "FinanceSettlementImport" SET "status"=${status}::"FinanceSettlementImportStatus","reviewedAt"=${status==='SUBMITTED'?null:new Date()} WHERE "id"=${financeKey('FinanceSettlementImport','id',importId)}`;
      await tx.auditEvent.create({data:{action:`FINANCE_SETTLEMENT_${decision}`,resource:'FinanceSettlementImport',resourceId:importId,metadata:{centerOrgUnitId:row.centerOrgUnitId,approvalCount:approvals,requiredApprovals:2,status,note:note?.trim()??null}}});
      return{importId,status,approvalCount:approvals,requiredApprovals:2};
    });
  }

  private async isReviewer(accountId:string,centerId:string,client:Pick<Prisma.TransactionClient,'$queryRaw'>){
    const rows=await client.$queryRaw<Array<{allowed:boolean}>>`SELECT EXISTS(
      SELECT 1 FROM "OrgUnit" c JOIN "Account" a ON a."id"=${financeKey('Account','id',accountId)} AND a."status"='ACTIVE'
      WHERE c."id"=${financeKey('OrgUnit','id',centerId)} AND c."type"='CENTER' AND c."active"=TRUE AND (
        EXISTS(SELECT 1 FROM "Employment" e JOIN "Position" p ON p."id"=e."positionId" AND p."active"=TRUE WHERE e."accountId"=a."id" AND e."organizationId"=c."organizationId" AND e."orgUnitId"=c."id" AND e."status"='ACTIVE' AND p."code"='CENTER_MANAGER') OR
        EXISTS(SELECT 1 FROM "Employment" e JOIN "Position" p ON p."id"=e."positionId" AND p."active"=TRUE JOIN "OrgUnit" u ON u."id"=e."orgUnitId" WHERE e."accountId"=a."id" AND e."organizationId"=c."organizationId" AND u."type"='HQ' AND e."status"='ACTIVE' AND p."code" IN ('CENTRAL_FINANCE','FINANCE_MANAGER','EXECUTIVE')) OR
        EXISTS(SELECT 1 FROM "RoleAssignment" ra WHERE ra."accountId"=a."id" AND ra."role"='EXECUTIVE_APPROVER' AND ra."status"='ACTIVE' AND (ra."scope" IS NULL OR ra."scope"->>'organizationId'=c."organizationId"::text))
      )
    ) AS "allowed"`;
    return rows[0]?.allowed===true;
  }

  private async allLines(settlementId:string):Promise<ProviderLine[]>{
    const all:ProviderLine[]=[];
    for(let page=1;page<=100;page++){
      const result=await this.provider.listSettlementLines(settlementId,page);
      if(!isRecord(result)||!Array.isArray(result.lines))throw new Error('FINANCE_SETTLEMENT_PROVIDER_RESPONSE_INVALID');
      all.push(...result.lines.filter(isRecord) as ProviderLine[]);
      const meta=isRecord(result.meta)?result.meta:{};
      const next=meta.next_page;
      if(next==null)break;
      if(!Number.isInteger(next)||Number(next)!==page+1)throw new Error('FINANCE_SETTLEMENT_PROVIDER_PAGINATION_INVALID');
      if(page===100)throw new Error('FINANCE_SETTLEMENT_TOO_LARGE');
    }
    return all;
  }
}
