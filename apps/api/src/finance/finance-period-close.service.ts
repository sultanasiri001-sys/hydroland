import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { FinanceAccessService } from './finance-access.service';
import { financeKey } from './finance-native-key';
import { assertFinancePeriodApproval, evaluateFinancePeriodClose, resolveFinancePeriodRange, type FinancePeriodType } from './finance-period-close.domain';

type PeriodSnapshot={periodType:FinancePeriodType;periodKey:string;timeZone:'Asia/Riyadh';startsAt:Date;endsAt:Date;state:'OPEN'|'READY';blockers:Array<{code:string;count:number}>;counts:{openShiftCount:number;unresolvedVarianceCount:number;unreconciledPaymentCount:number;pendingRefundCount:number;unpostedReceivableCount:number}};
type PeriodCenter={centerOrgUnitId:string;organizationId:string};
type ReviewerRole='CENTRAL_FINANCE'|'FINANCE_MANAGER'|'EXECUTIVE';

@Injectable()
export class FinancePeriodCloseService {
  constructor(private readonly db:DatabaseService,private readonly access:FinanceAccessService){}

  async preview(accountId:string,centerId:string,periodType:FinancePeriodType,periodKey:string){
    const range=resolveFinancePeriodRange(periodType,periodKey);
    return this.db.serializable(async tx=>{
      const scope=await this.access.requireBranchAccountant(accountId,centerId,tx);
      return this.snapshot(tx,{centerOrgUnitId:centerId,organizationId:scope.organizationId},range);
    });
  }

  async reviewCenters(accountId:string){
    return this.db.$queryRaw<Array<{id:string;name:string;organizationName:string}>>`SELECT DISTINCT c."id",c."nameAr" AS "name",o."displayName" AS "organizationName" FROM "OrgUnit" c JOIN "Organization" o ON o."id"=c."organizationId" JOIN "Account" a ON a."id"=${financeKey('Account','id',accountId)} AND a."status"='ACTIVE' WHERE c."type"='CENTER' AND c."active"=TRUE AND (
      EXISTS(SELECT 1 FROM "Employment" e JOIN "Position" p ON p."id"=e."positionId" AND p."active"=TRUE JOIN "OrgUnit" u ON u."id"=e."orgUnitId" WHERE e."accountId"=a."id" AND e."organizationId"=c."organizationId" AND e."status"='ACTIVE' AND p."code" IN ('CENTRAL_FINANCE','FINANCE_MANAGER','EXECUTIVE') AND u."type"='HQ') OR
      EXISTS(SELECT 1 FROM "RoleAssignment" ra WHERE ra."accountId"=a."id" AND ra."role"='EXECUTIVE_APPROVER' AND ra."status"='ACTIVE' AND (ra."scope" IS NULL OR ra."scope"->>'organizationId'=c."organizationId"::text))) ORDER BY o."displayName",c."nameAr",c."id"`;
  }

  async submit(accountId:string,centerId:string,periodType:FinancePeriodType,periodKey:string){
    const range=resolveFinancePeriodRange(periodType,periodKey);
    return this.db.serializable(async tx=>{
      const scope=await this.access.requireBranchAccountant(accountId,centerId,tx);
      await this.access.requireCenterOrganizationAccountant(accountId,scope.organizationId,tx);
      const center={centerOrgUnitId:centerId,organizationId:scope.organizationId};
      const readiness=await this.snapshot(tx,center,range);
      if(readiness.endsAt.getTime()>Date.now())throw new Error('FINANCE_PERIOD_NOT_ENDED');
      if(readiness.state!=='READY')throw new Error('FINANCE_PERIOD_CLOSE_BLOCKED');
      const current=await tx.$queryRaw<Array<{id:string;status:string}>>`SELECT "id","status"::text AS "status" FROM "FinancePeriodCloseSubmission" WHERE "centerOrgUnitId"=${financeKey('FinancePeriodCloseSubmission','centerOrgUnitId',centerId)} AND "periodType"=${periodType}::"FinancePeriodType" AND "periodKey"=${periodKey} ORDER BY "revision" DESC LIMIT 1 FOR UPDATE`;
      if(current[0]?.status==='CLOSED')throw new Error('FINANCE_PERIOD_ALREADY_CLOSED');
      if(current[0]?.status==='SUBMITTED')throw new Error('FINANCE_PERIOD_CLOSE_ALREADY_SUBMITTED');
      const latest=await tx.$queryRaw<Array<{revision:number|null}>>`SELECT MAX("revision")::int AS "revision" FROM "FinancePeriodCloseSubmission" WHERE "centerOrgUnitId"=${financeKey('FinancePeriodCloseSubmission','centerOrgUnitId',centerId)} AND "periodType"=${periodType}::"FinancePeriodType" AND "periodKey"=${periodKey}`;
      const revision=(latest[0]?.revision??0)+1;
      const submissionId=randomUUID();
      await tx.$executeRaw`INSERT INTO "FinancePeriodCloseSubmission" ("id","centerOrgUnitId","periodType","periodKey","revision","submittedByAccountId","status","readinessSnapshot") VALUES (${financeKey('FinancePeriodCloseSubmission','id',submissionId)},${financeKey('FinancePeriodCloseSubmission','centerOrgUnitId',centerId)},${periodType}::"FinancePeriodType",${periodKey},${revision},${financeKey('FinancePeriodCloseSubmission','submittedByAccountId',accountId)},'SUBMITTED'::"FinancePeriodCloseStatus",${JSON.stringify(readiness)}::jsonb)`;
      await this.audit(tx,accountId,'FINANCE_PERIOD_CLOSE_SUBMITTED',submissionId,{centerOrgUnitId:centerId,periodType,periodKey,revision,readiness});
      return{submissionId,centerOrgUnitId:centerId,periodType,periodKey,revision,status:'SUBMITTED',requiredApprovals:2,readiness};
    });
  }

