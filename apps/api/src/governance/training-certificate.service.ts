import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { Prisma, TrainingCertificate, TrainingCertificateStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { TrainingAuthorizationService } from './training-authorization.service';
import { trainingCompletion } from './training-completion-policy';

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
    return { id: row.id, trainingRecordId: row.trainingRecordId, courseCode: row.courseCode, status: row.status, recommendedAt: row.recommendedAt, reviewedAt: row.reviewedAt, reviewReason: row.reviewReason, certificateNumber: row.certificateNumber, issuedAt: row.issuedAt, updatedAt: row.updatedAt };
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
    const work = async (tx: Prisma.TransactionClient) => {
      const record = await tx.trainingRecord.findUnique({ where: { id: trainingRecordId }, include: { ...graph, certificate: true } });
      if (!record) throw new NotFoundException('سجل التدريب غير موجود.');
      await this.authorization.assertProfessionalEnrollmentAccess(actorId, record.enrollmentId, tx);
      const reasons = this.reasons(record);
      if (reasons.length) throw new ConflictException(reasons.join(' '));
      if (record.certificate) return { ...this.certificate(record.certificate), replayed: true };
      const certificate = await tx.trainingCertificate.create({ data: { trainingRecordId, studentAccountId: record.enrollment.studentAccountId, courseCode: record.enrollment.courseCode, recommendedByInstructorId: actorId } });
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
      return { items: rows.map(row => {
        const record = row.trainingRecord, reasons = this.reviewReasons(row);
        const independent = this.independent(row, actorId);
        if (!independent) reasons.push('يتطلب الطلب مراجعًا مستقلًا عن المدرب والمتدرب.');
        return { ...this.certificate(row), student: { displayName: names.get(row.studentAccountId) || 'متدرب' }, instructor: { displayName: names.get(row.recommendedByInstructorId) || 'مدرب' }, centerName: centerNames.get(record.enrollment.centerOrganizationId || '') || 'دورة مستقلة', canReview: row.status === 'RECOMMENDED' && independent, canApprove: row.status === 'RECOMMENDED' && reasons.length === 0, reviewReasons: reasons,
          record: { status: record.status, enrollmentStatus: record.enrollment.status, progressPercent: record.progressPercent, completedAt: record.completedAt, stages: record.stages.map(stage => ({ stageType: stage.stageType, deliveryMode: stage.deliveryMode, skills: stage.skills.map(skill => ({ skillCode: skill.skillCode, name: skill.name, status: skill.status, signedOffAt: skill.signedOffAt, signed: Boolean(skill.signedOffByInstructorId && skill.signedOffAt) })) })), sessions: record.sessions } };
      }), nextCursor: found.length > 20 ? rows[rows.length - 1].id : null };
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
      const now = new Date();
      const raw = outcome === 'APPROVED' ? randomBytes(24).toString('base64url') : null;
      const issuance = raw ? { certificateNumber: 'HYD-TRN-' + now.getUTCFullYear() + '-' + randomBytes(8).toString('hex').toUpperCase(), verificationTokenHash: createHash('sha256').update(raw).digest('hex'), issuedAt: now } : {};
      const updated = await tx.trainingCertificate.update({ where: { id }, data: { status: outcome, reviewedByAccountId: actorId, reviewedAt: now, reviewReason: reason, updatedAt: new Date(Math.max(Date.now(), certificate.updatedAt.getTime() + 1)), ...issuance } });
      await this.audit.record({ actorId, action: 'training.certificate_decided', resource: 'trainingCertificate', resourceId: id, metadata: { outcome, reason, requestFingerprint: fingerprint } }, tx);
      return { ...this.certificate(updated), replayed: false, ...(raw ? { verificationToken: raw } : {}) };
    });
  }
}
