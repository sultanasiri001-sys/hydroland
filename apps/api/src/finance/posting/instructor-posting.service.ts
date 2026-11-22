import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { DatabaseService } from '../../database/database.service';
import { requirePlatformFinanceApprover } from '../finance-operation-grant.service';
import { postingTransaction, requirePostingEnabled, verifiedEntry } from './ledger-proof';
import { compensationAmount } from '../../organizations/instructor-compensation';
import { requireCourseCollection } from '../../commerce/course-collection';
import { minor, textId } from '../../rewards/loyalty-rules';

type Tx = Prisma.TransactionClient;
async function centerOwner(tx: Tx, actor:string, organizationId:string|null) {
  if (!organizationId || !await tx.organization.findFirst({where:{id:organizationId,ownerId:actor,status:'ACTIVE'}})) {
    throw new ForbiddenException('Supplying center owner required.');
  }
}
@Injectable()
export class InstructorPostingService {
  constructor(private readonly db: DatabaseService) {}

  async accrue(actor:string,enrollmentId:string,agreementId:string,collectionId:string,attestation:string) {
    requirePostingEnabled();
    if (!textId(attestation)||!textId(agreementId)||!textId(collectionId)) throw new BadRequestException('Agreement, collection and timing evidence required.');
    return postingTransaction(this.db,async tx=>{
      const course=await tx.trainingEnrollment.findUniqueOrThrow({where:{id:enrollmentId}});
      await centerOwner(tx,actor,course.centerOrganizationId);
      const agreement=await tx.instructorCompensationAgreement.findUniqueOrThrow({where:{id:agreementId}});
      if (!course.instructorAccountId || agreement.instructorAccountId!==course.instructorAccountId
        || agreement.organizationId!==course.centerOrganizationId || agreement.currency!=='SAR') throw new ConflictException('Instructor agreement mismatch.');
      const old=await tx.instructorEarning.findUnique({where:{trainingEnrollmentId:enrollmentId}});
      if (old) {
        const snapshot=await tx.instructorEarningPosting.findUnique({where:{earningId:old.id}});
        if(!snapshot||snapshot.agreementId!==agreementId||snapshot.collectionId!==collectionId||snapshot.evidence!==attestation)
          throw new ConflictException('Existing instructor earning requires reconciliation.');
        return {earning:old,posting:snapshot};
      }
      if (!['ACTIVE','COMPLETED'].includes(course.status)) throw new ConflictException('Enrollment is not eligible.');
      const latest=await tx.instructorCompensationAgreement.findFirst({where:{organizationId:agreement.organizationId,
        instructorAccountId:agreement.instructorAccountId,recordedAt:{lte:course.enrolledAt}},orderBy:{revision:'desc'}});
      if (latest?.id!==agreement.id) throw new ConflictException('Agreement revision at enrollment must match.');
      if (agreement.mode==='SALARY_ONLY') return {earning:null,posting:null};
      if (!agreement.earningTiming || !agreement.reversalTerms) throw new ConflictException('Documented agreement terms required.');
      const entry=await verifiedEntry(tx,collectionId);
      if (entry.type!=='REVENUE'||entry.referenceType!=='TRAINING_ENROLLMENT_COLLECTION'||entry.referenceId!==course.id
        || entry.organizationId!==agreement.organizationId) throw new ConflictException('Course receipt mismatch.');
      if (course.storeCourseOfferId) {
        const collection=await requireCourseCollection(tx,course);
        if(collection?.financeEntryId!==entry.id) throw new ConflictException('Original store collection required.');
      }
      const amountMinor=compensationAmount(agreement,entry.amountMinor);
      if(!minor(amountMinor)||!amountMinor) throw new ConflictException('Invalid earning amount.');
      const earning=await tx.instructorEarning.create({data:{trainingEnrollmentId:course.id,instructorAccountId:course.instructorAccountId,
        centerOrganizationId:course.centerOrganizationId,amountMinor,currency:'SAR',status:'PENDING'}});
      const posting=await tx.instructorEarningPosting.create({data:{earningId:earning.id,agreementId,collectionId,
        basisMinor:entry.amountMinor,stage:'EARNED',evidence:attestation,approvedTerms:{mode:agreement.mode,rateBps:agreement.rateBps,
          fixedMinor:agreement.fixedMinor,revision:agreement.revision,earningTiming:agreement.earningTiming,reversalTerms:agreement.reversalTerms,attestedBy:actor}}});
      return {earning,posting};
    });
  }
  async review(actor:string,id:string,decision:'HOLD'|'PAYABLE',reason:string) {
    requirePostingEnabled();
    if(!['HOLD','PAYABLE'].includes(decision)||!textId(reason)) throw new BadRequestException('Review decision and reference required.');
    return postingTransaction(this.db,async tx=>{
      const owner=await requirePlatformFinanceApprover(tx,actor);
      const state=await tx.instructorEarningPosting.findUniqueOrThrow({where:{earningId:id}});
      if(state.stage===decision) return state;
      if(!['EARNED','HOLD','PAYABLE','FAILED'].includes(state.stage)) throw new ConflictException('Earning is not reviewable.');
      await tx.instructorEarning.update({where:{id},data:{status:decision==='PAYABLE'?'APPROVED':'PENDING',
        approvedAt:decision==='PAYABLE'?new Date():null,approvedByAccountId:decision==='PAYABLE'?actor:null}});
      await tx.auditEvent.create({data:{actorId:owner.personId,action:'INSTRUCTOR_EARNING_'+decision,resource:'InstructorEarning',resourceId:id,metadata:{reason}}});
      return tx.instructorEarningPosting.update({where:{earningId:id},data:{stage:decision}});
    });
  }
  async prepare(actor:string,id:string,attemptId:string) {
    requirePostingEnabled();
    if(!textId(attemptId)) throw new BadRequestException('Transfer attempt reference required.');
    return postingTransaction(this.db,async tx=>{
      await requirePlatformFinanceApprover(tx,actor);
      const state=await tx.instructorEarningPosting.findUniqueOrThrow({where:{earningId:id}});
      const prior=await tx.instructorTransferAttempt.findUnique({where:{id:attemptId}});
      if(prior) {
        if(prior.earningId!==id) throw new ConflictException('Transfer attempt belongs to another earning.');
        return prior;
      }
      if(state.stage!=='PAYABLE') throw new ConflictException('Earning is not payable.');
      await tx.instructorEarningPosting.update({where:{earningId:id},data:{stage:'PROCESSING',attemptId}});
      return tx.instructorTransferAttempt.create({data:{id:attemptId,earningId:id,status:'PROCESSING'}});
    });
  }

