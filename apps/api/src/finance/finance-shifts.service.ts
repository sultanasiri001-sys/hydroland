import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { assertCashVariance } from './finance-branch-policy';
import { calculateFinanceShiftTotals } from './finance-shift.domain';

type EntryType='REVENUE'|'EXPENSE'|'REFUND'|'ADJUSTMENT';

@Injectable()
export class FinanceShiftsService {
  constructor(private readonly db:DatabaseService){}

  async openShift(accountantAccountId:string,centerOrgUnitId:string,openingBalanceMinor:number){
    if(!accountantAccountId||!centerOrgUnitId)throw new Error('FINANCE_SHIFT_IDENTITY_REQUIRED');
    if(!Number.isSafeInteger(openingBalanceMinor)||openingBalanceMinor<0)throw new Error('FINANCE_AMOUNT_INVALID');
    return this.db.serializable(async tx=>{
      const centers=await tx.$queryRaw<Array<{id:string}>>`SELECT "id" FROM "OrgUnit" WHERE "id"=${centerOrgUnitId} AND "type"='CENTER' AND "active"=TRUE FOR SHARE`;
      if(!centers.length)throw new Error('FINANCE_ACTIVE_CENTER_REQUIRED');
      const active=await tx.$queryRaw<Array<{id:string}>>`SELECT "id" FROM "FinanceAccountantShift" WHERE "centerOrgUnitId"=${centerOrgUnitId} AND "accountantAccountId"=${accountantAccountId} AND "status" IN ('OPEN','HANDOVER_PENDING') FOR UPDATE`;
      if(active.length)throw new Error('FINANCE_ACTIVE_SHIFT_EXISTS');
      const rows=await tx.$queryRaw<Array<Record<string,unknown>>>`INSERT INTO "FinanceAccountantShift" ("id","centerOrgUnitId","accountantAccountId","openingBalanceMinor","updatedAt") VALUES (gen_random_uuid()::text,${centerOrgUnitId},${accountantAccountId},${openingBalanceMinor},NOW()) RETURNING *`;
      return rows[0];
    });
  }

  async recordEntry(accountantAccountId:string,shiftId:string,input:{type:EntryType;amountMinor:number;paymentId?:string;referenceType?:string;referenceId?:string;description?:string}){
    if(!Number.isSafeInteger(input.amountMinor)||input.amountMinor<=0)throw new Error('FINANCE_AMOUNT_INVALID');
    if(input.type==='REVENUE'&&!input.paymentId)throw new Error('FINANCE_REVENUE_PAYMENT_REQUIRED');
    return this.db.serializable(async tx=>{
      const shifts=await tx.$queryRaw<Array<{id:string;accountantAccountId:string;status:string}>>`SELECT "id","accountantAccountId","status"::text AS "status" FROM "FinanceAccountantShift" WHERE "id"=${shiftId} FOR UPDATE`;
      const shift=shifts[0]; if(!shift)throw new Error('FINANCE_SHIFT_NOT_FOUND');
      if(shift.accountantAccountId!==accountantAccountId)throw new Error('FINANCE_SHIFT_ACCOUNT_ISOLATION_DENIED');
      if(shift.status!=='OPEN')throw new Error('FINANCE_SHIFT_NOT_OPEN');
      if(input.type==='REVENUE'){
        const payments=await tx.$queryRaw<Array<{id:string;amountMinor:number;status:string}>>`SELECT "id","amountMinor","status"::text AS "status" FROM "Payment" WHERE "id"=${input.paymentId!} FOR SHARE`;
        const payment=payments[0]; if(!payment)throw new Error('FINANCE_PAYMENT_NOT_FOUND');
        if(!['CAPTURED','REFUNDED'].includes(payment.status))throw new Error('FINANCE_PAYMENT_NOT_SETTLED');
        if(payment.amountMinor!==input.amountMinor)throw new Error('FINANCE_PAYMENT_AMOUNT_MISMATCH');
      }
      const rows=await tx.$queryRaw<Array<Record<string,unknown>>>`INSERT INTO "FinanceShiftEntry" ("id","shiftId","type","amountMinor","paymentId","referenceType","referenceId","description","recordedByAccountId") VALUES (gen_random_uuid()::text,${shiftId},${input.type}::"FinanceEntryType",${input.amountMinor},${input.paymentId??null},${input.referenceType??null},${input.referenceId??null},${input.description??null},${accountantAccountId}) RETURNING *`;
      return rows[0];
    });
  }

