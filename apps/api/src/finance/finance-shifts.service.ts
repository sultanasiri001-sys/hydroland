import { randomUUID } from 'node:crypto';
import { financeKey } from './finance-native-key';
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { assertCashVariance } from './finance-branch-policy';
import { FinanceAccessService } from './finance-access.service';
import { calculateFinanceShiftTotals } from './finance-shift.domain';

type EntryType='REVENUE'|'EXPENSE'|'REFUND'|'ADJUSTMENT';

@Injectable()
export class FinanceShiftsService {
  constructor(private readonly db:DatabaseService,private readonly access:FinanceAccessService){}

  async openShift(accountantAccountId:string,centerOrgUnitId:string,openingBalanceMinor:number){
    if(!accountantAccountId||!centerOrgUnitId)throw new Error('FINANCE_SHIFT_IDENTITY_REQUIRED');
    if(!Number.isSafeInteger(openingBalanceMinor)||openingBalanceMinor<0)throw new Error('FINANCE_AMOUNT_INVALID');

    return this.db.serializable(async tx=>{
      const scope=await this.access.requireBranchAccountant(accountantAccountId,centerOrgUnitId,tx);
      await this.access.requireCenterOrganizationAccountant(accountantAccountId,scope.organizationId,tx);
      const centers=await tx.$queryRaw<Array<{id:string}>>`SELECT "id" FROM "OrgUnit" WHERE "id"=${financeKey('OrgUnit','id',centerOrgUnitId)} AND "type"='CENTER' AND "active"=TRUE FOR SHARE`;
      if(!centers.length)throw new Error('FINANCE_ACTIVE_CENTER_REQUIRED');
      const active=await tx.$queryRaw<Array<{id:string}>>`SELECT "id" FROM "FinanceAccountantShift" WHERE "centerOrgUnitId"=${financeKey('FinanceAccountantShift','centerOrgUnitId',scope.organizationId)} AND "accountantAccountId"=${financeKey('FinanceAccountantShift','accountantAccountId',accountantAccountId)} AND "status" IN ('OPEN','HANDOVER_PENDING') FOR UPDATE`;
      if(active.length)throw new Error('FINANCE_ACTIVE_SHIFT_EXISTS');
      const rows=await tx.$queryRaw<Array<Record<string,unknown>>>`INSERT INTO "FinanceAccountantShift" ("id","centerOrgUnitId","accountantAccountId","openingBalanceMinor","updatedAt") VALUES (${financeKey('FinanceAccountantShift','id',randomUUID())},${financeKey('FinanceAccountantShift','centerOrgUnitId',scope.organizationId)},${financeKey('FinanceAccountantShift','accountantAccountId',accountantAccountId)},${openingBalanceMinor},NOW()) RETURNING *`;
      return rows[0];
    }).catch(error=>{
      const sqlState=String(error?.meta?.code??'');
      if(sqlState==='23505'&&String(error?.message).includes('FinanceAccountantShift_active_accountant_center_key'))throw new Error('FINANCE_ACTIVE_SHIFT_EXISTS');
      throw error;
    });
  }