  async pending(accountId:string,centerId:string){
    return this.db.serializable(async tx=>{
      const target=await this.authorizeCenterReviewer(tx,accountId,centerId);
      if(!(await this.authorizePeriodApprover(tx,accountId,target.organizationId)))throw new Error('FINANCE_PERIOD_APPROVER_ACCESS_DENIED');
      const rows=await tx.$queryRaw<Array<{id:string;periodType:FinancePeriodType;periodKey:string;revision:number;submittedAt:Date;submittedByName:string|null;submittedByAccountId:string;readinessSnapshot:unknown}>>`SELECT s."id",s."periodType"::text AS "periodType",s."periodKey",s."revision",s."submittedAt",s."submittedByAccountId",s."readinessSnapshot",concat_ws(' ',p."firstName",p."lastName") AS "submittedByName" FROM "FinancePeriodCloseSubmission" s JOIN "Account" a ON a."id"=s."submittedByAccountId" JOIN "Person" p ON p."id"=a."personId" WHERE s."centerOrgUnitId"=${financeKey('FinancePeriodCloseSubmission','centerOrgUnitId',target.centerOrgUnitId)} AND s."status"='SUBMITTED' ORDER BY s."submittedAt",s."id"`;
      const approvals=await tx.$queryRaw<Array<{submissionId:string;reviewerName:string|null;reviewerRole:ReviewerRole;decision:string;note:string|null;createdAt:Date}>>`SELECT approval."submissionId",concat_ws(' ',person."firstName",person."lastName") AS "reviewerName",approval."reviewerRole"::text AS "reviewerRole",approval."decision"::text AS "decision",approval."note",approval."createdAt" FROM "FinancePeriodCloseApproval" approval JOIN "Account" a ON a."id"=approval."reviewerAccountId" JOIN "Person" person ON person."id"=a."personId" WHERE approval."submissionId" IN (SELECT "id" FROM "FinancePeriodCloseSubmission" WHERE "centerOrgUnitId"=${financeKey('FinancePeriodCloseSubmission','centerOrgUnitId',target.centerOrgUnitId)} AND "status"='SUBMITTED') ORDER BY approval."createdAt",approval."id"`;
      return rows.map(row=>({...row,requiredApprovals:2,approvals:approvals.filter(a=>a.submissionId===row.id)}));
    });
  }

