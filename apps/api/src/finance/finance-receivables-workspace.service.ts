import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { FinanceAccessService } from './finance-access.service';
import { financeKey } from './finance-native-key';

const pageSize=25;
function pageNumber(value:unknown) {
  if(value===undefined)return 1;
  if(typeof value!=='string'||!/^\d+$/.test(value)||Number(value)<1||Number(value)>100000)throw new Error('FINANCE_PAGE_INVALID');
  return Number(value);
}

@Injectable()
export class FinanceReceivablesWorkspaceService {
  constructor(private readonly db:DatabaseService,private readonly access:FinanceAccessService) {}

  async list(accountId:string,unitId:string,pageInput:unknown,statusInput:unknown) {
    const page=pageNumber(pageInput),status=statusInput??'open';
    if(!['open','all'].includes(String(status))||typeof status!=='string')throw new Error('FINANCE_FILTER_INVALID');
    return this.db.serializable(async tx=>{
      await this.access.requireBranchAccountant(accountId,unitId,tx);
      const where=Prisma.sql`r."centerOrgUnitId"=${financeKey('Receivable','centerOrgUnitId',unitId)} AND (${status==='all'}::boolean OR r."status" IN ('OPEN','PARTIALLY_PAID','OVERDUE'))`;
      const counts=await tx.$queryRaw<Array<{total:bigint}>>`SELECT COUNT(*)::bigint AS total FROM "Receivable" r WHERE ${where}`;
      const items=await tx.$queryRaw<Array<Record<string,unknown>>>`
        SELECT r."id",r."totalMinor",r."paidMinor",r."outstandingMinor",r."currency",r."dueAt",r."status"::text,
          i."number" AS "invoiceNumber",concat_ws(' ',p."firstName",p."lastName") AS "customerName"
        FROM "Receivable" r JOIN "Invoice" i ON i."id"=r."invoiceId"
        JOIN "Account" a ON a."id"=r."customerAccountId" JOIN "Person" p ON p."id"=a."personId"
        WHERE ${where} ORDER BY r."dueAt",r."id" LIMIT ${pageSize} OFFSET ${(page-1)*pageSize}`;
      return {centerOrgUnitId:unitId,items,page,pageSize,total:Number(counts[0].total)};
    });
  }

  async invoices(accountId:string,unitId:string,pageInput:unknown) {
    const page=pageNumber(pageInput);
    return this.db.serializable(async tx=>{
      const scope=await this.access.requireBranchAccountant(accountId,unitId,tx);
      await this.access.requireCenterOrganizationAccountant(accountId,scope.organizationId,tx);
      const from=Prisma.sql`FROM "Invoice" i JOIN "Payment" pay ON pay."id"=i."paymentId"
        JOIN "Booking" b ON b."id"=pay."bookingId" JOIN "Trip" t ON t."id"=b."tripId"
        JOIN "Account" a ON a."id"=pay."accountId" JOIN "Person" p ON p."id"=a."personId"
        WHERE t."organizationId"=${financeKey('Organization','id',scope.organizationId)}
          AND i."status"='ISSUED' AND pay."currency"='SAR' AND pay."amountMinor">0 AND a."status"='ACTIVE'
          AND pay."status" IN ('CREATED','PENDING','AUTHORIZED')
          AND NOT EXISTS(SELECT 1 FROM "Receivable" r WHERE r."invoiceId"=i."id")`;
      const counts=await tx.$queryRaw<Array<{total:bigint}>>`SELECT COUNT(*)::bigint AS total ${from}`;
      const items=await tx.$queryRaw<Array<Record<string,unknown>>>`
        SELECT i."id",i."number",pay."accountId" AS "customerAccountId",pay."amountMinor" AS "totalMinor",
          concat_ws(' ',p."firstName",p."lastName") AS "customerName",pay."status"::text AS "paymentStatus"
        ${from} ORDER BY i."number",i."id" LIMIT ${pageSize} OFFSET ${(page-1)*pageSize}`;
      return {centerOrgUnitId:unitId,items,page,pageSize,total:Number(counts[0].total)};
    });
  }

