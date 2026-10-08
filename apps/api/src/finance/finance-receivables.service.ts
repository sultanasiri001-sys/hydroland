import { randomUUID } from 'node:crypto';
import { financeKey } from './finance-native-key';
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { FinanceAccessService } from './finance-access.service';
import { assertCreditInvoice, applyReceivablePayment } from './finance-receivables.domain';

@Injectable()
export class FinanceReceivablesService {
  constructor(private readonly db: DatabaseService, private readonly access: FinanceAccessService) {}

  async createDeferredInvoice(actorAccountId:string,input:{invoiceId:string;customerAccountId:string;centerOrgUnitId:string;totalMinor:number;paidMinor?:number;dueAt:Date;creditLimitMinor?:number;installments?:Array<{sequence:number;amountMinor:number;dueAt:Date}>}) {

    if(!(input?.dueAt instanceof Date)||Number.isNaN(input.dueAt.getTime()))throw new Error('FINANCE_DUE_DATE_REQUIRED');
    const checked=assertCreditInvoice({totalMinor:input.totalMinor,paidMinor:input.paidMinor??0,dueAt:input.dueAt,creditLimitMinor:input.creditLimitMinor});
    return this.db.serializable(async tx=>{
      const scope=await this.access.requireBranchAccountant(actorAccountId,input.centerOrgUnitId,tx);
      await this.access.requireCenterOrganizationAccountant(actorAccountId,scope.organizationId,tx);
      const invoice=await tx.$queryRaw<Array<{id:string;paymentId:string;invoiceStatus:string;accountId:string;amountMinor:number;currency:string;paymentStatus:string}>>`SELECT i."id",p."id" AS "paymentId",i."status"::text AS "invoiceStatus",p."accountId",p."amountMinor",p."currency",p."status"::text AS "paymentStatus" FROM "Invoice" i JOIN "Payment" p ON p."id"=i."paymentId" JOIN "Booking" b ON b."id"=p."bookingId" JOIN "Trip" t ON t."id"=b."tripId" WHERE i."id"=${financeKey('Invoice','id',input.invoiceId)} AND t."organizationId"=${financeKey('Organization','id',scope.organizationId)} AND i."status"::text IN ('ISSUED','PAID') FOR UPDATE OF i FOR SHARE OF p,b,t`;
      if(!invoice[0])throw new Error('FINANCE_INVOICE_SCOPE_UNVERIFIED');
      if(!['CREATED','PENDING','AUTHORIZED','CAPTURED'].includes(invoice[0].paymentStatus))throw new Error('FINANCE_INVOICE_PAYMENT_STATE_INVALID');
      if(invoice[0].invoiceStatus==='PAID'&&invoice[0].paymentStatus!=='CAPTURED')throw new Error('FINANCE_INVOICE_PAID_UNVERIFIED');
      if(invoice[0].currency!=='SAR')throw new Error('FINANCE_CURRENCY_UNSUPPORTED');
      if(invoice[0].accountId!==input.customerAccountId)throw new Error('FINANCE_INVOICE_CUSTOMER_MISMATCH');
      if(invoice[0].amountMinor!==input.totalMinor)throw new Error('FINANCE_INVOICE_TOTAL_MISMATCH');
      const verifiedPaid=invoice[0].paymentStatus==='CAPTURED'?invoice[0].amountMinor:0;
      if(verifiedPaid>0){
        const allocated=await tx.$queryRaw<Array<{id:string}>>`SELECT "id" FROM "ReceivablePayment" WHERE "paymentId"=${financeKey('ReceivablePayment','paymentId',invoice[0].paymentId)} LIMIT 1`;
        if(allocated.length)throw new Error('FINANCE_INVOICE_PAYMENT_ALREADY_ALLOCATED');
      }
      if((input.paidMinor??0)!==verifiedPaid)throw new Error('FINANCE_INVOICE_PAID_UNVERIFIED');
      const center=await tx.$queryRaw<Array<{id:string}>>`SELECT "id" FROM "OrgUnit" WHERE "id"=${financeKey('OrgUnit','id',input.centerOrgUnitId)} AND "type"='CENTER' AND "active"=TRUE FOR SHARE`;
      if(!center[0])throw new Error('FINANCE_ACTIVE_CENTER_REQUIRED');
      const customer=await tx.$queryRaw<Array<{id:string}>>`SELECT "id" FROM "Account" WHERE "id"=${financeKey('Account','id',input.customerAccountId)} AND "status"='ACTIVE' FOR SHARE`;
      if(!customer[0])throw new Error('FINANCE_CUSTOMER_ACCOUNT_INVALID');
      const existing=await tx.$queryRaw<Array<{id:string}>>`SELECT "id" FROM "Receivable" WHERE "invoiceId"=${financeKey('Invoice','id',input.invoiceId)}`;
      if(existing[0])throw new Error('FINANCE_RECEIVABLE_ALREADY_EXISTS');
      if(input.installments?.length){
        const sum=input.installments.reduce((n,x)=>n+x.amountMinor,0);
        if(sum!==checked.outstandingMinor)throw new Error('FINANCE_INSTALLMENT_TOTAL_MISMATCH');
        const seq=new Set(input.installments.map(x=>x.sequence));
        if(seq.size!==input.installments.length||input.installments.some(x=>!Number.isSafeInteger(x.sequence)||x.sequence<=0||!Number.isSafeInteger(x.amountMinor)||x.amountMinor<=0||Number.isNaN(x.dueAt.getTime())))throw new Error('FINANCE_INSTALLMENT_INVALID');
      }
      const status=checked.outstandingMinor===0?'PAID':(input.paidMinor??0)>0?'PARTIALLY_PAID':'OPEN';
      const rows=await tx.$queryRaw<Array<{id:string}>>`INSERT INTO "Receivable" ("id","invoiceId","customerAccountId","centerOrgUnitId","totalMinor","paidMinor","outstandingMinor","dueAt","creditLimitMinor","status","updatedAt") VALUES (${financeKey('Receivable','id',randomUUID())},${financeKey('Receivable','invoiceId',input.invoiceId)},${financeKey('Receivable','customerAccountId',input.customerAccountId)},${financeKey('Receivable','centerOrgUnitId',input.centerOrgUnitId)},${input.totalMinor},${input.paidMinor??0},${checked.outstandingMinor},${input.dueAt},${input.creditLimitMinor??null},${status}::"ReceivableStatus",NOW()) RETURNING "id"`;
      const receivableId=rows[0].id;
      for(const installment of input.installments??[]){
        await tx.$executeRaw`INSERT INTO "ReceivableInstallment" ("id","receivableId","sequence","amountMinor","dueAt","updatedAt") VALUES (${financeKey('ReceivableInstallment','id',randomUUID())},${financeKey('ReceivableInstallment','receivableId',receivableId)},${installment.sequence},${installment.amountMinor},${installment.dueAt},NOW())`;
      }
      return {receivableId,outstandingMinor:checked.outstandingMinor,mode:checked.mode};
    });
  }