  async recordEntry(accountantAccountId:string,shiftId:string,input:{type:EntryType;amountMinor:number;paymentId?:string;referenceType?:string;referenceId?:string;description?:string}){
    if(!Number.isSafeInteger(input.amountMinor)||input.amountMinor<=0)throw new Error('FINANCE_AMOUNT_INVALID');
    if(input.type==='REVENUE'&&!input.paymentId)throw new Error('FINANCE_REVENUE_PAYMENT_REQUIRED');
    const scope=await this.shiftScope(shiftId);

    return this.db.serializable(async tx=>{
      await this.access.requireCenterOrganizationAccountant(accountantAccountId,scope.centerOrgUnitId,tx);
      const shifts=await tx.$queryRaw<Array<{id:string;accountantAccountId:string;status:string}>>`SELECT "id","accountantAccountId","status"::text AS "status" FROM "FinanceAccountantShift" WHERE "id"=${financeKey('FinanceAccountantShift','id',shiftId)} AND "centerOrgUnitId"=${financeKey('FinanceAccountantShift','centerOrgUnitId',scope.centerOrgUnitId)} FOR UPDATE`;
      const shift=shifts[0]; if(!shift)throw new Error('FINANCE_SHIFT_NOT_FOUND');
      if(shift.accountantAccountId!==accountantAccountId)throw new Error('FINANCE_SHIFT_ACCOUNT_ISOLATION_DENIED');
      if(shift.status!=='OPEN')throw new Error('FINANCE_SHIFT_NOT_OPEN');
      if(input.type==='REVENUE'){
        const payments=await tx.$queryRaw<Array<{id:string;amountMinor:number;status:string}>>`SELECT p."id",p."amountMinor",p."status"::text AS "status" FROM "Payment" p JOIN "Booking" b ON b."id"=p."bookingId" JOIN "Trip" t ON t."id"=b."tripId" WHERE p."id"=${financeKey('Payment','id',input.paymentId!)} AND t."organizationId"=${financeKey('Organization','id',scope.centerOrgUnitId)} FOR SHARE OF p,b,t`;
        const payment=payments[0]; if(!payment)throw new Error('FINANCE_PAYMENT_NOT_FOUND');
        if(payment.status!=='CAPTURED')throw new Error('FINANCE_PAYMENT_NOT_SETTLED');
        if(payment.amountMinor!==input.amountMinor)throw new Error('FINANCE_PAYMENT_AMOUNT_MISMATCH');
      }
      const rows=await tx.$queryRaw<Array<Record<string,unknown>>>`INSERT INTO "FinanceShiftEntry" ("id","shiftId","type","amountMinor","paymentId","referenceType","referenceId","description","recordedByAccountId") VALUES (${financeKey('FinanceShiftEntry','id',randomUUID())},${financeKey('FinanceShiftEntry','shiftId',shiftId)},${input.type}::"FinanceEntryType",${input.amountMinor},${financeKey('FinanceShiftEntry','paymentId',input.paymentId??null)},${input.referenceType??null},${financeKey('FinanceShiftEntry','referenceId',input.referenceId??null)},${input.description??null},${financeKey('FinanceShiftEntry','recordedByAccountId',accountantAccountId)}) RETURNING *`;
      return rows[0];
    });
  }