  async decide(accountId:string,submissionId:string,decision:'APPROVED'|'REJECTED',note?:string){
    if(!['APPROVED','REJECTED'].includes(decision))throw new Error('FINANCE_PERIOD_DECISION_INVALID');
    if(note!=null&&(typeof note!=='string'||note.trim().length>1000))throw new Error('FINANCE_PERIOD_REVIEW_NOTE_INVALID');
    if(decision==='REJECTED'&&(note?.trim().length??0)<10)throw new Error('FINANCE_PERIOD_REJECTION_REASON_REQUIRED');
    return this.db.serializable(async tx=>{
      const submissions=await tx.$queryRaw<Array<{id:string;centerOrgUnitId:string;periodType:FinancePeriodType;periodKey:string;revision:number;submittedByAccountId:string;status:string}>>`SELECT "id","centerOrgUnitId","periodType"::text AS "periodType","periodKey","revision","submittedByAccountId","status"::text AS "status" FROM "FinancePeriodCloseSubmission" WHERE "id"=${financeKey('FinancePeriodCloseSubmission','id',submissionId)} FOR UPDATE`;
      const submission=submissions[0];if(!submission)throw new Error('FINANCE_PERIOD_CLOSE_NOT_FOUND');
      const center=await this.authorizeCenterReviewer(tx,accountId,submission.centerOrgUnitId);
      const role=await this.authorizePeriodApprover(tx,accountId,center.organizationId);
      if(!role)throw new Error('FINANCE_PERIOD_APPROVER_ACCESS_DENIED');
      if(submission.submittedByAccountId===accountId)throw new Error('FINANCE_PERIOD_REVIEW_SOD_VIOLATION');
      if(submission.status!=='SUBMITTED')throw new Error('FINANCE_PERIOD_CLOSE_ALREADY_REVIEWED');
      const prior=await tx.$queryRaw<Array<{reviewerAccountId:string;decision:string}>>`SELECT "reviewerAccountId","decision"::text AS "decision" FROM "FinancePeriodCloseApproval" WHERE "submissionId"=${financeKey('FinancePeriodCloseApproval','submissionId',submissionId)} ORDER BY "createdAt","id"`;
      const result=assertFinancePeriodApproval({requestedBy:submission.submittedByAccountId,reviewerAccountId:accountId,decision,approvedAccountIds:prior.filter(x=>x.decision==='APPROVED').map(x=>x.reviewerAccountId)});
      const approvalId=randomUUID();
      await tx.$executeRaw`INSERT INTO "FinancePeriodCloseApproval" ("id","submissionId","reviewerAccountId","reviewerRole","decision","note") VALUES (${financeKey('FinancePeriodCloseApproval','id',approvalId)},${financeKey('FinancePeriodCloseApproval','submissionId',submissionId)},${financeKey('FinancePeriodCloseApproval','reviewerAccountId',accountId)},${role}::"FinancePeriodCloseReviewerRole",${decision}::"FinancePeriodCloseApprovalDecision",${note?.trim()||null})`;
      if(result.rejected){
        await tx.$executeRaw`UPDATE "FinancePeriodCloseSubmission" SET "status"='REJECTED'::"FinancePeriodCloseStatus" WHERE "id"=${financeKey('FinancePeriodCloseSubmission','id',submissionId)} AND "status"='SUBMITTED'`;
      }else if(result.closes){
        await tx.$executeRaw`UPDATE "FinancePeriodCloseSubmission" SET "status"='CLOSED'::"FinancePeriodCloseStatus","closedAt"=NOW() WHERE "id"=${financeKey('FinancePeriodCloseSubmission','id',submissionId)} AND "status"='SUBMITTED'`;
      }
      await this.audit(tx,accountId,`FINANCE_PERIOD_CLOSE_${decision}`,submissionId,{centerOrgUnitId:submission.centerOrgUnitId,periodType:submission.periodType,periodKey:submission.periodKey,revision:submission.revision,approvalCount:result.approvalCount,status:result.rejected?'REJECTED':result.closes?'CLOSED':'SUBMITTED',reason:note?.trim()??null});
      return{submissionId,status:result.rejected?'REJECTED':result.closes?'CLOSED':'SUBMITTED',approvalCount:result.approvalCount,requiredApprovals:2};
    });
  }

