import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Prisma, TrainingEnrollment } from '@prisma/client';
import { ageOn, assertTrainingStandardBinding, hasTrainingCredential, parseTrainingStandard, trainingCompletionGaps, trainingStandardBinding, trainingStandardHash, trainingSupervisionLimits, trainingStandardProgressionPolicy, TrainingStandardError } from './training-standard-profile';
import type { TrainingStandardBinding, TrainingStandardProfile } from './training-standard-profile';
import { hasInstructorCenterAccess } from './training-center-scope';
import { readTrainingProgressionEvidence } from './training-progression-evidence';
import { evaluateDiveProgression, DiveProgressionError } from './training-dive-progression';

const CATEGORY = 'TRAINING_STANDARD_PROFILE';
const json = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const inputJson = (value: unknown) => value as Prisma.InputJsonValue;
const nextRevision = (date: Date) => new Date(Math.max(Date.now(), date.getTime() + 1));
function fields(body: Record<string, unknown>, allowed: string[]) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !allowed.includes(key))) throw new BadRequestException('حقول معايير التدريب غير صالحة.');
}
function revision(value: unknown) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) throw new BadRequestException('حدّث بيانات المعيار أو الدورة قبل الحفظ.');
  return new Date(value);
}
function reason(value: unknown) {
  if (typeof value !== 'string' || value.trim().length < 5 || value.trim().length > 1000) throw new BadRequestException('مرجع المراجعة أو سبب الإجراء مطلوب من 5 إلى 1000 حرف.');
  return value.trim();
}
export async function standardRequest<T>(work: () => Promise<T>): Promise<T> {
  try { return await work(); } catch (error) {
    if (error instanceof TrainingStandardError) throw new ConflictException({ code: error.code, message: error.message });
    throw error;
  }
}
async function reviewer(tx: Prisma.TransactionClient, actorId: string) {
  const role = await tx.roleAssignment.findFirst({ where: { accountId: actorId, role: { in: ['ADMIN', 'REVIEWER'] }, status: 'ACTIVE', account: { status: 'ACTIVE' } }, select: { id: true } });
  if (!role) throw new ForbiddenException('يتطلب اعتماد مصدر التدريب مراجعًا مخولًا.');
}
async function audit(tx: Prisma.TransactionClient, actorId: string, action: string, id: string, metadata: Record<string, unknown>) {
  // AuditEvent.actorId references Person, not Account. Preserve the account identity in metadata.
  await tx.auditEvent.create({ data: { action, resource: 'TrainingStandard', resourceId: id, metadata: inputJson({ ...metadata, actorAccountId: actorId }) } });
}
export function rejectReservedTrainingMetadata(value: unknown) {
  if (Object.keys(json(value)).some(key => key.startsWith('trainingStandard'))) throw new BadRequestException('اختيار معايير التدريب من صلاحية المدرب، وليس من بيانات تسجيل المتدرب.');
}
export async function createTrainingStandardDraft(tx: Prisma.TransactionClient, actorId: string, body: Record<string, unknown>) {
  fields(body, ['profile', 'reason']);
  await reviewer(tx, actorId);
  const profile = parseTrainingStandard(body.profile), reference = reason(body.reason), id = randomUUID();
  const contentHash = trainingStandardHash(profile);
  await tx.policyControl.create({ data: { id, category: CATEGORY, ruleKey: id.toUpperCase(), labelAr: profile.agencyCode + ' · ' + profile.programCode + ' · ' + profile.edition, state: 'REVIEW', updatedByAccountId: actorId,
    metadata: inputJson({ schemaVersion: 1, profile, contentHash, createdByAccountId: actorId, approval: null }) } });
  await audit(tx, actorId, 'training.standard_drafted', id, { contentHash, reference });
  return { id, state: 'REVIEW', contentHash, profile };
}
export async function decideTrainingStandard(tx: Prisma.TransactionClient, actorId: string, id: string, body: Record<string, unknown>) {
  fields(body, ['outcome', 'reviewed', 'expectedUpdatedAt', 'approvalReference', 'validUntil']);
  await reviewer(tx, actorId);
  if (!['APPROVE', 'REVOKE'].includes(String(body.outcome)) || body.reviewed !== true) throw new BadRequestException('أكد مراجعة مصادر المنظمة والانطباق وحدود البرنامج.');
  const current = await tx.policyControl.findFirst({ where: { id, category: CATEGORY } });
  if (!current) throw new NotFoundException('معيار التدريب غير موجود.');
  const expected = revision(body.expectedUpdatedAt), reference = reason(body.approvalReference), metadata = json(current.metadata);
  if (current.updatedAt.getTime() !== expected.getTime()) throw new ConflictException('تغير المعيار؛ حدّثه قبل القرار.');
  const profile = parseTrainingStandard(metadata.profile), contentHash = trainingStandardHash(profile), now = new Date();
  if (metadata.contentHash !== contentHash) throw new ConflictException('بصمة محتوى المعيار غير متطابقة.');
  if (body.outcome === 'APPROVE' && (current.state !== 'REVIEW' || metadata.approval)) throw new ConflictException('أنشئ إصدارًا جديدًا؛ لا يعاد اعتماد معيار سبق حسمه أو سحبه.');
  if (body.outcome === 'APPROVE' && metadata.createdByAccountId === actorId) throw new ForbiddenException('يلزم مراجع مستقل عن مُعد مصفوفة المعايير.');
  const validUntil = body.outcome === 'APPROVE' ? revision(body.validUntil) : null;
  if (validUntil && validUntil <= now) throw new BadRequestException('صلاحية اعتماد المعيار يجب أن تنتهي مستقبلًا.');
  const state = body.outcome === 'APPROVE' ? 'APPROVED' : 'REVOKED';
  const changed = await tx.policyControl.updateMany({ where: { id, category: CATEGORY, updatedAt: expected }, data: { state, updatedAt: nextRevision(current.updatedAt), updatedByAccountId: actorId,
    metadata: inputJson({ ...metadata, approval: body.outcome === 'APPROVE' ? { profileHash: contentHash, reviewedByAccountId: actorId, approvalReference: reference, reviewedAt: now.toISOString(), validUntil: validUntil!.toISOString() } : metadata.approval }) } });
  if (changed.count !== 1) throw new ConflictException('سبق تغيير المعيار.');
  await audit(tx, actorId, 'training.standard_decided', id, { state, contentHash, reference });
  return { id, state, contentHash };
}
function readApprovedProfile(row: { id: string; state: string; metadata: unknown } | null, now = new Date()) {
  const metadata = json(row?.metadata), approval = json(metadata.approval);
  if (!row || row.state !== 'APPROVED' || !approval.reviewedByAccountId || !approval.approvalReference || !Number.isFinite(Date.parse(String(approval.reviewedAt))) || Date.parse(String(approval.reviewedAt)) > now.getTime() || !(Date.parse(String(approval.validUntil)) > now.getTime())) throw new ConflictException({ code: 'TRAINING_STANDARD_NOT_APPROVED', message: 'لا يوجد إصدار نافذ معتمد لبرنامج المنظمة؛ يبقى التدريب موقوفًا.' });
  const profile = parseTrainingStandard(metadata.profile), hash = trainingStandardHash(profile);
  if (hash !== metadata.contentHash || hash !== approval.profileHash || metadata.createdByAccountId === approval.reviewedByAccountId) throw new ConflictException('مصدر المعيار أو مراجعته لا يطابقان الإصدار المعتمد.');
  return { id: row.id, profile, contentHash: hash };
}
async function approvedProfile(tx: Prisma.TransactionClient, id: string, now = new Date()) {
  return readApprovedProfile(await tx.policyControl.findFirst({ where: { id, category: CATEGORY } }), now);
}
export async function trainingStandardCatalog(tx: Prisma.TransactionClient, actorId: string) {
  const select = { role: true, account: { select: { person: { select: { credentials: true } } } } } as const;
  const role = await tx.roleAssignment.findFirst({ where: { accountId: actorId, role: { in: ['ADMIN', 'REVIEWER'] }, status: 'ACTIVE', account: { status: 'ACTIVE' } }, select }) || await tx.roleAssignment.findFirst({ where: { accountId: actorId, role: 'INSTRUCTOR', status: 'ACTIVE', account: { status: 'ACTIVE' } }, select });
  if (!role) throw new ForbiddenException('يتطلب عرض المعايير حساب مدرب أو مراجع نشطًا.');
  const rows = await tx.policyControl.findMany({ where: { category: CATEGORY }, orderBy: [{ labelAr: 'asc' }, { id: 'asc' }], take: 201 });
  if (rows.length > 200) throw new ConflictException('كتالوج المعايير يتطلب تقسيمًا إلى صفحات؛ لا يعرض اختيارًا ناقصًا.');
  const profiles: Array<{ id: string; state: string; updatedAt: Date; profile: TrainingStandardProfile; contentHash: string; approval?: unknown }> = [];
  for (const row of rows) {
    if (role.role !== 'INSTRUCTOR') { const metadata=json(row.metadata); profiles.push({ id: row.id, state: row.state, updatedAt: row.updatedAt, profile: parseTrainingStandard(metadata.profile), contentHash: String(metadata.contentHash), approval: metadata.approval }); }
    else if (row.state === 'APPROVED') {
      try { const approved = readApprovedProfile(row); if (hasTrainingCredential(role.account.person.credentials, approved.profile.agencyCode, approved.profile.requirements.instructorCredentialTitles, new Date())) profiles.push({ ...approved, state: 'APPROVED', updatedAt: row.updatedAt }); }
      catch (error) { if (!(error instanceof ConflictException) && !(error instanceof TrainingStandardError)) throw error; }
    }
  }
  return { profiles, standardsAreNotSaudiLicences: true };
}
export async function trainingStandardOptions(tx: Prisma.TransactionClient, actorId: string, enrollmentId: string) {
  const enrollment = await tx.trainingEnrollment.findUnique({ where: { id: enrollmentId }, include: { record: { include: { sessions: true, stages: { include: { skills: true } } } } } });
  if (!enrollment || enrollment.instructorAccountId !== actorId || !await hasInstructorCenterAccess(tx,actorId,enrollment.centerOrganizationId)) throw new ForbiddenException('اختيار المنظمة من صلاحية المدرب المكلف بالدورة داخل نطاق مركزه النشط.');
  const catalog = await trainingStandardCatalog(tx, actorId), metadata = json(enrollment.metadata);
  return { enrollmentId, updatedAt: enrollment.updatedAt, binding: metadata.trainingStandard || null, context: metadata.trainingStandardContext || null,
    profiles: catalog.profiles.filter(row => json(row.profile).programCode === enrollment.courseCode),
    canSelect: !metadata.trainingStandard && ['PENDING', 'ACTIVE'].includes(enrollment.status) && !enrollment.record?.sessions.length && !enrollment.record?.stages.some(stage => stage.skills.some(skill => skill.signedOffAt)) };
}
export async function bindTrainingStandard(tx: Prisma.TransactionClient, actorId: string, enrollmentId: string, body: Record<string, unknown>) {
  fields(body, ['profileId', 'environment', 'plannedMaximumDepthMetres', 'expectedUpdatedAt', 'reason']);
  if (typeof body.profileId !== 'string' || body.profileId.length > 100) throw new BadRequestException('اختر إصدار البرنامج.');
  const expected = revision(body.expectedUpdatedAt), reference = reason(body.reason);
  const enrollment = await tx.trainingEnrollment.findUnique({ where: { id: enrollmentId }, include: { record: { include: { sessions: true, stages: { include: { skills: true } } } } } });
  if (!enrollment) throw new NotFoundException('تسجيل التدريب غير موجود.');
  const role = await tx.roleAssignment.findFirst({ where: { accountId: actorId, role: 'INSTRUCTOR', status: 'ACTIVE', account: { status: 'ACTIVE' } }, select: { id: true } });
  if (enrollment.instructorAccountId !== actorId || !role || !await hasInstructorCenterAccess(tx,actorId,enrollment.centerOrganizationId)) throw new ForbiddenException('اختيار المنظمة من صلاحية المدرب المكلف بالدورة داخل نطاق مركزه النشط.');
  const metadata = json(enrollment.metadata);
  if (metadata.trainingStandard || !['PENDING', 'ACTIVE'].includes(enrollment.status) || enrollment.record?.sessions.length || enrollment.record?.stages.some(stage => stage.skills.some(skill => skill.signedOffAt))) throw new ConflictException('اختيار الإصدار ثابت؛ لا يغيّر بعد الربط أو بدء أدلة التدريب.');
  if (enrollment.updatedAt.getTime() !== expected.getTime()) throw new ConflictException('تغيرت الدورة؛ حدّث الخطة.');
  const { profile } = await approvedProfile(tx, body.profileId), binding = trainingStandardBinding(body.profileId, profile);
  assertTrainingStandardBinding(binding, body.profileId, profile, enrollment.courseCode);
  const context = { environment: body.environment, plannedMaximumDepthMetres: body.plannedMaximumDepthMetres };
  const boundMetadata = { ...metadata, trainingStandard: binding, trainingStandardContext: context };
  await assertTrainingStandardReady(tx, { ...enrollment, metadata: inputJson(boundMetadata) as Prisma.JsonValue }, actorId);
  const changed = await tx.trainingEnrollment.updateMany({ where: { id: enrollmentId, updatedAt: expected }, data: { metadata: inputJson(boundMetadata), updatedAt: nextRevision(enrollment.updatedAt) } });
  if (changed.count !== 1) throw new ConflictException('سبق تغيير الدورة.');
  const record = enrollment.record || await tx.trainingRecord.create({ data: { enrollmentId, policyVersion: 'training-standard:' + binding.profileId + ':' + binding.profileHash }, include: { stages: { include: { skills: true } } } });
  const existingCodes = new Set(record.stages.flatMap(stage => stage.skills.map(skill => skill.skillCode)));
  const missingCodes = profile.requirements.requiredSkillCodes.filter(code => !existingCodes.has(code));
  if (missingCodes.length) {
    if (record.stages.length >= 50 || record.stages.flatMap(stage => stage.skills).length + missingCodes.length > 200) throw new ConflictException('خطة التدريب تتجاوز حدود المراحل أو المهارات.');
    const stage = await tx.trainingStage.create({ data: { trainingRecordId: record.id, stageType: 'AGENCY_REQUIREMENTS', deliveryMode: 'BLENDED', sequence: 1 + Math.max(0, ...record.stages.map(item => item.sequence)) } });
    await tx.trainingSkill.createMany({ data: missingCodes.map(skillCode => ({ trainingStageId: stage.id, skillCode, name: skillCode })) });
  }
  await tx.trainingRecord.update({ where: { id: record.id }, data: { updatedAt: nextRevision(record.updatedAt) } });
  // This reference does not replace existing policy checks, Saudi licences, or source review.
  await audit(tx, actorId, 'training.standard_bound', enrollmentId, { binding, context, reference });
  return { enrollmentId, binding, requirements: profile.requirements };
}
export async function assertTrainingStandardReady(tx: Prisma.TransactionClient, enrollment: Pick<TrainingEnrollment, 'id' | 'metadata' | 'courseCode' | 'studentAccountId' | 'instructorAccountId' | 'centerOrganizationId'>, instructorAccountId: string | null, at = new Date(), sessionContext?: unknown) {
  const metadata = json(enrollment.metadata), binding = metadata.trainingStandard as TrainingStandardBinding | undefined;
  if (!binding || typeof binding.profileId !== 'string') throw new ConflictException({ code: 'STANDARD_SELECTION_REQUIRED', message: 'اختر المنظمة وبرنامجًا بإصدار معتمد قبل بدء التدريب.' });
  const { profile } = await approvedProfile(tx, binding.profileId, at);
  assertTrainingStandardBinding(binding, binding.profileId, profile, enrollment.courseCode);
  if (!instructorAccountId) throw new ConflictException('مدرب الدورة غير محدد.');
  if (!await hasInstructorCenterAccess(tx,instructorAccountId,enrollment.centerOrganizationId)) throw new ForbiddenException('عضوية المدرب أو مركز التدريب غير نشطين.');
  const instructor = await tx.account.findFirst({ where: { id: instructorAccountId, status: 'ACTIVE', roleAssignments: { some: { role: 'INSTRUCTOR', status: 'ACTIVE' } } }, select: { person: { select: { credentials: true } } } });
  const now = new Date();
  if (!instructor || !hasTrainingCredential(instructor.person.credentials, profile.agencyCode, profile.requirements.instructorCredentialTitles, now) || !hasTrainingCredential(instructor.person.credentials, profile.agencyCode, profile.requirements.instructorCredentialTitles, at)) throw new ConflictException({ code: 'AGENCY_INSTRUCTOR_CREDENTIAL_REQUIRED', message: 'لم يثبت تأهيل المدرب الساري لدى المنظمة لهذا البرنامج.' });
  const student = await tx.account.findFirst({ where: { id: enrollment.studentAccountId, status: 'ACTIVE' }, select: { diverProfile: { select: { dateOfBirth: true } }, person: { select: { credentials: true } } } });
  const age = ageOn(student?.diverProfile?.dateOfBirth, at);
  if (!student || age === null) throw new ConflictException('تاريخ ميلاد المتدرب مطلوب للتحقق من شروط البرنامج.');
  if (profile.requirements.prerequisites.some(item => !hasTrainingCredential(student.person.credentials, item.issuer, [item.title], at))) throw new ConflictException('لم تستوف مؤهلات الالتحاق ببرنامج المنظمة.');
  const context = json(sessionContext === undefined ? metadata.trainingStandardContext : sessionContext), limits = trainingSupervisionLimits(profile, age, String(context.environment));
  if (typeof context.plannedMaximumDepthMetres !== 'number' || !Number.isFinite(context.plannedMaximumDepthMetres) || context.plannedMaximumDepthMetres < 0 || context.plannedMaximumDepthMetres > limits.maximumDepthMetres) throw new ConflictException('حد العمق المخطط غير موثق أو يتجاوز حد البرنامج لهذا العمر والبيئة.');
  // Existing sessions are individual and the calendar forbids overlapping instructor assignments.
  // No capacity toggle can bypass these profile/qualification gates or increase group ratios.
  return { profile, binding, limits };
}
export async function assertStandardSupervisionAvailable(tx: Prisma.TransactionClient, instructorAccountId: string, startsAt: Date, endsAt: Date | null, excludeId?: string) {
  if (!endsAt || endsAt <= startsAt) throw new ConflictException('يلزم وقت نهاية صالح للتحقق من إشراف المدرب.');
  const conflict = await tx.trainingSession.findFirst({ where: { instructorAccountId, ...(excludeId ? { id: { not: excludeId } } : {}), status: { in: ['SCHEDULED', 'CHECK_IN_OPEN', 'IN_PROGRESS'] }, OR: [{ status: 'IN_PROGRESS' }, { startsAt: { lt: endsAt }, OR: [{ endsAt: { gt: startsAt } }, { endsAt: null }] }] }, select: { id: true } });
  // The existing session model represents one student, not an approved group roster.
  // Until group rosters are implemented, toggling calendar conflict checks cannot create a group.
  if (conflict) throw new ConflictException({ code: 'STANDARD_SUPERVISION_CONFLICT', message: 'يوجد تكليف متداخل للمدرب. نسب المنظمة لا تسمح بإنشاء مجموعة من جلسات فردية متعارضة.' });
}
export async function assertTrainingStandardCompletion(tx: Prisma.TransactionClient, enrollmentId: string) {
  const enrollment = await tx.trainingEnrollment.findUniqueOrThrow({ where: { id: enrollmentId }, include: { record: { include: { stages: { include: { skills: true } }, sessions: true } } } });
  const { profile, binding } = await assertTrainingStandardReady(tx, enrollment, enrollment.instructorAccountId);
  // Only already approved AND signed forms, scoped to this centre, student, and exact profile.
  const documents = enrollment.centerOrganizationId ? await tx.managedDocument.findMany({ where: { organizationId: enrollment.centerOrganizationId, status: 'SIGNED', approvedAt: { not: null }, signedAt: { not: null }, payload: { path: ['trainingEnrollmentId'], equals: enrollmentId } }, include: { template: { select: { code: true } } }, take: 201 }) : [];
  if (documents.length > 200) throw new ConflictException('يلزم جرد كامل لأدلة التدريب قبل الإتمام.');
  const accepted = documents.filter(document => { const payload = json(document.payload); return payload.trainingStandardHash === binding.profileHash && payload.studentAccountId === enrollment.studentAccountId && payload.instructorAccountId === enrollment.instructorAccountId && document.contentHash && document.approvedByAccountId && ![enrollment.studentAccountId, enrollment.instructorAccountId].includes(document.approvedByAccountId) && document.signedByAccountId; });
  const verifiedFormCodes = accepted.map(document => document.template.code);
  const progressionPolicy = trainingStandardProgressionPolicy(profile);
  const now = new Date();
  const progressionEvidence = progressionPolicy ? readTrainingProgressionEvidence(enrollment, enrollment.record?.sessions || [], documents, binding.profileHash, now) : undefined;
  if (!progressionPolicy && ((enrollment.record?.sessions || []).some(session => session.status === 'COMPLETED' && json(json(session.evidence).trainingStandardContext).environment === 'OPEN_WATER') || documents.some(document => ['TRAINING-DIVE-LOG', 'TRAINING_DIVE_LOG'].includes(document.template.code)))) throw new ConflictException({ code: 'DIVE_PROGRESSION_POLICY_REQUIRED', message: 'لا تعتمد أدلة مياه مفتوحة دون سياسة تدرج مرتبطة بالمصدر.' });
  if (progressionEvidence) {
    // Current approval is checked above; source/credential/age/depth coverage must
    // also span each actual past activity, not just its scheduled start.
    for (const activity of progressionEvidence.activities) {
      await assertTrainingStandardReady(tx, enrollment, enrollment.instructorAccountId, activity.startsAt, activity.context);
      await assertTrainingStandardReady(tx, enrollment, enrollment.instructorAccountId, activity.endsAt, activity.context);
    }
  }
  const record = enrollment.record;
  const signedSkills=record?.stages.flatMap(stage=>stage.skills.filter(skill=>skill.status==='COMPETENT'&&skill.signedOffAt&&skill.signedOffByInstructorId))||[];
  const earlier=signedSkills.filter(skill=>skill.signedOffByInstructorId!==enrollment.instructorAccountId);
  const history=earlier.length?await tx.auditEvent.findMany({where:{action:'training.skill_assessed',resourceId:{in:earlier.map(skill=>skill.id)},metadata:{path:['trainingStandardHash'],equals:binding.profileHash}},orderBy:{occurredAt:'desc'},take:2001,select:{resourceId:true,metadata:true}}):[];
  if(history.length>2000)throw new ConflictException('يلزم جرد كامل لتوقيعات المدربين السابقين قبل الإتمام.');
  const acceptedSkills=signedSkills.filter(skill=>skill.signedOffByInstructorId===enrollment.instructorAccountId||history.some(event=>{const metadata=json(event.metadata);return event.resourceId===skill.id&&metadata.assessedByAccountId===skill.signedOffByInstructorId&&metadata.signedOffAt===skill.signedOffAt?.toISOString()&&metadata.status==='COMPETENT';}));
  const completedSkillCodes=acceptedSkills.map(skill=>skill.skillCode);
  let qualifyingDives = 0;
  if (progressionPolicy && progressionEvidence) {
    try {
      const result = evaluateDiveProgression(progressionPolicy, progressionEvidence.dives, acceptedSkills.map(skill => ({ code: skill.skillCode, profileHash: binding.profileHash, completedAt: skill.signedOffAt!.toISOString() })), now.toISOString(), progressionEvidence.confined);
      qualifyingDives = result.completedQualifyingDives;
      if (result.violations.length) throw new ConflictException({ code: 'TRAINING_DIVE_PROGRESSION_REQUIRED', violations: result.violations, message: 'أدلة الغوص لا تستوفي تسلسل البرنامج أو حدوده المرتبطة بالمصدر.' });
    } catch (error) {
      if (error instanceof DiveProgressionError) throw new ConflictException({ code: 'DIVE_EVIDENCE_INVALID', message: 'صيغة أدلة الغوص أو تاريخ المياه المحصورة لا تستوفي سياسة المصدر.' });
      throw error;
    }
  }
  const gaps = trainingCompletionGaps(profile, { completedSessions: record?.sessions.filter(session => session.status === 'COMPLETED').length || 0, completedSkillCodes, verifiedFormCodes, verifiedOpenWaterDives: qualifyingDives, verifiedOpenWaterMinutes: 0 });
  if (gaps.length) throw new ConflictException({ code: 'TRAINING_STANDARD_EVIDENCE_REQUIRED', gaps, message: 'لم تكتمل أدلة برنامج المنظمة: المهارات والجلسات والنماذج والغوصات الموثقة.' });
  return binding;
}