  // The payout integration supplies a verified terminal event. An outgoing request or a timeout is insufficient.
  async reconcile(actor:string,attemptId:string,evidenceId:string,entryId?:string) {
    requirePostingEnabled();
    return postingTransaction(this.db,async tx=>{
      await requirePlatformFinanceApprover(tx,actor);
      const attempt=await tx.instructorTransferAttempt.findUniqueOrThrow({where:{id:attemptId}});
      const earning=await tx.instructorEarning.findUniqueOrThrow({where:{id:attempt.earningId}});
      const state=await tx.instructorEarningPosting.findUniqueOrThrow({where:{earningId:earning.id}});
      if(attempt.status!=='PROCESSING') {
        if(attempt.evidenceId===evidenceId && (attempt.status==='FAILED'? !entryId : earning.financeEntryId===entryId)) return attempt;
        throw new ConflictException('Transfer attempt already finalized.');
      }
      const event=await tx.auditEvent.findUniqueOrThrow({where:{id:evidenceId}});
      const proof=event.metadata as Record<string,unknown>|null;
      if(state.stage!=='PROCESSING'||state.attemptId!==attemptId||event.resource!=='InstructorTransferAttempt'||event.resourceId!==attemptId
        || !['INSTRUCTOR_TRANSFER_CONFIRMED','INSTRUCTOR_TRANSFER_FAILED'].includes(event.action)
        || !proof||proof.earningId!==earning.id||proof.instructorAccountId!==earning.instructorAccountId||proof.organizationId!==earning.centerOrganizationId
        ||proof.amountMinor!==earning.amountMinor||proof.currency!=='SAR'||!textId(proof.providerReference)||event.occurredAt<attempt.createdAt)
        throw new ConflictException('Verified transfer result does not match.');
      const success=event.action==='INSTRUCTOR_TRANSFER_CONFIRMED';
      if(success) {
        if(!entryId) throw new ConflictException('Posted settlement required.');
        const settlement=await verifiedEntry(tx,entryId);
        if(settlement.type!=='SETTLEMENT'||settlement.referenceType!=='INSTRUCTOR_PAYOUT'||settlement.referenceId!==attemptId
          ||settlement.organizationId!==earning.centerOrganizationId||settlement.amountMinor!==earning.amountMinor)
          throw new ConflictException('Settlement entry mismatch.');
        await tx.instructorEarning.update({where:{id:earning.id},data:{status:'SETTLED',settledAt:event.occurredAt,financeEntryId:entryId}});
      } else if(entryId) throw new ConflictException('A failed transfer cannot settle an earning.');
      const stage=success?'SETTLED':'FAILED';
      await tx.instructorEarningPosting.update({where:{earningId:earning.id},data:{stage,confirmedReference:success?proof.providerReference:null}});
      return tx.instructorTransferAttempt.update({where:{id:attemptId},data:{status:stage,finishedAt:event.occurredAt,evidenceId}});
    });
  }

