import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OperationalDecision, Prisma, SafetyIncidentSeverity, SafetyIncidentStatus } from '@prisma/client';
import { createHash } from 'node:crypto';
import { safetyTripRevision, safetyTripSelect } from '../safety/safety-assessment-context';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';

const checklistItems = [
  { key: 'diver_credentials', label: 'صلاحية شهادات الغواصين' },
  { key: 'equipment_ready', label: 'فحص معدات الغوص' },
  { key: 'oxygen_first_aid', label: 'توفر الأكسجين والإسعافات' },
  { key: 'boat_fuel', label: 'جاهزية وسيلة الوصول والقارب والوقود عند انطباقه' },
  { key: 'weather_review', label: 'مراجعة الطقس والبحر' },
  { key: 'emergency_plan', label: 'تأكيد خطة الطوارئ' },
];
const tripSelect = safetyTripSelect;
const checklistSelect = { id: true, tripId: true, decision: true, notes: true, decidedAt: true, createdAt: true, updatedAt: true, trip: { select: tripSelect } } as const;
const incidentSelect = { id: true, tripId: true, severity: true, title: true, status: true, locationName: true, createdAt: true, updatedAt: true, resolvedAt: true, trip: { select: tripSelect } } as const;
const hash = (data: unknown) => createHash('sha256').update(JSON.stringify(data)).digest('hex');
const stale = () => new ConflictException('تغيرت بيانات الرحلة أو آخر فحص. حدّث بيانات الرحلة وراجعها قبل الحفظ.');
type Submission = 'checklist' | 'incident';

@Injectable()
export class CenterSafetyService {
  constructor(private readonly db: DatabaseService, private readonly audit: AuditService) {}

  private async center(tx: Prisma.TransactionClient, accountId: string) {
    const role = await tx.roleAssignment.findFirst({ where: { accountId, role: 'DIVE_CENTER', status: 'ACTIVE', account: { status: 'ACTIVE' } } });
    if (!role) throw new ForbiddenException('لا تملك صلاحية سلامة مركز غوص نشط.');
    const member = await tx.organizationMember.findFirst({ where: { accountId, status: 'ACTIVE', role: { in: ['OWNER', 'ADMIN'] }, organization: { kind: 'DIVE_CENTER', status: 'ACTIVE' } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], select: { organizationId: true } });
    if (!member) throw new ForbiddenException('يتطلب الإجراء إدارة مركز غوص نشط.');
    return member.organizationId;
  }

