import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { FinanceAccessService } from './finance-access.service';
import { assertCreditInvoice, applyReceivablePayment } from './finance-receivables.domain';

@Injectable()
export class FinanceReceivablesService {
  constructor(private readonly db: DatabaseService, private readonly access: FinanceAccessService) {}

  async createDeferredInvoice(actorAccountId:string,input:{invoiceId:string;customerAccountId:string;centerOrgUnitId:string;totalMinor:number;paidMinor?:number;dueAt:Date;creditLimitMinor?:number;installments?:Array<{sequence:number;amountMinor:number;dueAt:Date}>}) {
    await this.access.requireBranchAccountant(actorAccountId,input.centerOrgUnitId);
    const checked=assertCreditInvoice({totalMinor:input.totalMinor,paidMinor:input.paidMinor??0,dueAt:input.dueAt,creditLimitMinor:input.creditLimitMinor});
    return this.db.serializable(async tx=>{
      const invoice=await tx.$queryRaw<Array<{id:string}>>`SELECT "id" FROM "Invoice" WHERE "id"=${input.invoiceId} FOR UPDATE`;
      if(!invoice[0])throw new Error('FINANCE_INVOICE_NOT_FOUND');
      const center=await tx.$queryRaw<Array<{id:string}>>`SELECT "id" FROM "OrgUnit" WHERE "id"=${input.centerOrgUnitId} AND "type"='CENTER' AND "active"=TRUE FOR SHARE`;
      if(!center[0])throw new Error('FINANCE_ACTIVE_CENTER_REQUIRED');
      const customer=await tx.$queryRaw<Array<{id:string}>>`SELECT "id" FROM "Account" WHERE "id"=${input.customerAccountId} AND "status"='ACTIVE' FOR SHARE`;
      if(!customer[0])throw new Error('FINANCE_CUSTOMER_ACCOUNT_INVALID');
      const existing=await tx.$queryRaw<Array<{id:string}>>`SELECT "id" FROM "Receivable" WHERE "invoiceId"=${input.invoiceId}`;
      if(existing[0])throw new Error('FINANCE_RECEIVABLE_ALREADY_EXISTS');
      if(input.installments?.length){
        const sum=input.installments.reduce((n,x)=>n+x.amountMinor,0);
        if(sum!==checked.outstandingMinor)throw new Error('FINANCE_INSTALLMENT_TOTAL_MISMATCH');
        const seq=new Set(input.installments.map(x=>x.sequence));
        if(seq.size!==input.installments.length||input.installments.some(x=>!Number.isSafeInteger(x.sequence)||x.sequence<=0||!Number.isSafeInteger(x.amountMinor)||x.amountMinor<=0||Number.isNaN(x.dueAt.getTime())))throw new Error('FINANCE_INSTALLMENT_INVALID');
      }
      const status=checked.outstandingMinor===0?'PAID':(input.paidMinor??0)>0?'PARTIALLY_PAID':'OPEN';
      const rows=await tx.$queryRaw<Array<{id:string}>>`INSERT INTO "Receivable" ("id","invoiceId","customerAccountId","centerOrgUnitId","totalMinor","paidMinor","outstandingMinor","dueAt","creditLimitMinor","status","updatedAt") VALUES (gen_random_uuid()::text,${input.invoiceId},${input.customerAccountId},${input.centerOrgUnitId},${input.totalMinor},${input.paidMinor??0},${checked.outstandingMinor},${input.dueAt},${input.creditLimitMinor??null},${status}::"ReceivableStatus",NOW()) RETURNING "id"`;
      const receivableId=rows[0].id;
      for(const installment of input.installments??[]){
        await tx.$executeRaw`INSERT INTO "ReceivableInstallment" ("id","receivableId","sequence","amountMinor","dueAt","updatedAt") VALUES (gen_random_uuid()::text,${receivableId},${installment.sequence},${installment.amountMinor},${installment.dueAt},NOW())`;
      }
      return {receivableId,outstandingMinor:checked.outstandingMinor,mode:checked.mode};
    });
  }