  async recover(actor:string, refundId:string, entryId:string, evidenceId:string) {
    requirePostingEnabled();
    return postingTransaction(this.db,async tx=>{
      await requirePlatformFinanceApprover(tx,actor);
      const recovery=await tx.instructorRecovery.findUniqueOrThrow({where:{id:refundId}});
      const earning=await tx.instructorEarning.findUniqueOrThrow({where:{id:recovery.earningId}});
      if(recovery.stage==='RECOVERED' && recovery.settledEntryId===entryId) return recovery;
      if(recovery.stage!=='RECOVERY_REQUIRED') throw new ConflictException('No outstanding instructor recovery.');
      const entry=await verifiedEntry(tx,entryId);
      const event=await tx.auditEvent.findUniqueOrThrow({where:{id:evidenceId}});
      const evidence=event.metadata as Record<string,unknown>|null;
      if(entry.referenceType!=='INSTRUCTOR_PAYOUT_RECOVERY'||entry.referenceId!==refundId||entry.type!=='REVENUE'
        ||entry.organizationId!==earning.centerOrganizationId||entry.amountMinor!==recovery.amountMinor
        ||event.action!=='INSTRUCTOR_RECOVERY_CONFIRMED'||event.resource!=='InstructorRecovery'||event.resourceId!==refundId
        ||event.occurredAt<recovery.createdAt||!evidence||evidence.amountMinor!==recovery.amountMinor||evidence.currency!=='SAR'
        ||evidence.instructorAccountId!==earning.instructorAccountId||evidence.organizationId!==earning.centerOrganizationId
        ||!textId(evidence.providerReference)) throw new ConflictException('Confirmed return of the original payout is required.');
      const result=await tx.instructorRecovery.update({where:{id:refundId},data:{stage:'RECOVERED',settledEntryId:entryId,recoveredAt:event.occurredAt}});
      const open=await tx.instructorRecovery.count({where:{earningId:earning.id,stage:'RECOVERY_REQUIRED'}});
      if(!open) await tx.instructorEarningPosting.update({where:{earningId:earning.id},data:{stage:'SETTLED_WITH_RECOVERY'}});
      return result;
    });
  }

  async reverse(actor:string,id:string,refundEntryId:string,amountMinor:number,decisionReference:string) {
    requirePostingEnabled();
    if(!minor(amountMinor)||!textId(decisionReference)) throw new BadRequestException('Agreement reversal decision required.');
    return postingTransaction(this.db,async tx=>{
      const earning=await tx.instructorEarning.findUniqueOrThrow({where:{id}});
      await centerOwner(tx,actor,earning.centerOrganizationId);
      const state=await tx.instructorEarningPosting.findUniqueOrThrow({where:{earningId:id}});
      const prior=await tx.instructorRecovery.findUnique({where:{id:refundEntryId}});
      if(prior) {
        if(prior.earningId===id&&prior.amountMinor===amountMinor&&prior.reason===decisionReference) return prior;
        throw new ConflictException('Refund already reviewed.');
      }
      if(state.stage==='PROCESSING') throw new ConflictException('Resolve the in-flight payout first.');
      const entry=await verifiedEntry(tx,refundEntryId);
      const direct=entry.referenceType==='TRAINING_ENROLLMENT_REFUND'&&entry.referenceId===earning.trainingEnrollmentId;
      const linked=await tx.checkoutRefund.findFirst({where:{financeEntryId:refundEntryId,status:'POSTED',postedAt:{not:null},
        checkout:{sourceType:'TRAINING_ENROLLMENT',sourceId:earning.trainingEnrollmentId}}});
      if(entry.type!=='REFUND'||entry.organizationId!==earning.centerOrganizationId||(!direct&&!linked))
        throw new ConflictException('Posted refund for the same enrollment required.');
      const settled=earning.status==='SETTLED';
      const recovered=settled?await tx.instructorRecovery.aggregate({where:{earningId:id,stage:{in:['RECOVERY_REQUIRED','RECOVERED']}},_sum:{amountMinor:true}}):null;
      if(amountMinor>earning.amountMinor-(recovered?._sum.amountMinor??0)) throw new ConflictException('Reversal exceeds the earning.');
      const stage=!amountMinor?'RETAINED':settled?'RECOVERY_REQUIRED':'REVERSED';
      if(amountMinor && !settled){
        const remaining=earning.amountMinor-amountMinor;
        await tx.instructorEarning.update({where:{id},data:{amountMinor:remaining,status:remaining?'PENDING':'VOIDED',approvedByAccountId:null,approvedAt:null}});
        await tx.instructorEarningPosting.update({where:{earningId:id},data:{stage:remaining?'HOLD':'REVERSED'}});
      } else if(amountMinor) await tx.instructorEarningPosting.update({where:{earningId:id},data:{stage}});
      return tx.instructorRecovery.create({data:{id:refundEntryId,earningId:id,actorId:actor,amountMinor,reason:decisionReference,stage}});
    });
  }
}