  async requestHandover(accountantAccountId:string,shiftId:string,toAccountantId:string,actualCashMinor:number,varianceReason?:string){
    if(accountantAccountId===toAccountantId)throw new Error('FINANCE_HANDOVER_ACCOUNTANT_INVALID');
    return this.db.serializable(async tx=>{
      const shifts=await tx.$queryRaw<Array<{id:string;centerOrgUnitId:string;accountantAccountId:string;status:string;openingBalanceMinor:number}>>`SELECT "id","centerOrgUnitId","accountantAccountId","status"::text AS "status","openingBalanceMinor" FROM "FinanceAccountantShift" WHERE "id"=${shiftId} FOR UPDATE`;
      const from=shifts[0]; if(!from)throw new Error('FINANCE_SHIFT_NOT_FOUND');
      if(from.accountantAccountId!==accountantAccountId)throw new Error('FINANCE_SHIFT_ACCOUNT_ISOLATION_DENIED');
      if(from.status!=='OPEN')throw new Error('FINANCE_SHIFT_NOT_OPEN');
      const entries=await tx.$queryRaw<Array<{type:EntryType;amountMinor:number}>>`SELECT "type"::text AS "type","amountMinor" FROM "FinanceShiftEntry" WHERE "shiftId"=${shiftId}`;
      const totals=calculateFinanceShiftTotals(from.openingBalanceMinor,entries);
      const variance=assertCashVariance({expectedMinor:totals.expectedCashMinor,actualMinor:actualCashMinor,reason:varianceReason});
      const receivers=await tx.$queryRaw<Array<{id:string;openingBalanceMinor:number}>>`SELECT "id","openingBalanceMinor" FROM "FinanceAccountantShift" WHERE "centerOrgUnitId"=${from.centerOrgUnitId} AND "accountantAccountId"=${toAccountantId} AND "status"='OPEN' FOR UPDATE`;
      const to=receivers[0]; if(!to)throw new Error('FINANCE_HANDOVER_RECEIVER_SHIFT_REQUIRED');
      const receiverEntries=await tx.$queryRaw<Array<{count:bigint}>>`SELECT COUNT(*)::bigint AS "count" FROM "FinanceShiftEntry" WHERE "shiftId"=${to.id}`;
      if(to.openingBalanceMinor!==0||Number(receiverEntries[0]?.count??0)!==0)throw new Error('FINANCE_HANDOVER_RECEIVER_SHIFT_NOT_EMPTY');
      await tx.$executeRaw`UPDATE "FinanceAccountantShift" SET "status"='HANDOVER_PENDING',"submittedAt"=NOW(),"updatedAt"=NOW() WHERE "id"=${shiftId}`;
      const rows=await tx.$queryRaw<Array<Record<string,unknown>>>`INSERT INTO "FinanceShiftHandover" ("id","fromShiftId","toShiftId","fromAccountantId","toAccountantId","expectedCashMinor","actualCashMinor","varianceMinor","varianceReason") VALUES (gen_random_uuid()::text,${shiftId},${to.id},${accountantAccountId},${toAccountantId},${totals.expectedCashMinor},${actualCashMinor},${variance},${varianceReason??null}) RETURNING *`;
      return rows[0];
    });
  }

  async acceptHandover(accountantAccountId:string,handoverId:string){
    return this.db.serializable(async tx=>{
      const rows=await tx.$queryRaw<Array<{id:string;fromShiftId:string;toShiftId:string;toAccountantId:string;actualCashMinor:number;status:string}>>`SELECT "id","fromShiftId","toShiftId","toAccountantId","actualCashMinor","status"::text AS "status" FROM "FinanceShiftHandover" WHERE "id"=${handoverId} FOR UPDATE`;
      const handover=rows[0]; if(!handover)throw new Error('FINANCE_HANDOVER_NOT_FOUND');
      if(handover.toAccountantId!==accountantAccountId)throw new Error('FINANCE_HANDOVER_ACCEPTOR_INVALID');
      if(handover.status!=='PENDING')throw new Error('FINANCE_HANDOVER_NOT_PENDING');
      const receivers=await tx.$queryRaw<Array<{id:string;openingBalanceMinor:number;status:string}>>`SELECT "id","openingBalanceMinor","status"::text AS "status" FROM "FinanceAccountantShift" WHERE "id"=${handover.toShiftId} AND "accountantAccountId"=${accountantAccountId} FOR UPDATE`;
      const receiver=receivers[0]; if(!receiver||receiver.status!=='OPEN')throw new Error('FINANCE_HANDOVER_RECEIVER_SHIFT_INVALID');
      const receiverEntries=await tx.$queryRaw<Array<{count:bigint}>>`SELECT COUNT(*)::bigint AS "count" FROM "FinanceShiftEntry" WHERE "shiftId"=${handover.toShiftId}`;
      if(receiver.openingBalanceMinor!==0||Number(receiverEntries[0]?.count??0)!==0)throw new Error('FINANCE_HANDOVER_RECEIVER_SHIFT_NOT_EMPTY');
      await tx.$executeRaw`UPDATE "FinanceShiftHandover" SET "status"='ACCEPTED',"acceptedAt"=NOW() WHERE "id"=${handoverId}`;
      await tx.$executeRaw`UPDATE "FinanceAccountantShift" SET "status"='HANDED_OVER',"closedAt"=NOW(),"updatedAt"=NOW() WHERE "id"=${handover.fromShiftId}`;
      await tx.$executeRaw`UPDATE "FinanceAccountantShift" SET "openingBalanceMinor"=${handover.actualCashMinor},"updatedAt"=NOW() WHERE "id"=${handover.toShiftId}`;
      return {handoverId,status:'ACCEPTED' as const,openingBalanceMinor:handover.actualCashMinor};
    });
  }
}