  private fields(input: Record<string, unknown>, allowed: string[]) {
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !allowed.includes(key))) throw new BadRequestException('حقول السلامة غير صالحة.');
  }
  private text(value: unknown, max: number, min = 0) {
    if (value === undefined && !min) return '';
    if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) throw new BadRequestException('تحقق من نص الحقول وأطوالها.');
    return value.trim();
  }
  private choice(value: unknown, choices: string[]) {
    const text = value ?? 'ALL';
    if (typeof text !== 'string' || !choices.includes(text)) throw new BadRequestException('مرشح السلامة غير صالح.');
    return text;
  }
  private page(value: unknown, fallback = 1, max = 100000) {
    if (value === undefined) return fallback;
    if (typeof value !== 'string' || !/^\d+$/.test(value) || Number(value) < 1 || Number(value) > max) throw new BadRequestException('رقم الصفحة غير صالح.');
    return Number(value);
  }
  private paging(total: number, requested: number, pageSize: number) {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    return { total, page: Math.min(requested, totalPages), totalPages, pageSize };
  }
  private needle(q: string) { return q.replace(/[\\%_]/g, '\\$&'); }

  async list(accountId: string, query: Record<string, unknown> = {}) {
    this.fields(query, ['q', 'decision', 'status', 'severity', 'checklistPage', 'incidentPage', 'pageSize']);
    const q = this.needle(this.text(query.q, 120)), pageSize = this.page(query.pageSize, 20, 50);
    const cp = this.page(query.checklistPage), ip = this.page(query.incidentPage);
    const decision = this.choice(query.decision, ['ALL', 'ALLOWED', 'REVIEW_REQUIRED', 'DEFERRED']);
    const status = this.choice(query.status, ['ALL', 'OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED']);
    const severity = this.choice(query.severity, ['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
    return this.db.serializable(async tx => {
      const organizationId = await this.center(tx, accountId);
      const checklistWhere: Prisma.SafetyChecklistWhereInput = { trip: { organizationId, ...(q ? { title: { contains: q, mode: 'insensitive' } } : {}) }, ...(decision === 'ALL' ? {} : { decision: decision as OperationalDecision }) };
      const incidentWhere: Prisma.SafetyIncidentWhereInput = { trip: { organizationId }, ...(q ? { OR: [{ title: { contains: q, mode: 'insensitive' } }, { trip: { title: { contains: q, mode: 'insensitive' } } }] } : {}), ...(status === 'ALL' ? {} : { status: status as SafetyIncidentStatus }), ...(severity === 'ALL' ? {} : { severity: severity as SafetyIncidentSeverity }) };
      const checklistPagination = this.paging(await tx.safetyChecklist.count({ where: checklistWhere }), cp, pageSize);
      const incidentPagination = this.paging(await tx.safetyIncident.count({ where: incidentWhere }), ip, pageSize);
      const checklists = await tx.safetyChecklist.findMany({ where: checklistWhere, select: checklistSelect, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (checklistPagination.page - 1) * pageSize, take: pageSize });
      const incidents = await tx.safetyIncident.findMany({ where: incidentWhere, select: incidentSelect, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (incidentPagination.page - 1) * pageSize, take: pageSize });
      return { checklists, incidents, checklistPagination, incidentPagination };
    });
  }

  async trips(accountId: string, query: Record<string, unknown> = {}) {
    this.fields(query, ['q', 'page', 'pageSize']);
    const q = this.needle(this.text(query.q, 120)), page = this.page(query.page), pageSize = this.page(query.pageSize, 20, 50);
    return this.db.serializable(async tx => {
      const organizationId = await this.center(tx, accountId), where = { organizationId, ...(q ? { title: { contains: q, mode: 'insensitive' as const } } : {}) };
      const pagination = this.paging(await tx.trip.count({ where }), page, pageSize);
      const items = await tx.trip.findMany({ where, select: tripSelect, orderBy: [{ startsAt: 'desc' }, { id: 'asc' }], skip: (pagination.page - 1) * pageSize, take: pageSize });
      return { items, ...pagination };
    });
  }

  private async tripState(tx: Prisma.TransactionClient, organizationId: string, tripId: string) {
    const trip = await tx.trip.findFirst({ where: { id: tripId, organizationId }, select: tripSelect });
    if (!trip) throw new NotFoundException('الرحلة غير موجودة ضمن المركز.');
    const latest = await tx.safetyChecklist.findFirst({ where: { tripId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { id: true, decision: true, updatedAt: true, decidedAt: true } });
    return { trip, stateToken: hash([trip, latest]), incidentStateToken: hash(trip), canAssess: !['COMPLETED', 'CANCELLED'].includes(trip.status) && trip.startsAt > new Date(), latestChecklist: latest, checklistItems };
  }
  preview(accountId: string, tripId: string) {
    return this.db.serializable(async tx => this.tripState(tx, await this.center(tx, accountId), tripId));
  }

  detail(accountId: string, kind: Submission, id: string) {
    return this.db.serializable(async tx => {
      const organizationId = await this.center(tx, accountId);
      if (kind === 'checklist') {
        const row = await tx.safetyChecklist.findFirst({ where: { id, trip: { organizationId } }, select: { ...checklistSelect, items: true } });
        if (!row) throw new NotFoundException('قائمة الفحص غير موجودة ضمن المركز.');
        return { ...row, checklistItems };
      }
      const row = await tx.safetyIncident.findFirst({ where: { id, trip: { organizationId } }, select: { ...incidentSelect, reportedByAccountId: true, description: true } });
      if (!row) throw new NotFoundException('البلاغ غير موجود ضمن المركز.');
      const { reportedByAccountId, description, ...summary } = row;
      // Preserve the existing privacy boundary: a manager's role does not reveal another reporter's narrative or the reviewer's private notes.
      return { ...summary, descriptionVisible: reportedByAccountId === accountId, description: reportedByAccountId === accountId ? description : null };
    });
  }

  private command(kind: Submission, input: Record<string, unknown>) {
    this.fields(input, kind === 'checklist' ? ['requestId', 'expectedState', 'items', 'notes'] : ['requestId', 'expectedState', 'severity', 'title', 'description', 'locationName']);
    if (typeof input.requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.requestId) || typeof input.expectedState !== 'string' || !/^[a-f0-9]{64}$/.test(input.expectedState)) throw new BadRequestException('حمّل بيانات الرحلة قبل الحفظ.');
    if (kind === 'checklist') {
      const items = input.items as Record<string, unknown>;
      this.fields(items, checklistItems.map(item => item.key));
      if (checklistItems.some(item => typeof items[item.key] !== 'boolean')) throw new BadRequestException('أكمل جميع بنود الفحص بقيم صحيحة.');
      return { items: Object.fromEntries(checklistItems.map(item => [item.key, items[item.key]])) as Record<string, boolean>, notes: this.text(input.notes, 2000) };
    }
    if (typeof input.severity !== 'string' || !['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(input.severity)) throw new BadRequestException('خطورة البلاغ غير صالحة.');
    return { severity: input.severity as SafetyIncidentSeverity, title: this.text(input.title, 160, 3), description: this.text(input.description, 5000, 3), locationName: this.text(input.locationName, 160) };
  }

  async submit(accountId: string, tripId: string, kind: Submission, input: Record<string, unknown>) {
    const command = this.command(kind, input);
    const fingerprint = hash([accountId, tripId, kind, input.expectedState, command]);
    return this.db.serializable(async tx => {
      const organizationId = await this.center(tx, accountId);
      const state = await this.tripState(tx, organizationId, tripId);
      const prior = await tx.auditEvent.findFirst({ where: { action: { in: ['SAFETY_ASSESSMENT_CREATED', 'SAFETY_INCIDENT_REPORTED'] }, metadata: { path: ['requestId'], equals: input.requestId as string } }, select: { metadata: true } });
      if (prior) {
        const metadata = prior.metadata as Record<string, unknown>;
        if (metadata.fingerprint !== fingerprint) throw new ConflictException('استُخدم طلب الحفظ ببيانات مختلفة.');
        return { ...(metadata.result as object), alreadyApplied: true };
      }
      if (input.expectedState !== (kind === 'checklist' ? state.stateToken : state.incidentStateToken)) throw stale();
      if (kind === 'checklist' && !state.canAssess) throw new ConflictException('لا يمكن تسجيل فحص قبل الرحلة بعد بدئها أو إغلاقها.');
      let result: Record<string, unknown>;
      if ('items' in command && command.items) {
        const decision = Object.values(command.items).every(value => value === true) ? 'REVIEW_REQUIRED' : 'DEFERRED';
        const row = await tx.safetyChecklist.create({ data: { tripId, items: command.items, notes: command.notes || null, decision } });
        result = { id: row.id, tripId, decision, createdAt: row.createdAt.toISOString(), alreadyApplied: false };
      } else if ('severity' in command && command.severity) {
        const row = await tx.safetyIncident.create({ data: { tripId, reportedByAccountId: accountId, severity: command.severity, title: command.title!, description: command.description!, locationName: command.locationName || null } });
        result = { id: row.id, tripId, severity: row.severity, status: row.status, createdAt: row.createdAt.toISOString(), externalDistressSent: false, alreadyApplied: false };
      } else throw new BadRequestException('نوع سجل السلامة غير صالح.');
      const resource = kind === 'checklist' ? 'SafetyChecklist' : 'SafetyIncident';
      await this.audit.record({ actorId: accountId, action: kind === 'checklist' ? 'SAFETY_ASSESSMENT_CREATED' : 'SAFETY_INCIDENT_REPORTED', resource, resourceId: String(result.id), metadata: { source: 'center', organizationId, tripId, tripRevision: safetyTripRevision(state.trip), requestId: input.requestId, fingerprint, result } }, tx);
      const reviewers = await tx.roleAssignment.findMany({ where: { role: { in: kind === 'checklist' ? ['ADMIN', 'REVIEWER'] : ['ADMIN'] }, status: 'ACTIVE', account: { status: 'ACTIVE' } }, distinct: ['accountId'], select: { accountId: true } });
      if (reviewers.length) await tx.notification.createMany({ data: reviewers.map(reviewer => ({ accountId: reviewer.accountId, type: kind === 'checklist' ? 'SAFETY_CHECKLIST_SUBMITTED' : 'SAFETY_INCIDENT_REPORTED', status: 'SENT' as const, sentAt: new Date(), payload: { source: 'center', resource, resourceId: String(result.id), tripId, message: kind === 'checklist' ? 'قائمة فحص مركز غوص تحتاج مراجعة.' : 'بلاغ سلامة جديد من مركز غوص يحتاج مراجعة.' } })) });
      return result;
    });
  }
}