  async requestHandover(accountantAccountId:string,shiftId:string,toAccountantId:string,actualCashMinor:number,varianceReason?:string){
    if(accountantAccountId===toAccountantId)throw new Error('FINANCE_HANDOVER_ACCOUNTANT_INVALID');
    const scope=await this.shiftScope(shiftId);

    return this.db.serializable(async tx=>{
      await this.access.requireCenterOrganizationAccountant(accountantAccountId,scope.centerOrgUnitId,tx);
      await this.access.requireCenterOrganizationAccountant(toAccountantId,scope.centerOrgUnitId,tx);
      const shifts=await tx.$queryRaw<Array<{id:string;centerOrgUnitId:string;accountantAccountId:string;status:string;openingBalanceMinor:number}>>`SELECT "id","centerOrgUnitId","accountantAccountId","status"::text AS "status","openingBalanceMinor" FROM "FinanceAccountantShift" WHERE "id"=${financeKey('FinanceAccountantShift','id',shiftId)} AND "centerOrgUnitId"=${financeKey('FinanceAccountantShift','centerOrgUnitId',scope.centerOrgUnitId)} FOR UPDATE`;
      const from=shifts[0]; if(!from)throw new Error('FINANCE_SHIFT_NOT_FOUND');
      if(from.accountantAccountId!==accountantAccountId)throw new Error('FINANCE_SHIFT_ACCOUNT_ISOLATION_DENIED');
      if(from.status!=='OPEN')throw new Error('FINANCE_SHIFT_NOT_OPEN');
      const entries=await tx.$queryRaw<Array<{type:EntryType;amountMinor:number}>>`SELECT "type"::text AS "type","amountMinor" FROM "FinanceShiftEntry" WHERE "shiftId"=${financeKey('FinanceShiftEntry','shiftId',shiftId)}`;
      const totals=calculateFinanceShiftTotals(from.openingBalanceMinor,entries);
      const variance=assertCashVariance({expectedMinor:totals.expectedCashMinor,actualMinor:actualCashMinor,reason:varianceReason});
      const receivers=await tx.$queryRaw<Array<{id:string;openingBalanceMinor:number}>>`SELECT "id","openingBalanceMinor" FROM "FinanceAccountantShift" WHERE "centerOrgUnitId"=${financeKey('FinanceAccountantShift','centerOrgUnitId',from.centerOrgUnitId)} AND "accountantAccountId"=${financeKey('FinanceAccountantShift','accountantAccountId',toAccountantId)} AND "status"='OPEN' FOR UPDATE`;
      const to=receivers[0]; if(!to)throw new Error('FINANCE_HANDOVER_RECEIVER_SHIFT_REQUIRED');
      const receiverEntries=await tx.$queryRaw<Array<{count:bigint}>>`SELECT COUNT(*)::bigint AS "count" FROM "FinanceShiftEntry" WHERE "shiftId"=${financeKey('FinanceShiftEntry','shiftId',to.id)}`;
      if(to.openingBalanceMinor!==0||Number(receiverEntries[0]?.count??0)!==0)throw new Error('FINANCE_HANDOVER_RECEIVER_SHIFT_NOT_EMPTY');
      await tx.$executeRaw`UPDATE "FinanceAccountantShift" SET "status"='HANDOVER_PENDING',"submittedAt"=NOW(),"updatedAt"=NOW() WHERE "id"=${financeKey('FinanceAccountantShift','id',shiftId)}`;
      const rows=await tx.$queryRaw<Array<Record<string,unknown>>>`INSERT INTO "FinanceShiftHandover" ("id","fromShiftId","toShiftId","fromAccountantId","toAccountantId","expectedCashMinor","actualCashMinor","varianceMinor","varianceReason") VALUES (${financeKey('FinanceShiftHandover','id',randomUUID())},${financeKey('FinanceShiftHandover','fromShiftId',shiftId)},${financeKey('FinanceShiftHandover','toShiftId',to.id)},${financeKey('FinanceShiftHandover','fromAccountantId',accountantAccountId)},${financeKey('FinanceShiftHandover','toAccountantId',toAccountantId)},${totals.expectedCashMinor},${actualCashMinor},${variance},${varianceReason??null}) RETURNING *`;
      return rows[0];
    });
  }

