import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Prisma, TrainingCertificate, TrainingCertificateStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { TrainingAuthorizationService } from './training-authorization.service';
import { trainingCompletion } from './training-completion-policy';
import { assertTrainingStandardCompletion, standardRequest } from './training-standard-store';
import { certificateCompletionReadiness } from './training-certificate-readiness';
import { certificateActions, certificateActorProjection, certificateDecisionSnapshot, certificateEvidenceDigest, certificateHistory, certificateObject, certificateStateDigest, internalCertificate } from './training-certificate-presentation';
import { hasInstructorCenterAccess } from './training-center-scope';
import { trainingCertificationSource } from './training-certification-contract';
import type { TrainingStandardBinding } from './training-standard-profile';

const graph = {
  enrollment: true,
  stages: { include: { skills: true }, orderBy: { sequence: 'asc' as const } },
  sessions: { select: { status: true, startsAt: true, endsAt: true }, orderBy: { startsAt: 'asc' as const } },
} satisfies Prisma.TrainingRecordInclude;
type RecordGraph = Prisma.TrainingRecordGetPayload<{ include: typeof graph }>;

@Injectable()
export class TrainingCertificateService {
  constructor(private readonly db: DatabaseService, private readonly authorization: TrainingAuthorizationService, private readonly audit: AuditService) {}

  private certificate(row: TrainingCertificate) {
    return internalCertificate(row);
  }

  private reasons(record: RecordGraph) {
    const reasons = [...trainingCompletion(record).reasons];
    if (record.status !== 'COMPLETED' || record.progressPercent !== 100 || record.enrollment.status !== 'COMPLETED') reasons.push('يجب إتمام سجل الدورة والتسجيل بنسبة 100% قبل اعتماد الشهادة.');
    return reasons;
  }

  private reviewReasons(row: TrainingCertificate & { trainingRecord: RecordGraph }) {
    const reasons = this.reasons(row.trainingRecord), enrollment = row.trainingRecord.enrollment;
    if (row.studentAccountId !== enrollment.studentAccountId || row.courseCode !== enrollment.courseCode || row.recommendedByInstructorId !== enrollment.instructorAccountId) reasons.push('بيانات التوصية لا تطابق المتدرب والدورة والمدرب في السجل.');
    return reasons;
  }

  private independent(row: TrainingCertificate & { trainingRecord: RecordGraph }, actorId: string) {
    return ![row.studentAccountId, row.recommendedByInstructorId, row.trainingRecord.enrollment.studentAccountId, row.trainingRecord.enrollment.instructorAccountId].includes(actorId);
  }

