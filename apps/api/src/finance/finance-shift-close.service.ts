import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { FinanceAccessService } from './finance-access.service';
import { financeKey } from './finance-native-key';
import { prepareAccountantShiftClose } from './finance-shift-close.domain';
import { calculateFinanceShiftTotals, FinanceEntryType } from './finance-shift.domain';

type ShiftRow={id:string;accountantAccountId:string;centerOrgUnitId:string;status:string;openingBalanceMinor:number;currency:string};
const maxMinor=2_147_483_647;

@Injectable()
export class FinanceShiftCloseService {
  constructor(private readonly db:DatabaseService,private readonly access:FinanceAccessService) {}

  async preview(accountId:string,centerId:string,shiftId:string,actualCashMinor:number,varianceReason?:string) {
    return this.db.serializable(async tx=>{
      const {scope,shift}=await this.ownShift(tx,accountId,centerId,shiftId);
      return this.prepare(tx,scope,shift,actualCashMinor,varianceReason);
    });
  }

  async submit(accountId:string,centerId:string,shiftId:string,actualCashMinor:number,varianceReason?:string) {
    return this.db.serializable(async tx=>{
      const {scope,shift}=await this.ownShift(tx,accountId,centerId,shiftId);
      const close=await this.prepare(tx,scope,shift,actualCashMinor,varianceReason);
      if(close.decision==='BLOCKED')throw new Error('FINANCE_SHIFT_CLOSE_RECONCILIATION_BLOCKED');
      const pending=await tx.$queryRaw<Array<{id:string}>>`SELECT "id" FROM "FinanceShiftCloseSubmission" WHERE "shiftId"=${financeKey('FinanceShiftCloseSubmission','shiftId',shiftId)} AND "status"='SUBMITTED' LIMIT 1`;
      if(pending.length)throw new Error('FINANCE_SHIFT_CLOSE_ALREADY_SUBMITTED');
      const revisions=await tx.$queryRaw<Array<{revision:number|null}>>`SELECT MAX("revision")::int AS revision FROM "FinanceShiftCloseSubmission" WHERE "shiftId"=${financeKey('FinanceShiftCloseSubmission','shiftId',shiftId)}`;
      const revision=(revisions[0]?.revision??0)+1;
      const rows=await tx.$queryRaw<Array<{id:string}>>`INSERT INTO "FinanceShiftCloseSubmission" ("id","shiftId","centerOrgUnitId","revision","submittedByAccountId","openingBalanceMinor","revenueMinor","expenseMinor","refundMinor","adjustmentMinor","expectedCashMinor","actualCashMinor","varianceMinor","unresolvedPaymentCount","varianceReason","status") VALUES (${financeKey('FinanceShiftCloseSubmission','id',randomUUID())},${financeKey('FinanceShiftCloseSubmission','shiftId',shiftId)},${financeKey('FinanceShiftCloseSubmission','centerOrgUnitId',centerId)},${revision},${financeKey('FinanceShiftCloseSubmission','submittedByAccountId',accountId)},${close.openingBalanceMinor},${close.revenueMinor},${close.expenseMinor},${close.refundMinor},${close.adjustmentMinor},${close.expectedCashMinor},${close.actualCashMinor},${close.varianceMinor},${close.unresolvedPaymentCount},${close.varianceReason??null},'SUBMITTED'::"FinanceShiftCloseSubmissionStatus") RETURNING "id"`;
      await this.audit(tx,accountId,'FINANCE_SHIFT_CLOSE_SUBMITTED',rows[0].id,{centerOrgUnitId:centerId,shiftId,expectedCashMinor:close.expectedCashMinor,actualCashMinor:close.actualCashMinor,varianceMinor:close.varianceMinor,unresolvedPaymentCount:close.unresolvedPaymentCount,reason:close.varianceReason??null});
      return {submissionId:rows[0].id,revision,...close,status:'SUBMITTED'};
    });
  }

  async reviewCenters(accountId:string) {
    return this.db.$queryRaw<Array<{id:string;name:string;organizationName:string}>>`SELECT DISTINCT c."id",c."nameAr" AS "name",o."displayName" AS "organizationName"
      FROM "OrgUnit" c JOIN "Organization" o ON o."id"=c."organizationId" JOIN "Account" a ON a."id"=${financeKey('Account','id',accountId)} AND a."status"='ACTIVE'
      WHERE c."type"='CENTER' AND c."active"=TRUE AND (
        EXISTS(SELECT 1 FROM "Employment" e JOIN "Position" p ON p."id"=e."positionId" AND p."active"=TRUE JOIN "OrgUnit" u ON u."id"=e."orgUnitId" WHERE e."accountId"=a."id" AND e."organizationId"=c."organizationId" AND e."status"='ACTIVE' AND p."code"='CENTER_MANAGER' AND u."id"=c."id") OR
        EXISTS(SELECT 1 FROM "Employment" e JOIN "Position" p ON p."id"=e."positionId" AND p."active"=TRUE JOIN "OrgUnit" u ON u."id"=e."orgUnitId" WHERE e."accountId"=a."id" AND e."organizationId"=c."organizationId" AND e."status"='ACTIVE' AND p."code" IN ('CENTRAL_FINANCE','FINANCE_MANAGER','EXECUTIVE') AND u."type"='HQ') OR
        EXISTS(SELECT 1 FROM "RoleAssignment" ra WHERE ra."accountId"=a."id" AND ra."role"='EXECUTIVE_APPROVER' AND ra."status"='ACTIVE' AND (ra."scope" IS NULL OR ra."scope"->>'organizationId'=c."organizationId")
      )) ORDER BY o."displayName",c."nameAr",c."id"`;
  }