  async acceptHandover(accountantAccountId:string,handoverId:string){
    const scope=await this.handoverScope(handoverId);

    return this.db.serializable(async tx=>{
      await this.access.requireCenterOrganizationAccountant(accountantAccountId,scope.centerOrgUnitId,tx);
      const rows=await tx.$queryRaw<Array<{id:string;fromShiftId:string;toShiftId:string;toAccountantId:string;fromAccountantId:string;actualCashMinor:number;status:string}>>`SELECT "id","fromShiftId","toShiftId","toAccountantId","fromAccountantId","actualCashMinor","status"::text AS "status" FROM "FinanceShiftHandover" WHERE "id"=${financeKey('FinanceShiftHandover','id',handoverId)} FOR UPDATE`;
      const handover=rows[0]; if(!handover)throw new Error('FINANCE_HANDOVER_NOT_FOUND');
      if(handover.toAccountantId!==accountantAccountId)throw new Error('FINANCE_HANDOVER_ACCEPTOR_INVALID');
      if(!Number.isSafeInteger(handover.actualCashMinor)||handover.actualCashMinor<0)throw new Error('FINANCE_HANDOVER_AMOUNT_INVALID');
      if(handover.status!=='PENDING')throw new Error('FINANCE_HANDOVER_NOT_PENDING');
      const receivers=await tx.$queryRaw<Array<{id:string;openingBalanceMinor:number;status:string}>>`SELECT "id","openingBalanceMinor","status"::text AS "status" FROM "FinanceAccountantShift" WHERE "id"=${financeKey('FinanceAccountantShift','id',handover.toShiftId)} AND "accountantAccountId"=${financeKey('FinanceAccountantShift','accountantAccountId',accountantAccountId)} AND "centerOrgUnitId"=${financeKey('FinanceAccountantShift','centerOrgUnitId',scope.centerOrgUnitId)} FOR UPDATE`;
      const receiver=receivers[0]; if(!receiver||receiver.status!=='OPEN')throw new Error('FINANCE_HANDOVER_RECEIVER_SHIFT_INVALID');
      const sources=await tx.$queryRaw<Array<{status:string}>>`SELECT "status"::text AS "status" FROM "FinanceAccountantShift" WHERE "id"=${financeKey('FinanceAccountantShift','id',handover.fromShiftId)} AND "accountantAccountId"=${financeKey('FinanceAccountantShift','accountantAccountId',handover.fromAccountantId)} AND "centerOrgUnitId"=${financeKey('FinanceAccountantShift','centerOrgUnitId',scope.centerOrgUnitId)} FOR UPDATE`;
      if(sources[0]?.status!=='HANDOVER_PENDING')throw new Error('FINANCE_HANDOVER_SOURCE_SHIFT_INVALID');
      const receiverEntries=await tx.$queryRaw<Array<{count:bigint}>>`SELECT COUNT(*)::bigint AS "count" FROM "FinanceShiftEntry" WHERE "shiftId"=${financeKey('FinanceShiftEntry','shiftId',handover.toShiftId)}`;
      if(receiver.openingBalanceMinor!==0||Number(receiverEntries[0]?.count??0)!==0)throw new Error('FINANCE_HANDOVER_RECEIVER_SHIFT_NOT_EMPTY');
      await tx.$executeRaw`UPDATE "FinanceShiftHandover" SET "status"='ACCEPTED',"acceptedAt"=NOW() WHERE "id"=${financeKey('FinanceShiftHandover','id',handoverId)}`;
      await tx.$executeRaw`UPDATE "FinanceAccountantShift" SET "status"='HANDED_OVER',"closedAt"=NOW(),"updatedAt"=NOW() WHERE "id"=${financeKey('FinanceAccountantShift','id',handover.fromShiftId)}`;
      await tx.$executeRaw`UPDATE "FinanceAccountantShift" SET "openingBalanceMinor"=${handover.actualCashMinor},"updatedAt"=NOW() WHERE "id"=${financeKey('FinanceAccountantShift','id',handover.toShiftId)}`;
      return {handoverId,status:'ACCEPTED' as const,openingBalanceMinor:handover.actualCashMinor};
    });
  }

  private async shiftScope(shiftId:string){
    const rows=await this.db.$queryRaw<Array<{centerOrgUnitId:string}>>`SELECT "centerOrgUnitId" FROM "FinanceAccountantShift" WHERE "id"=${financeKey('FinanceAccountantShift','id',shiftId)} LIMIT 1`;
    if(!rows[0])throw new Error('FINANCE_SHIFT_NOT_FOUND');
    return rows[0];
  }

  private async handoverScope(handoverId:string){
    const rows=await this.db.$queryRaw<Array<{centerOrgUnitId:string}>>`SELECT s."centerOrgUnitId" FROM "FinanceShiftHandover" h JOIN "FinanceAccountantShift" s ON s."id"=h."toShiftId" WHERE h."id"=${financeKey('FinanceShiftHandover','id',handoverId)} LIMIT 1`;
    if(!rows[0])throw new Error('FINANCE_HANDOVER_NOT_FOUND');
    return rows[0];
  }
}