  async recommend(trainingRecordId: string, actorId: string) {
    const occurrenceId = randomUUID(), recommendedAt = new Date();
    const work = async (tx: Prisma.TransactionClient) => {
      const record = await tx.trainingRecord.findUnique({ where: { id: trainingRecordId }, include: { ...graph, certificate: true } });
      if (!record) throw new NotFoundException('سجل التدريب غير موجود.');
      await this.authorization.assertProfessionalEnrollmentAccess(actorId, record.enrollmentId, tx);
      await standardRequest(()=>assertTrainingStandardCompletion(tx,record.enrollmentId));
      const reasons = this.reasons(record);
      if (reasons.length) throw new ConflictException(reasons.join(' '));
      if (record.certificate) return { ...this.certificate(record.certificate), replayed: true };
      const certificate = await tx.trainingCertificate.create({ data: { id: occurrenceId, recommendedAt, trainingRecordId, studentAccountId: record.enrollment.studentAccountId, courseCode: record.enrollment.courseCode, recommendedByInstructorId: actorId } });
      await this.audit.record({ actorId, action: 'training.certificate_recommended', resource: 'trainingCertificate', resourceId: certificate.id, metadata: { trainingRecordId, recordRevision: record.updatedAt.toISOString() } }, tx);
      return { ...this.certificate(certificate), replayed: false };
    };
    try { return await this.db.serializable(work); } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return this.db.serializable(work);
      throw error;
    }
  }

  async list(actorId: string, status: string = 'RECOMMENDED', cursor?: string) {
    if (typeof status !== 'string' || !Object.values(TrainingCertificateStatus).includes(status as TrainingCertificateStatus)) throw new BadRequestException('حالة طلب الشهادة غير صالحة.');
    if (cursor !== undefined && (typeof cursor !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cursor))) throw new BadRequestException('مؤشر الصفحة غير صالح.');
    return this.db.serializable(async tx => {
      await this.authorization.assertReviewer(actorId, tx);
      const where = { status: status as TrainingCertificateStatus };
      if (cursor && !await tx.trainingCertificate.findFirst({ where: { ...where, id: cursor }, select: { id: true } })) throw new NotFoundException('حدّث قائمة الطلبات قبل الانتقال للصفحة التالية.');
      const found = await tx.trainingCertificate.findMany({ where, include: { trainingRecord: { include: graph } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 21, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
      const rows = found.slice(0, 20);
      const accountIds = [...new Set(rows.flatMap(row => [row.studentAccountId, row.recommendedByInstructorId]))];
      const people = accountIds.length ? await tx.account.findMany({ where: { id: { in: accountIds } }, select: { id: true, person: { select: { firstName: true, lastName: true } } } }) : [];
      const names = new Map(people.map(row => [row.id, [row.person.firstName, row.person.lastName].filter(Boolean).join(' ')]));
      const centerIds = [...new Set(rows.flatMap(row => row.trainingRecord.enrollment.centerOrganizationId ? [row.trainingRecord.enrollment.centerOrganizationId] : []))];
      const centers = centerIds.length ? await tx.organization.findMany({ where: { id: { in: centerIds } }, select: { id: true, displayName: true } }) : [];
      const centerNames = new Map(centers.map(row => [row.id, row.displayName]));
      return { items: await Promise.all(rows.map(async row => {
        const record = row.trainingRecord, assessment = await certificateCompletionReadiness(tx, record), reasons = this.reviewReasons(row);
        reasons.push(...assessment.reasons.filter(reason => !reasons.includes(reason)));
        const independent = this.independent(row, actorId);
        if (!independent) reasons.push('يتطلب الطلب مراجعًا مستقلًا عن المدرب والمتدرب.');
        return { ...await certificateActorProjection(tx, row, { accountId: actorId, requester: false, reviewer: true, independent }), student: { displayName: names.get(row.studentAccountId) || 'متدرب' }, instructor: { displayName: names.get(row.recommendedByInstructorId) || 'مدرب' }, centerName: centerNames.get(record.enrollment.centerOrganizationId || '') || 'دورة مستقلة', canReview: row.status === 'RECOMMENDED' && independent, canApprove: row.status === 'RECOMMENDED' && reasons.length === 0 && assessment.readiness.ready, reviewReasons: reasons, completionReadiness: assessment.readiness,
          record: { status: record.status, enrollmentStatus: record.enrollment.status, progressPercent: record.progressPercent, completedAt: record.completedAt, stages: record.stages.map(stage => ({ stageType: stage.stageType, deliveryMode: stage.deliveryMode, skills: stage.skills.map(skill => ({ skillCode: skill.skillCode, name: skill.name, status: skill.status, signedOffAt: skill.signedOffAt, signed: Boolean(skill.signedOffByInstructorId && skill.signedOffAt) })) })), sessions: record.sessions } };
      })), nextCursor: found.length > 20 ? rows[rows.length - 1].id : null };
    });
  }

  async decide(id: string, actorId: string, body: Record<string, unknown>) {
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !['outcome', 'reason', 'expectedUpdatedAt', 'reviewed'].includes(key))) throw new BadRequestException('حقول قرار الشهادة غير صالحة.');
    if (typeof body.outcome !== 'string' || !['APPROVED', 'REJECTED'].includes(body.outcome)) throw new BadRequestException('قرار الشهادة غير صالح.');
    if (body.reviewed !== true) throw new BadRequestException('أكد مراجعة المهارات والجلسات قبل حفظ القرار.');
    if (typeof body.reason !== 'string' || body.reason.trim().length < 5 || body.reason.trim().length > 1000) throw new BadRequestException('اكتب ملاحظات القرار من 5 إلى 1000 حرف.');
    if (typeof body.expectedUpdatedAt !== 'string' || !Number.isFinite(Date.parse(body.expectedUpdatedAt))) throw new BadRequestException('حدّث طلب الشهادة قبل حفظ القرار.');
    const outcome = body.outcome as 'APPROVED' | 'REJECTED', reason = body.reason.trim(), revision = new Date(body.expectedUpdatedAt);
    const fingerprint = createHash('sha256').update(JSON.stringify({ id, actorId, outcome, reason, revision: revision.toISOString() })).digest('hex');
    const now = new Date(), raw = outcome === 'APPROVED' ? randomBytes(24).toString('base64url') : null;
    const issuance = raw ? { certificateNumber: 'HYD-TRN-' + now.getUTCFullYear() + '-' + randomBytes(8).toString('hex').toUpperCase(), verificationTokenHash: createHash('sha256').update(raw).digest('hex'), issuedAt: now } : {};
    return this.db.serializable(async tx => {
      await this.authorization.assertReviewer(actorId, tx);
      const certificate = await tx.trainingCertificate.findUnique({ where: { id }, include: { trainingRecord: { include: graph } } });
      if (!certificate) throw new NotFoundException('طلب الشهادة غير موجود.');
      if (!this.independent(certificate, actorId)) throw new ForbiddenException('لا يمكن للمدرب أو المتدرب مراجعة طلب شهادته.');
      if (certificate.status !== 'RECOMMENDED') {
        const replay = await tx.auditEvent.findFirst({ where: { action: 'training.certificate_decided', resourceId: id, metadata: { path: ['requestFingerprint'], equals: fingerprint } }, select: { id: true } });
        if (replay) return { ...this.certificate(certificate), replayed: true };
        throw new ConflictException('حُسم طلب الشهادة سابقًا. حدّث القائمة.');
      }
      if (certificate.updatedAt.getTime() !== revision.getTime()) throw new ConflictException('تغير طلب الشهادة. حدّث القائمة قبل القرار.');
      const reasons = this.reviewReasons(certificate);
      if (outcome === 'APPROVED' && reasons.length) throw new ConflictException(reasons.join(' '));
      const approvedBinding = outcome === 'APPROVED' ? await standardRequest(()=>assertTrainingStandardCompletion(tx,certificate.trainingRecord.enrollmentId)) : null;
      const updated = await tx.trainingCertificate.update({ where: { id }, data: { status: outcome, reviewedByAccountId: actorId, reviewedAt: now, reviewReason: reason, updatedAt: new Date(Math.max(Date.now(), certificate.updatedAt.getTime() + 1)), ...issuance } });
      const approvalSourceDigest = approvedBinding ? await this.nativeEvidenceDigest(tx, { ...updated, trainingRecord: certificate.trainingRecord }, approvedBinding) : null;
      await this.audit.record({ actorId, action: 'training.certificate_decided', resource: 'trainingCertificate', resourceId: id, metadata: {
        outcome, reason, requestFingerprint: fingerprint, actorAccountId: actorId, previousDecision: certificateDecisionSnapshot(certificate),
        afterStateDigest: certificateStateDigest(updated), approvalSourceDigest,
      } }, tx);
      return { ...this.certificate(updated), replayed: false, ...(raw ? { verificationToken: raw } : {}) };
    });
  }

  private async actor(tx: Prisma.TransactionClient, row: TrainingCertificate & { trainingRecord: RecordGraph }, actorId: string) {
    const account = await tx.account.findFirst({ where: { id: actorId, status: 'ACTIVE' },
      select: { personId: true, roleAssignments: { where: { status: 'ACTIVE' }, select: { role: true } } } });
    if (!account) throw new ForbiddenException('يتطلب الإجراء حسابًا نشطًا.');
    const enrollment = row.trainingRecord.enrollment;
    const reviewer = account.roleAssignments.some(role => ['ADMIN', 'REVIEWER'].includes(role.role));
    const student = row.studentAccountId === actorId && enrollment.studentAccountId === actorId;
    const instructor = enrollment.instructorAccountId === actorId && account.roleAssignments.some(role => role.role === 'INSTRUCTOR')
      && await hasInstructorCenterAccess(tx, actorId, enrollment.centerOrganizationId);
    if (!reviewer && !student && !instructor) throw new ForbiddenException('لا تملك صلاحية هذا السجل.');
    return { accountId: actorId, personId: account.personId, reviewer, requester: student || instructor, independent: this.independent(row, actorId) };
  }

  private async readRow(tx: Prisma.TransactionClient, id: string) {
    const row = await tx.trainingCertificate.findUnique({ where: { id }, include: { trainingRecord: { include: graph } } });
    if (!row) throw new NotFoundException('طلب الشهادة غير موجود.');
    return row;
  }

  async detail(id: string, actorId: string) {
    return this.db.serializable(async tx => {
      const row = await this.readRow(tx, id), actor = await this.actor(tx, row, actorId);
      const assessment = await certificateCompletionReadiness(tx, row.trainingRecord), reasons = this.reviewReasons(row);
      reasons.push(...assessment.reasons.filter(reason => !reasons.includes(reason)));
      return { ...await certificateActorProjection(tx, row, actor), completionReadiness: assessment.readiness,
        canReview: actor.reviewer && actor.independent && row.status === 'RECOMMENDED',
        canApprove: actor.reviewer && actor.independent && row.status === 'RECOMMENDED' && reasons.length === 0 && assessment.readiness.ready,
        reviewReasons: reasons };
    });
  }

  async mine(actorId: string) {
    return this.db.serializable(async tx => {
      if (!await tx.account.findFirst({ where: { id: actorId, status: 'ACTIVE' }, select: { id: true } })) throw new ForbiddenException('يتطلب العرض حسابًا نشطًا.');
      const rows = await tx.trainingCertificate.findMany({ where: { studentAccountId: actorId, trainingRecord: { enrollment: { studentAccountId: actorId } } },
        include: { trainingRecord: { include: graph } }, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], take: 200 });
      return { items: await Promise.all(rows.map(row => certificateActorProjection(tx, row,
        { accountId: actorId, requester: true, reviewer: false, independent: false }))) };
    });
  }

  private lifecycleCommand(body: Record<string, unknown>, kind: 'REQUEST' | 'DECIDE' | 'REVOKE') {
    const allowed = ['requestId', 'expectedUpdatedAt', 'reason', ...(kind === 'REQUEST' ? [] : ['reviewed']), ...(kind === 'DECIDE' ? ['outcome'] : [])];
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !allowed.includes(key))) throw new BadRequestException('حقول إجراء الشهادة غير صالحة.');
    if (typeof body.requestId !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(body.requestId)) throw new BadRequestException('مرجع طلب الإجراء غير صالح.');
    if (typeof body.expectedUpdatedAt !== 'string' || !Number.isFinite(Date.parse(body.expectedUpdatedAt))) throw new BadRequestException('حدّث الشهادة قبل حفظ الإجراء.');
    if (typeof body.reason !== 'string' || body.reason.trim().length < 5 || body.reason.trim().length > 1000) throw new BadRequestException('اكتب سببًا من 5 إلى 1000 حرف.');
    if (kind !== 'REQUEST' && body.reviewed !== true) throw new BadRequestException('أكد مراجعة سجل القرار قبل الحفظ.');
    if (kind === 'DECIDE' && (typeof body.outcome !== 'string' || !['REOPEN', 'DISMISS'].includes(body.outcome))) throw new BadRequestException('قرار إعادة النظر غير صالح.');
    return { requestId: body.requestId.toLowerCase(), expected: new Date(body.expectedUpdatedAt), reason: body.reason.trim(),
      outcome: kind === 'DECIDE' ? body.outcome as 'REOPEN' | 'DISMISS' : null };
  }

  private async commandReplay(tx: Prisma.TransactionClient, row: TrainingCertificate, actorId: string, requestId: string, fingerprint: string) {
    const event = await tx.auditEvent.findFirst({ where: { resource: 'trainingCertificate', resourceId: row.id,
      action: { in: [certificateActions.requested, certificateActions.reconsidered, certificateActions.revoked] },
      metadata: { path: ['requestId'], equals: requestId } }, select: { metadata: true } });
    if (!event) return false;
    const metadata = certificateObject(event.metadata);
    if (metadata.actorAccountId !== actorId || metadata.requestFingerprint !== fingerprint) throw new ConflictException('استُخدم مرجع الإجراء بمحتوى مختلف.');
    return true;
  }

  private async lifecycleEvent(tx: Prisma.TransactionClient, eventId: string, action: string, actor: { accountId: string; personId: string },
    before: TrainingCertificate, after: TrainingCertificate, metadata: Record<string, unknown>) {
    await tx.auditEvent.create({ data: { id: eventId, actorId: actor.personId, action, resource: 'trainingCertificate', resourceId: after.id,
      occurredAt: after.updatedAt, metadata: {
        schemaVersion: 1, actorAccountId: actor.accountId, ...metadata, beforeUpdatedAt: before.updatedAt.toISOString(),
        afterUpdatedAt: after.updatedAt.toISOString(), beforeStateDigest: certificateStateDigest(before), afterStateDigest: certificateStateDigest(after),
        previousDecision: certificateDecisionSnapshot(before),
      } as Prisma.InputJsonValue } });
  }

  async requestReconsideration(id: string, actorId: string, body: Record<string, unknown>) {
    const command = this.lifecycleCommand(body, 'REQUEST'), eventId = randomUUID();
    const fingerprint = certificateEvidenceDigest({ id, actorId, kind: 'REQUEST', ...command, expected: command.expected.toISOString() });
    return this.db.serializable(async tx => {
      const row = await this.readRow(tx, id), actor = await this.actor(tx, row, actorId);
      if (!actor.requester) throw new ForbiddenException('طلب إعادة النظر من صلاحية المتدرب أو المدرب المعين حاليًا.');
      if (await this.commandReplay(tx, row, actorId, command.requestId, fingerprint)) return { ...await certificateActorProjection(tx, row, actor), replayed: true };
      const history = await certificateHistory(tx, row);
      if (row.status !== 'REJECTED' || history.pending) throw new ConflictException('يمكن تقديم طلب إعادة النظر لقرار رفض داخلي دون طلب آخر معلق.');
      if (row.updatedAt.getTime() !== command.expected.getTime()) throw new ConflictException('تغير القرار؛ حدّث الشهادة قبل طلب إعادة النظر.');
      const changed = await tx.trainingCertificate.update({ where: { id }, data: { updatedAt: new Date(Math.max(Date.now(), row.updatedAt.getTime() + 1)) } });
      await this.lifecycleEvent(tx, eventId, certificateActions.requested, actor, row, changed, {
        requestId: command.requestId, requestFingerprint: fingerprint, reason: command.reason, requestReason: command.reason,
        requestedAt: changed.updatedAt.toISOString(), requestedByAccountId: actorId,
      });
      return { ...await certificateActorProjection(tx, changed, actor), replayed: false };
    });
  }

  async decideReconsideration(id: string, actorId: string, body: Record<string, unknown>) {
    const command = this.lifecycleCommand(body, 'DECIDE'), eventId = randomUUID();
    const fingerprint = certificateEvidenceDigest({ id, actorId, kind: 'DECIDE_RECONSIDERATION', ...command, expected: command.expected.toISOString() });
    return this.db.serializable(async tx => {
      await this.authorization.assertReviewer(actorId, tx);
      const row = await this.readRow(tx, id), actor = await this.actor(tx, row, actorId);
      if (!actor.independent) throw new ForbiddenException('تتطلب إعادة النظر مراجعًا مستقلًا عن المتدرب والمدرب.');
      if (await this.commandReplay(tx, row, actorId, command.requestId, fingerprint)) return { ...await certificateActorProjection(tx, row, actor), replayed: true };
      const history = await certificateHistory(tx, row);
      if (!history.pending || row.status !== 'REJECTED') throw new ConflictException('لا يوجد طلب إعادة نظر معلق لهذا القرار.');
      if (history.requestedByAccountId === actorId) throw new ForbiddenException('لا يمكن لصاحب الاعتراض حسمه بنفسه.');
      if (row.updatedAt.getTime() !== command.expected.getTime()) throw new ConflictException('تغير طلب إعادة النظر؛ حدّث القائمة.');
      const changed = await tx.trainingCertificate.update({ where: { id }, data: {
        ...(command.outcome === 'REOPEN' ? { status: 'RECOMMENDED', reviewedByAccountId: null, reviewedAt: null, reviewReason: null } : {}),
        updatedAt: new Date(Math.max(Date.now(), row.updatedAt.getTime() + 1)),
      } });
      await this.lifecycleEvent(tx, eventId, certificateActions.reconsidered, actor, row, changed, {
        requestId: command.requestId, requestFingerprint: fingerprint, outcome: command.outcome, reason: command.reason,
        requestEventId: history.requestEventId, requestedByAccountId: history.requestedByAccountId,
        requestedAt: history.reconsideration!.requestedAt, requestReason: history.reconsideration!.reason,
      });
      return { ...await certificateActorProjection(tx, changed, actor), replayed: false };
    });
  }

  async revoke(id: string, actorId: string, body: Record<string, unknown>) {
    const command = this.lifecycleCommand(body, 'REVOKE'), eventId = randomUUID();
    const fingerprint = certificateEvidenceDigest({ id, actorId, kind: 'REVOKE', ...command, expected: command.expected.toISOString() });
    return this.db.serializable(async tx => {
      await this.authorization.assertReviewer(actorId, tx);
      const row = await this.readRow(tx, id), actor = await this.actor(tx, row, actorId);
      if (!actor.independent) throw new ForbiddenException('سحب الاعتماد من صلاحية مراجع مستقل عن المتدرب والمدرب.');
      if (await this.commandReplay(tx, row, actorId, command.requestId, fingerprint)) return { ...await certificateActorProjection(tx, row, actor), replayed: true };
      if (row.status !== 'APPROVED') throw new ConflictException('يسحب هذا الإجراء اعتمادًا داخليًا صادرًا فقط. السحب نهائي.');
      if (row.updatedAt.getTime() !== command.expected.getTime()) throw new ConflictException('تغيرت الشهادة؛ حدّثها قبل السحب.');
      // Keep the original number, issuance time and prior decision in history.
      // No external certificate is connected or revoked by this internal action.
      const changed = await tx.trainingCertificate.update({ where: { id }, data: { status: 'REVOKED', reviewedByAccountId: actorId,
        reviewedAt: new Date(), reviewReason: command.reason, updatedAt: new Date(Math.max(Date.now(), row.updatedAt.getTime() + 1)) } });
      await this.lifecycleEvent(tx, eventId, certificateActions.revoked, actor, row, changed, {
        requestId: command.requestId, requestFingerprint: fingerprint, reason: command.reason, outcome: 'REVOKED',
      });
      return { ...await certificateActorProjection(tx, changed, actor), replayed: false };
    });
  }

  private async nativeEvidenceDigest(tx: Prisma.TransactionClient, row: TrainingCertificate & { trainingRecord: RecordGraph }, binding: TrainingStandardBinding) {
      const record = row.trainingRecord, enrollment = record.enrollment;
      const [source, participation, sessions, documents] = await Promise.all([
        tx.policyControl.findUnique({ where: { id: binding.profileId }, select: { id: true, state: true, updatedAt: true, metadata: true } }),
        tx.participationCase.findUnique({ where: { trainingEnrollmentId: enrollment.id }, select: { id: true, revision: true, digest: true, updatedAt: true } }),
        tx.trainingSession.findMany({ where: { trainingRecordId: record.id }, orderBy: { id: 'asc' }, select: { id: true, status: true, startsAt: true, endsAt: true, evidence: true, updatedAt: true } }),
        enrollment.centerOrganizationId ? tx.managedDocument.findMany({ where: { organizationId: enrollment.centerOrganizationId, payload: { path: ['trainingEnrollmentId'], equals: enrollment.id },
          template: { NOT: { code: { startsWith: 'D01-' } } } }, orderBy: { id: 'asc' }, take: 201,
          select: { id: true, version: true, status: true, contentHash: true, payload: true, approvedAt: true, signedAt: true, updatedAt: true, template: { select: { code: true } } } }) : Promise.resolve([]),
      ]);
      if (documents.length > 200) throw new ConflictException('يلزم جرد كامل لأدلة التدريب قبل إعداد مرجع التكامل.');
      return certificateEvidenceDigest({
        schemaVersion: 1, certificate: { ...certificateDecisionSnapshot(row), id: row.id, updatedAt: row.updatedAt },
        enrollment: { id: enrollment.id, status: enrollment.status, updatedAt: enrollment.updatedAt, studentAccountId: enrollment.studentAccountId,
          instructorAccountId: enrollment.instructorAccountId, centerOrganizationId: enrollment.centerOrganizationId, courseCode: enrollment.courseCode },
        record: { id: record.id, status: record.status, progressPercent: record.progressPercent, updatedAt: record.updatedAt,
          stages: record.stages.map(stage => ({ id: stage.id, skills: [...stage.skills].sort((a, b) => a.id.localeCompare(b.id)) })) },
        source, participation, sessions, documents,
      });
  }

  /** Trusted read-only adapter input. This method sends nothing and grants no agency authority. */
  async readCertificationSource(actorId: string, id: string) {
    return this.db.serializable(async tx => {
      await this.authorization.assertReviewer(actorId, tx);
      const row = await this.readRow(tx, id), record = row.trainingRecord, enrollment = record.enrollment;
      if (row.status !== 'APPROVED' || !row.certificateNumber || !row.issuedAt || !enrollment.centerOrganizationId || this.reviewReasons(row).length) return null;
      const assessment = await certificateCompletionReadiness(tx, record);
      if (!assessment.readiness.ready || !assessment.binding) return null;
      const binding = assessment.binding;
      const event = await tx.auditEvent.findFirst({ where: { resource: 'trainingCertificate', resourceId: row.id, action: certificateActions.decided,
        metadata: { path: ['outcome'], equals: 'APPROVED' } }, orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }], select: { actorId: true, metadata: true } });
      const original = certificateObject(event?.metadata);
      const reviewer = row.reviewedByAccountId ? await tx.account.findUnique({ where: { id: row.reviewedByAccountId }, select: { personId: true } }) : null;
      if (!event || !reviewer || event.actorId !== reviewer.personId || original.actorAccountId !== row.reviewedByAccountId
        || original.afterStateDigest !== certificateStateDigest(row)) return null;
      const resultDigest = await this.nativeEvidenceDigest(tx, row, binding);
      if (original.approvalSourceDigest !== resultDigest) return null;
      return trainingCertificationSource({ binding: { organizationId: enrollment.centerOrganizationId, enrollmentId: enrollment.id,
        trainingRecordId: record.id, participantAccountId: enrollment.studentAccountId, agencyCode: binding.agencyCode,
        programCode: binding.programCode, edition: binding.edition, profileHash: binding.profileHash, resultDigest },
      internalResult: { status: 'APPROVED', certificateId: row.id, certificateNumber: row.certificateNumber } });
    });
  }
}