  async pending(accountId:string,centerId:string) {
    return this.db.serializable(async tx=>{
      const target=await this.authorizeReviewer(tx,accountId,centerId);
      return tx.$queryRaw<Array<Record<string,unknown>>>`SELECT submission."id",submission."shiftId",submission."revision",submission."submittedByAccountId",submission."openingBalanceMinor",submission."revenueMinor",submission."expenseMinor",submission."refundMinor",submission."adjustmentMinor",submission."expectedCashMinor",submission."actualCashMinor",submission."varianceMinor",submission."unresolvedPaymentCount",submission."varianceReason",submission."submittedAt",concat_ws(' ',submitter."firstName",submitter."lastName") AS "submittedByName",s."accountantAccountId" FROM "FinanceShiftCloseSubmission" AS submission JOIN "FinanceAccountantShift" s ON s."id"=submission."shiftId" JOIN "Account" a ON a."id"=submission."submittedByAccountId" JOIN "Person" submitter ON submitter."id"=a."personId" WHERE submission."centerOrgUnitId"=${financeKey('OrgUnit','id',target.centerOrgUnitId)} AND submission."status"='SUBMITTED' AND submission."submittedByAccountId"<>${financeKey('Account','id',accountId)} ORDER BY submission."submittedAt",submission."id"`;
    });
  }

  async review(accountId:string,submissionId:string,decision:'APPROVED'|'REJECTED',note?:string) {
    if(!['APPROVED','REJECTED'].includes(decision))throw new Error('FINANCE_SHIFT_CLOSE_DECISION_INVALID');
    if(note!=null&&(typeof note!=='string'||note.trim().length>1000))throw new Error('FINANCE_SHIFT_CLOSE_REVIEW_NOTE_INVALID');
    if(decision==='REJECTED'&&(note?.trim().length??0)<10)throw new Error('FINANCE_SHIFT_CLOSE_REJECTION_REASON_REQUIRED');
    return this.db.serializable(async tx=>{
      const rows=await tx.$queryRaw<Array<{id:string;shiftId:string;centerOrgUnitId:string;submittedByAccountId:string;status:string;expectedCashMinor:number;actualCashMinor:number;varianceMinor:number;unresolvedPaymentCount:number}>>`SELECT submission."id",submission."shiftId",submission."centerOrgUnitId",submission."submittedByAccountId",submission."status"::text AS "status",submission."expectedCashMinor",submission."actualCashMinor",submission."varianceMinor",submission."unresolvedPaymentCount" FROM "FinanceShiftCloseSubmission" AS submission JOIN "FinanceAccountantShift" s ON s."id"=submission."shiftId" WHERE submission."id"=${financeKey('FinanceShiftCloseSubmission','id',submissionId)} FOR UPDATE OF submission,s`;
      const close=rows[0];if(!close)throw new Error('FINANCE_SHIFT_CLOSE_NOT_FOUND');
      await this.authorizeReviewer(tx,accountId,close.centerOrgUnitId);
      if(close.submittedByAccountId===accountId)throw new Error('FINANCE_SHIFT_CLOSE_REVIEW_SOD_VIOLATION');
      if(close.status!=='SUBMITTED')throw new Error('FINANCE_SHIFT_CLOSE_ALREADY_REVIEWED');
      if(close.unresolvedPaymentCount!==0)throw new Error('FINANCE_SHIFT_CLOSE_RECONCILIATION_BLOCKED');
      const updated=await tx.$queryRaw<Array<{id:string}>>`UPDATE "FinanceShiftCloseSubmission" SET "status"=${decision}::"FinanceShiftCloseSubmissionStatus","reviewedByAccountId"=${financeKey('FinanceShiftCloseSubmission','reviewedByAccountId',accountId)},"reviewNote"=${note?.trim()||null},"reviewedAt"=NOW() WHERE "id"=${financeKey('FinanceShiftCloseSubmission','id',submissionId)} AND "status"='SUBMITTED' RETURNING "id"`;
      if(updated.length!==1)throw new Error('FINANCE_SHIFT_CLOSE_ALREADY_REVIEWED');
      if(decision==='APPROVED'){
        const shiftUpdated=await tx.$executeRaw`UPDATE "FinanceAccountantShift" SET "status"='CLOSED',"reviewedByAccountId"=${financeKey('FinanceAccountantShift','reviewedByAccountId',accountId)},"closedAt"=NOW(),"updatedAt"=NOW() WHERE "id"=${financeKey('FinanceAccountantShift','id',close.shiftId)} AND "status"='OPEN'`;
        if(shiftUpdated!==1)throw new Error('FINANCE_SHIFT_CLOSE_REQUIRES_OPEN_SHIFT');
      }
      await this.audit(tx,accountId,`FINANCE_SHIFT_CLOSE_${decision}`,submissionId,{shiftId:close.shiftId,centerOrgUnitId:close.centerOrgUnitId,beforeStatus:'SUBMITTED',afterStatus:decision,expectedCashMinor:close.expectedCashMinor,actualCashMinor:close.actualCashMinor,varianceMinor:close.varianceMinor,reason:note?.trim()??null});
      return {submissionId,shiftId:close.shiftId,status:decision};
    });
  }