  async detail(accountId:string,unitId:string,receivableId:string,pageInput:unknown) {
    const page=pageNumber(pageInput);
    return this.db.serializable(async tx=>{
      const scope=await this.access.requireBranchAccountant(accountId,unitId,tx);
      const rows=await tx.$queryRaw<Array<{id:string;invoiceId:string;customerAccountId:string;totalMinor:number;paidMinor:number;outstandingMinor:number;currency:string;dueAt:Date;status:string;invoiceNumber:string;customerName:string}>>`
        SELECT r."id",r."invoiceId",r."customerAccountId",r."totalMinor",r."paidMinor",r."outstandingMinor",r."currency",r."dueAt",r."status"::text,
          i."number" AS "invoiceNumber",concat_ws(' ',p."firstName",p."lastName") AS "customerName"
        FROM "Receivable" r JOIN "Invoice" i ON i."id"=r."invoiceId"
        JOIN "Account" a ON a."id"=r."customerAccountId" JOIN "Person" p ON p."id"=a."personId"
        WHERE r."id"=${financeKey('Receivable','id',receivableId)} AND r."centerOrgUnitId"=${financeKey('Receivable','centerOrgUnitId',unitId)} FOR SHARE OF r,i`;
      const receivable=rows[0];if(!receivable)throw new Error('FINANCE_RECEIVABLE_NOT_FOUND');
      const installments=await tx.$queryRaw<Array<Record<string,unknown>>>`
        SELECT "id","sequence","amountMinor","paidMinor","dueAt","status"::text FROM "ReceivableInstallment"
        WHERE "receivableId"=${financeKey('ReceivableInstallment','receivableId',receivableId)} ORDER BY "sequence"`;
      const provenance=await tx.$queryRaw<Array<{id:string}>>`
        SELECT origin."id" FROM "Invoice" i JOIN "Payment" origin ON origin."id"=i."paymentId"
        JOIN "Booking" b ON b."id"=origin."bookingId" JOIN "Trip" t ON t."id"=b."tripId"
        WHERE i."id"=${financeKey('Invoice','id',receivable.invoiceId)} AND i."status" IN ('ISSUED','PAID')
          AND origin."accountId"=${financeKey('Account','id',receivable.customerAccountId)}
          AND t."organizationId"=${financeKey('Organization','id',scope.organizationId)} FOR SHARE OF i,origin,b,t`;
      const collectable=provenance.length===1&&receivable.outstandingMinor>0&&receivable.currency==='SAR';
      const from=Prisma.sql`FROM "Payment" pay JOIN "Payment" origin ON origin."bookingId"=pay."bookingId"
        WHERE origin."id"=${financeKey('Payment','id',provenance[0]?.id??null)} AND pay."status"='CAPTURED'
          AND pay."accountId"=${financeKey('Account','id',receivable.customerAccountId)} AND pay."currency"=${receivable.currency}
          AND pay."amountMinor">0 AND pay."amountMinor"<=${receivable.outstandingMinor}
          AND NOT EXISTS(SELECT 1 FROM "ReceivablePayment" used WHERE used."paymentId"=pay."id")
          AND NOT EXISTS(SELECT 1 FROM "Invoice" pi JOIN "Receivable" other ON other."invoiceId"=pi."id" WHERE pi."paymentId"=pay."id" AND other."id"<>${financeKey('Receivable','id',receivableId)})`;
      const counts=collectable?await tx.$queryRaw<Array<{total:bigint}>>`SELECT COUNT(*)::bigint AS total ${from}`:[{total:0n}];
      const payments=collectable?await tx.$queryRaw<Array<Record<string,unknown>>>`
        SELECT pay."id",pay."amountMinor",pay."createdAt",pay."providerReference" ${from}
        ORDER BY pay."createdAt" DESC,pay."id" DESC LIMIT ${pageSize} OFFSET ${(page-1)*pageSize}`:[];
      const collections=await tx.$queryRaw<Array<Record<string,unknown>>>`
        SELECT rp."id",rp."amountMinor",rp."receiptNumber",rp."collectedAt",i."sequence" AS "installmentSequence"
        FROM "ReceivablePayment" rp LEFT JOIN "ReceivableInstallment" i ON i."id"=rp."installmentId"
        WHERE rp."receivableId"=${financeKey('ReceivablePayment','receivableId',receivableId)} ORDER BY rp."collectedAt" DESC,rp."id" DESC LIMIT 50`;
      return {centerOrgUnitId:unitId,receivable,installments,collections,collectable,payments:{items:payments,page,pageSize,total:Number(counts[0].total)}};
    });
  }
}