  async collect(actorAccountId:string,receivableId:string,input:{paymentId:string;amountMinor:number;receiptNumber:string;installmentId?:string}) {
    if(typeof input?.receiptNumber!=='string'||!input.receiptNumber.trim()||input.receiptNumber.length>100)throw new Error('FINANCE_RECEIPT_REQUIRED');
    if(!Number.isSafeInteger(input.amountMinor)||input.amountMinor<=0)throw new Error('FINANCE_COLLECTION_AMOUNT_INVALID');
    return this.db.serializable(async tx=>{
      const rows=await tx.$queryRaw<Array<{id:string;customerAccountId:string;centerOrgUnitId:string;paidMinor:number;outstandingMinor:number;currency:string}>>`SELECT "id","customerAccountId","centerOrgUnitId","paidMinor","outstandingMinor","currency" FROM "Receivable" WHERE "id"=${financeKey('Receivable','id',receivableId)} FOR UPDATE`;
      const r=rows[0]; if(!r)throw new Error('FINANCE_RECEIVABLE_NOT_FOUND');
      const scope=await this.access.requireBranchAccountant(actorAccountId,r.centerOrgUnitId,tx);
      const payment=await tx.$queryRaw<Array<{id:string;accountId:string;amountMinor:number;status:string;currency:string}>>`SELECT p."id",p."accountId",p."amountMinor",p."currency",p."status"::text AS "status" FROM "Payment" p JOIN "Booking" b ON b."id"=p."bookingId" JOIN "Trip" t ON t."id"=b."tripId" JOIN "Invoice" i ON i."id"=(SELECT "invoiceId" FROM "Receivable" WHERE "id"=${financeKey('Receivable','id',receivableId)}) JOIN "Payment" origin ON origin."id"=i."paymentId" AND origin."bookingId"=p."bookingId" AND origin."accountId"=${financeKey('Account','id',r.customerAccountId)} WHERE i."status"::text IN ('ISSUED','PAID') AND p."id"=${financeKey('Payment','id',input.paymentId)} AND t."organizationId"=${financeKey('Organization','id',scope.organizationId)} FOR SHARE OF p,b,t,i,origin`;
      if(!payment[0]||payment[0].status!=='CAPTURED')throw new Error('FINANCE_PAYMENT_NOT_SETTLED');
      if(payment[0].currency!==r.currency)throw new Error('FINANCE_PAYMENT_CURRENCY_MISMATCH');
      if(payment[0].accountId!==r.customerAccountId)throw new Error('FINANCE_PAYMENT_CUSTOMER_MISMATCH');
      if(payment[0].amountMinor!==input.amountMinor)throw new Error('FINANCE_PAYMENT_AMOUNT_MISMATCH');
      const assigned=await tx.$queryRaw<Array<{id:string}>>`SELECT other."id" FROM "Invoice" i JOIN "Receivable" other ON other."invoiceId"=i."id" WHERE i."paymentId"=${financeKey('Payment','id',input.paymentId)} AND other."id"<>${financeKey('Receivable','id',receivableId)} FOR SHARE OF i,other`;
      if(assigned.length)throw new Error('FINANCE_PAYMENT_ALLOCATED_TO_OTHER_RECEIVABLE');
      const used=await tx.$queryRaw<Array<{id:string}>>`SELECT "id" FROM "ReceivablePayment" WHERE "paymentId"=${financeKey('ReceivablePayment','paymentId',input.paymentId)} OR "receiptNumber"=${input.receiptNumber.trim()} LIMIT 1`;
      if(used[0])throw new Error('FINANCE_COLLECTION_ALREADY_RECORDED');
      const next=applyReceivablePayment(r.outstandingMinor,input.amountMinor);
      const scheduled=await tx.$queryRaw<Array<{id:string}>>`SELECT "id" FROM "ReceivableInstallment" WHERE "receivableId"=${financeKey('ReceivableInstallment','receivableId',receivableId)} AND "status"<>'CANCELLED' LIMIT 1`;
      if(scheduled.length&&!input.installmentId)throw new Error('FINANCE_INSTALLMENT_REQUIRED');
      if(input.installmentId){
        const inst=await tx.$queryRaw<Array<{id:string;amountMinor:number;paidMinor:number;status:string}>>`SELECT "id","amountMinor","paidMinor","status"::text FROM "ReceivableInstallment" WHERE "id"=${financeKey('ReceivableInstallment','id',input.installmentId)} AND "receivableId"=${financeKey('ReceivableInstallment','receivableId',receivableId)} FOR UPDATE`;
        if(!inst[0])throw new Error('FINANCE_INSTALLMENT_NOT_FOUND');
        if(inst[0].status==='CANCELLED')throw new Error('FINANCE_INSTALLMENT_CANCELLED');
        if(inst[0].paidMinor+input.amountMinor>inst[0].amountMinor)throw new Error('FINANCE_INSTALLMENT_OVERPAYMENT');
        const instPaid=inst[0].paidMinor+input.amountMinor;
        const instStatus=instPaid===inst[0].amountMinor?'PAID':'PARTIALLY_PAID';
        await tx.$executeRaw`UPDATE "ReceivableInstallment" SET "paidMinor"=${instPaid},"status"=${instStatus}::"ReceivableInstallmentStatus","updatedAt"=NOW() WHERE "id"=${financeKey('ReceivableInstallment','id',input.installmentId)}`;
      }
      await tx.$executeRaw`INSERT INTO "ReceivablePayment" ("id","receivableId","installmentId","paymentId","amountMinor","receiptNumber") VALUES (${financeKey('ReceivablePayment','id',randomUUID())},${financeKey('ReceivablePayment','receivableId',receivableId)},${financeKey('ReceivablePayment','installmentId',input.installmentId??null)},${financeKey('ReceivablePayment','paymentId',input.paymentId)},${input.amountMinor},${input.receiptNumber.trim()})`;
      const paidMinor=r.paidMinor+input.amountMinor;
      const outstandingMinor=next.remainingMinor;
      await tx.$executeRaw`UPDATE "Receivable" SET "paidMinor"=${paidMinor},"outstandingMinor"=${outstandingMinor},"status"=${next.status}::"ReceivableStatus","updatedAt"=NOW() WHERE "id"=${financeKey('Receivable','id',receivableId)}`;
      return {receivableId,receiptNumber:input.receiptNumber.trim(),paidMinor,outstandingMinor,status:next.status};
    });
  }

  async branchAr(actorAccountId:string,centerOrgUnitId:string){
    return this.db.serializable(async tx=>{
      await this.access.requireBranchAccountant(actorAccountId,centerOrgUnitId,tx);
      return tx.$queryRaw<Array<{id:string;invoiceId:string;customerAccountId:string;totalMinor:number;paidMinor:number;outstandingMinor:number;dueAt:Date;status:string}>>`SELECT "id","invoiceId","customerAccountId","totalMinor","paidMinor","outstandingMinor","dueAt","status"::text AS "status" FROM "Receivable" WHERE "centerOrgUnitId"=${financeKey('Receivable','centerOrgUnitId',centerOrgUnitId)} AND "status" IN ('OPEN','PARTIALLY_PAID','OVERDUE') ORDER BY "dueAt" ASC`;
    });
  }
}