  private async ownShift(tx:Prisma.TransactionClient,accountId:string,centerId:string,shiftId:string) {
    const scope=await this.access.requireBranchAccountant(accountId,centerId,tx);
    await this.access.requireCenterOrganizationAccountant(accountId,scope.organizationId,tx);
    const rows=await tx.$queryRaw<ShiftRow[]>`SELECT "id","accountantAccountId","centerOrgUnitId","status"::text AS "status","openingBalanceMinor","currency" FROM "FinanceAccountantShift" WHERE "id"=${financeKey('FinanceAccountantShift','id',shiftId)} AND "centerOrgUnitId"=${financeKey('FinanceAccountantShift','centerOrgUnitId',scope.organizationId)} FOR UPDATE`;
    const shift=rows[0];if(!shift)throw new Error('FINANCE_SHIFT_NOT_FOUND');
    if(shift.accountantAccountId!==accountId)throw new Error('FINANCE_SHIFT_ACCOUNT_ISOLATION_DENIED');
    if(shift.status!=='OPEN')throw new Error('FINANCE_SHIFT_CLOSE_REQUIRES_OPEN_SHIFT');
    const handovers=await tx.$queryRaw<Array<{id:string}>>`SELECT "id" FROM "FinanceShiftHandover" WHERE "status"='PENDING' AND ("fromShiftId"=${financeKey('FinanceShiftHandover','fromShiftId',shiftId)} OR "toShiftId"=${financeKey('FinanceShiftHandover','toShiftId',shiftId)}) LIMIT 1`;
    if(handovers.length)throw new Error('FINANCE_SHIFT_CLOSE_HANDOVER_PENDING');
    return {scope,shift};
  }