  private async snapshot(tx:Prisma.TransactionClient,center:PeriodCenter,range:ReturnType<typeof resolveFinancePeriodRange>):Promise<PeriodSnapshot>{
    const rows=await tx.$queryRaw<Array<{openShiftCount:bigint;unresolvedVarianceCount:bigint;unreconciledPaymentCount:bigint;pendingRefundCount:bigint;unpostedReceivableCount:bigint}>>`
      SELECT
        (SELECT COUNT(*) FROM "FinanceAccountantShift" s WHERE s."centerOrgUnitId"=${financeKey('FinanceAccountantShift','centerOrgUnitId',center.centerOrgUnitId)} AND s."openedAt"<${range.endsAt} AND (s."closedAt" IS NULL OR s."closedAt">=${range.startsAt}) AND s."status" IN ('OPEN','HANDOVER_PENDING')) AS "openShiftCount",
        (SELECT COUNT(*) FROM "FinanceAccountantShift" s LEFT JOIN LATERAL (
          SELECT submission."status" FROM "FinanceShiftCloseSubmission" submission WHERE submission."shiftId"=s."id" ORDER BY submission."revision" DESC LIMIT 1
        ) latest ON TRUE WHERE s."centerOrgUnitId"=${financeKey('FinanceAccountantShift','centerOrgUnitId',center.centerOrgUnitId)} AND s."openedAt"<${range.endsAt} AND (s."closedAt" IS NULL OR s."closedAt">=${range.startsAt}) AND s."status"='CLOSED' AND latest."status" IS DISTINCT FROM 'APPROVED') AS "unresolvedVarianceCount",
        ((SELECT COUNT(*) FROM "FinanceShiftEntry" e JOIN "FinanceAccountantShift" s ON s."id"=e."shiftId"
          WHERE s."centerOrgUnitId"=${financeKey('FinanceAccountantShift','centerOrgUnitId',center.centerOrgUnitId)} AND s."openedAt">=${range.startsAt} AND s."openedAt"<${range.endsAt} AND e."type"='REVENUE' AND (
            e."paymentId" IS NULL OR NOT EXISTS(SELECT 1 FROM "Payment" p JOIN "Booking" b ON b."id"=p."bookingId" JOIN "Trip" t ON t."id"=b."tripId" WHERE p."id"=e."paymentId" AND p."status"='CAPTURED' AND p."currency"='SAR' AND p."amountMinor"=e."amountMinor" AND t."organizationId"=${financeKey('Organization','id',center.organizationId)})
            OR (e."referenceType"='RECEIVABLE_COLLECTION' AND NOT EXISTS(SELECT 1 FROM "ReceivablePayment" rp WHERE rp."id"::text=e."referenceId"::text AND rp."shiftId"=e."shiftId" AND rp."paymentId"=e."paymentId" AND rp."amountMinor"=e."amountMinor" AND rp."collectedByAccountId"=e."recordedByAccountId"))
          )) + (SELECT COUNT(*) FROM "ReceivablePayment" rp JOIN "FinanceAccountantShift" s ON s."id"=rp."shiftId" WHERE s."centerOrgUnitId"=${financeKey('FinanceAccountantShift','centerOrgUnitId',center.centerOrgUnitId)} AND s."openedAt">=${range.startsAt} AND s."openedAt"<${range.endsAt} AND NOT EXISTS(SELECT 1 FROM "FinanceShiftEntry" e WHERE e."shiftId"=rp."shiftId" AND e."paymentId"=rp."paymentId" AND e."referenceType"='RECEIVABLE_COLLECTION' AND e."referenceId"::text=rp."id"::text AND e."amountMinor"=rp."amountMinor" AND e."recordedByAccountId"=rp."collectedByAccountId"))) AS "unreconciledPaymentCount",
        (SELECT COUNT(DISTINCT event."resourceId") FROM "AuditEvent" event JOIN "Payment" p ON p."id"::text=event."resourceId"::text JOIN "Booking" b ON b."id"=p."bookingId" JOIN "Trip" t ON t."id"=b."tripId" WHERE event."resource"='Payment' AND event."action"='PAYMENT_REFUND_REQUESTED' AND event."occurredAt">=${range.startsAt} AND event."occurredAt"<${range.endsAt} AND p."status"<>'REFUNDED' AND t."organizationId"=${financeKey('Organization','id',center.organizationId)}) AS "pendingRefundCount",
        (SELECT COUNT(*) FROM "Receivable" r WHERE r."centerOrgUnitId"=${financeKey('Receivable','centerOrgUnitId',center.centerOrgUnitId)} AND r."createdAt">=${range.startsAt} AND r."createdAt"<${range.endsAt} AND r."outstandingMinor">0 AND NOT EXISTS(SELECT 1 FROM "FinanceEntry" entry WHERE entry."organizationId"=${financeKey('FinanceEntry','organizationId',center.organizationId)} AND entry."status"='POSTED' AND entry."referenceType"='RECEIVABLE' AND entry."referenceId" IN (r."id"::text,r."invoiceId"::text))) AS "unpostedReceivableCount"`;
    const counts={openShiftCount:Number(rows[0].openShiftCount),unresolvedVarianceCount:Number(rows[0].unresolvedVarianceCount),unreconciledPaymentCount:Number(rows[0].unreconciledPaymentCount),pendingRefundCount:Number(rows[0].pendingRefundCount),unpostedReceivableCount:Number(rows[0].unpostedReceivableCount)};
    const evaluated=evaluateFinancePeriodClose({periodType:range.periodType,periodKey:range.periodKey,...counts});
    return{periodType:range.periodType,periodKey:range.periodKey,timeZone:range.timeZone,startsAt:range.startsAt,endsAt:range.endsAt,state:evaluated.state,blockers:evaluated.blockers,counts};
  }