  async collect(actorAccountId:string,receivableId:string,input:{paymentId:string;amountMinor:number;receiptNumber:string;installmentId?:string}) {
    if(!input.receiptNumber?.trim())throw new Error('FINANCE_RECEIPT_REQUIRED');
    if(!Number.isSafeInteger(input.amountMinor)||input.amountMinor<=0)throw new Error('FINANCE_COLLECTION_AMOUNT_INVALID');
    return this.db.serializable(async tx=>{
      const rows=await tx.$queryRaw<Array<{id:string;customerAccountId:string;centerOrgUnitId:string;paidMinor:number;outstandingMinor:number}>>`SELECT "id","customerAccountId","centerOrgUnitId","paidMinor","outstandingMinor" FROM "Receivable" WHERE "id"=${receivableId} FOR UPDATE`;
      const r=rows[0]; if(!r)throw new Error('FINANCE_RECEIVABLE_NOT_FOUND');
      await this.access.requireBranchAccountant(actorAccountId,r.centerOrgUnitId);
      const payment=await tx.$queryRaw<Array<{id:string;accountId:string;amountMinor:number;status:string}>>`SELECT "id","accountId","amountMinor","status"::text AS "status" FROM "Payment" WHERE "id"=${input.paymentId} FOR SHARE`;
      if(!payment[0]||payment[0].status!=='CAPTURED')throw new Error('FINANCE_PAYMENT_NOT_SETTLED');
      if(payment[0].accountId!==r.customerAccountId)throw new Error('FINANCE_PAYMENT_CUSTOMER_MISMATCH');
      if(payment[0].amountMinor!==input.amountMinor)throw new Error('FINANCE_PAYMENT_AMOUNT_MISMATCH');
      const used=await tx.$queryRaw<Array<{id:string}>>`SELECT "id" FROM "ReceivablePayment" WHERE "paymentId"=${input.paymentId} OR "receiptNumber"=${input.receiptNumber.trim()} LIMIT 1`;
      if(used[0])throw new Error('FINANCE_COLLECTION_ALREADY_RECORDED');
      const next=applyReceivablePayment({paidMinor:r.paidMinor,outstandingMinor:r.outstandingMinor},input.amountMinor);
      if(input.installmentId){
        const inst=await tx.$queryRaw<Array<{id:string;amountMinor:number;paidMinor:number}>>`SELECT "id","amountMinor","paidMinor" FROM "ReceivableInstallment" WHERE "id"=${input.installmentId} AND "receivableId"=${receivableId} FOR UPDATE`;
        if(!inst[0])throw new Error('FINANCE_INSTALLMENT_NOT_FOUND');
        if(inst[0].paidMinor+input.amountMinor>inst[0].amountMinor)throw new Error('FINANCE_INSTALLMENT_OVERPAYMENT');
        const instPaid=inst[0].paidMinor+input.amountMinor;
        const instStatus=instPaid===inst[0].amountMinor?'PAID':'PARTIALLY_PAID';
        await tx.$executeRaw`UPDATE "ReceivableInstallment" SET "paidMinor"=${instPaid},"status"=${instStatus}::"ReceivableInstallmentStatus","updatedAt"=NOW() WHERE "id"=${input.installmentId}`;
      }
      await tx.$executeRaw`INSERT INTO "ReceivablePayment" ("id","receivableId","installmentId","paymentId","amountMinor","receiptNumber") VALUES (gen_random_uuid()::text,${receivableId},${input.installmentId??null},${input.paymentId},${input.amountMinor},${input.receiptNumber.trim()})`;
      const receivableStatus=next.outstandingMinor===0?'PAID':'PARTIALLY_PAID';
      await tx.$executeRaw`UPDATE "Receivable" SET "paidMinor"=${next.paidMinor},"outstandingMinor"=${next.outstandingMinor},"status"=${receivableStatus}::"ReceivableStatus","updatedAt"=NOW() WHERE "id"=${receivableId}`;
      return {receivableId,receiptNumber:input.receiptNumber.trim(),...next};
    });
  }

  async branchAr(actorAccountId:string,centerOrgUnitId:string){
    await this.access.requireBranchAccountant(actorAccountId,centerOrgUnitId);
    return this.db.$queryRaw<Array<{id:string;invoiceId:string;customerAccountId:string;totalMinor:number;paidMinor:number;outstandingMinor:number;dueAt:Date;status:string}>>`SELECT "id","invoiceId","customerAccountId","totalMinor","paidMinor","outstandingMinor","dueAt","status"::text AS "status" FROM "Receivable" WHERE "centerOrgUnitId"=${centerOrgUnitId} AND "status" IN ('OPEN','PARTIALLY_PAID','OVERDUE') ORDER BY "dueAt" ASC`;
  }
}