  private async prepare(tx:Prisma.TransactionClient,scope:{organizationId:string;centerOrgUnitId:string},shift:ShiftRow,actualCashMinor:number,varianceReason?:string) {
    if(!Number.isSafeInteger(actualCashMinor)||actualCashMinor<0||actualCashMinor>maxMinor)throw new Error('FINANCE_AMOUNT_INVALID');
    const entries=await tx.$queryRaw<Array<{type:FinanceEntryType;amountMinor:number}>>`SELECT "type"::text AS "type","amountMinor" FROM "FinanceShiftEntry" WHERE "shiftId"=${financeKey('FinanceShiftEntry','shiftId',shift.id)}`;
    const totals=calculateFinanceShiftTotals(shift.openingBalanceMinor,entries);
    if(Object.values(totals).some(value=>!Number.isSafeInteger(value)||Math.abs(value)>maxMinor))throw new Error('FINANCE_AMOUNT_INVALID');
    const unresolved=await tx.$queryRaw<Array<{count:bigint}>>`SELECT (
      SELECT COUNT(*) FROM "FinanceShiftEntry" e WHERE e."shiftId"=${financeKey('FinanceShiftEntry','shiftId',shift.id)} AND (
        (e."type"='REVENUE' AND NOT EXISTS(
          SELECT 1 FROM "Payment" p JOIN "Booking" b ON b."id"=p."bookingId" JOIN "Trip" t ON t."id"=b."tripId"
          WHERE p."id"=e."paymentId" AND p."status"='CAPTURED' AND p."currency"=${shift.currency} AND p."amountMinor"=e."amountMinor"
            AND t."organizationId"=${financeKey('Organization','id',scope.organizationId)}
            AND EXISTS(SELECT 1 FROM "Invoice" i JOIN "Payment" origin ON origin."id"=i."paymentId" WHERE i."status" IN ('ISSUED','PAID') AND origin."bookingId"=p."bookingId" AND origin."accountId"=p."accountId")
        )) OR (e."referenceType"='RECEIVABLE_COLLECTION' AND NOT EXISTS(
          SELECT 1 FROM "ReceivablePayment" rp WHERE rp."id"::text=e."referenceId"::text AND rp."shiftId"=e."shiftId" AND rp."paymentId"=e."paymentId" AND rp."amountMinor"=e."amountMinor" AND rp."collectedByAccountId"=e."recordedByAccountId"
        ))
      )
    ) + (
      SELECT COUNT(*) FROM "ReceivablePayment" rp WHERE rp."shiftId"=${financeKey('FinanceAccountantShift','id',shift.id)} AND NOT EXISTS(
        SELECT 1 FROM "FinanceShiftEntry" e WHERE e."shiftId"=rp."shiftId" AND e."paymentId"=rp."paymentId" AND e."referenceType"='RECEIVABLE_COLLECTION' AND e."referenceId"::text=rp."id"::text AND e."amountMinor"=rp."amountMinor" AND e."recordedByAccountId"=rp."collectedByAccountId"
      )
    ) AS count`;
    const base=prepareAccountantShiftClose({accountantAccountId:shift.accountantAccountId,shiftAccountantAccountId:shift.accountantAccountId,shiftStatus:shift.status,openingBalanceMinor:shift.openingBalanceMinor,revenueMinor:totals.revenueMinor,expenseMinor:totals.expenseMinor,refundMinor:totals.refundMinor,adjustmentMinor:totals.adjustmentMinor,actualCashMinor,unresolvedPaymentCount:Number(unresolved[0].count),varianceReason});
    if(shift.currency!=='SAR')throw new Error('FINANCE_CURRENCY_UNSUPPORTED');
    return {...base,openingBalanceMinor:shift.openingBalanceMinor,revenueMinor:totals.revenueMinor,expenseMinor:totals.expenseMinor,refundMinor:totals.refundMinor,adjustmentMinor:totals.adjustmentMinor,varianceReason:base.varianceMinor===0?null:varianceReason?.trim()??null};
  }

  private async authorizeReviewer(tx:Prisma.TransactionClient,accountId:string,centerId:string) {
    const rows=await tx.$queryRaw<Array<{centerOrgUnitId:string;organizationId:string}>>`SELECT c."id" AS "centerOrgUnitId",c."organizationId" FROM "OrgUnit" c JOIN "Organization" o ON o."id"=c."organizationId" JOIN "Account" a ON a."id"=${financeKey('Account','id',accountId)} AND a."status"='ACTIVE' WHERE c."id"=${financeKey('OrgUnit','id',centerId)} AND c."type"='CENTER' AND c."active"=TRUE AND (
      EXISTS(SELECT 1 FROM "Employment" e JOIN "Position" p ON p."id"=e."positionId" AND p."active"=TRUE JOIN "OrgUnit" u ON u."id"=e."orgUnitId" WHERE e."accountId"=a."id" AND e."organizationId"=c."organizationId" AND e."status"='ACTIVE' AND p."code"='CENTER_MANAGER' AND u."id"=c."id") OR
      EXISTS(SELECT 1 FROM "Employment" e JOIN "Position" p ON p."id"=e."positionId" AND p."active"=TRUE JOIN "OrgUnit" u ON u."id"=e."orgUnitId" WHERE e."accountId"=a."id" AND e."organizationId"=c."organizationId" AND e."status"='ACTIVE' AND p."code" IN ('CENTRAL_FINANCE','FINANCE_MANAGER','EXECUTIVE') AND u."type"='HQ') OR
      EXISTS(SELECT 1 FROM "RoleAssignment" ra WHERE ra."accountId"=a."id" AND ra."role"='EXECUTIVE_APPROVER' AND ra."status"='ACTIVE' AND (ra."scope" IS NULL OR ra."scope"->>'organizationId'=c."organizationId")
      )) FOR SHARE OF a,c,o`;
    if(!rows[0])throw new Error('FINANCE_SHIFT_CLOSE_REVIEW_DENIED');
    return rows[0];
  }

  private async audit(tx:Prisma.TransactionClient,accountId:string,action:string,resourceId:string,metadata:Record<string,unknown>) {
    const actors=await tx.$queryRaw<Array<{personId:string}>>`SELECT "personId" FROM "Account" WHERE "id"=${financeKey('Account','id',accountId)} AND "status"='ACTIVE'`;
    if(!actors[0])throw new Error('FINANCE_ACCESS_IDENTITY_REQUIRED');
    await tx.auditEvent.create({data:{actorId:actors[0].personId,action,resource:'FinanceShiftCloseSubmission',resourceId,metadata:metadata as Prisma.InputJsonValue}});
  }
}