  private async authorizeCenterReviewer(tx:Prisma.TransactionClient,accountId:string,centerId:string){
    const rows=await tx.$queryRaw<Array<{centerOrgUnitId:string;organizationId:string}>>`SELECT c."id" AS "centerOrgUnitId",c."organizationId" FROM "OrgUnit" c JOIN "Account" a ON a."id"=${financeKey('Account','id',accountId)} AND a."status"='ACTIVE' WHERE c."id"=${financeKey('OrgUnit','id',centerId)} AND c."type"='CENTER' AND c."active"=TRUE AND (
      EXISTS(SELECT 1 FROM "Employment" e JOIN "Position" p ON p."id"=e."positionId" AND p."active"=TRUE JOIN "OrgUnit" u ON u."id"=e."orgUnitId" WHERE e."accountId"=a."id" AND e."organizationId"=c."organizationId" AND e."status"='ACTIVE' AND p."code"='CENTER_MANAGER' AND u."id"=c."id") OR
      EXISTS(SELECT 1 FROM "Employment" e JOIN "Position" p ON p."id"=e."positionId" AND p."active"=TRUE JOIN "OrgUnit" u ON u."id"=e."orgUnitId" WHERE e."accountId"=a."id" AND e."organizationId"=c."organizationId" AND e."status"='ACTIVE' AND p."code" IN ('CENTRAL_FINANCE','FINANCE_MANAGER','EXECUTIVE') AND u."type"='HQ') OR
      EXISTS(SELECT 1 FROM "RoleAssignment" ra WHERE ra."accountId"=a."id" AND ra."role"='EXECUTIVE_APPROVER' AND ra."status"='ACTIVE' AND (ra."scope" IS NULL OR ra."scope"->>'organizationId'=c."organizationId"::text))) FOR SHARE OF a,c`;
    if(!rows[0])throw new Error('FINANCE_PERIOD_CLOSE_REVIEW_DENIED');
    return rows[0];
  }

  private async authorizePeriodApprover(tx:Prisma.TransactionClient,accountId:string,organizationId:string):Promise<ReviewerRole|null>{
    const rows=await tx.$queryRaw<Array<{reviewerRole:ReviewerRole}>>`SELECT role."reviewerRole" FROM (
      SELECT p."code" AS "reviewerRole" FROM "Employment" e JOIN "Account" a ON a."id"=e."accountId" AND a."status"='ACTIVE' JOIN "Position" p ON p."id"=e."positionId" AND p."active"=TRUE JOIN "OrgUnit" u ON u."id"=e."orgUnitId" AND u."type"='HQ' AND u."organizationId"=e."organizationId" WHERE e."accountId"=${financeKey('Account','id',accountId)} AND e."organizationId"=${financeKey('Organization','id',organizationId)} AND e."status"='ACTIVE' AND p."code" IN ('CENTRAL_FINANCE','FINANCE_MANAGER','EXECUTIVE')
      UNION ALL SELECT 'EXECUTIVE' AS "reviewerRole" FROM "RoleAssignment" ra JOIN "Account" a ON a."id"=ra."accountId" AND a."status"='ACTIVE' WHERE ra."accountId"=${financeKey('Account','id',accountId)} AND ra."role"='EXECUTIVE_APPROVER' AND ra."status"='ACTIVE' AND (ra."scope" IS NULL OR ra."scope"->>'organizationId'=${organizationId})
    ) role LIMIT 1`;
    return rows[0]?.reviewerRole??null;
  }

  private async audit(tx:Prisma.TransactionClient,accountId:string,action:string,resourceId:string,metadata:Record<string,unknown>){
    const actors=await tx.$queryRaw<Array<{personId:string}>>`SELECT "personId" FROM "Account" WHERE "id"=${financeKey('Account','id',accountId)} AND "status"='ACTIVE'`;
    if(!actors[0])throw new Error('FINANCE_ACCESS_IDENTITY_REQUIRED');
    await tx.auditEvent.create({data:{actorId:actors[0].personId,action,resource:'FinancePeriodCloseSubmission',resourceId,metadata:metadata as Prisma.InputJsonValue}});
  }
}
