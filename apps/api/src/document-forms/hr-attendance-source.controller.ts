import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, Header, HttpCode, NotFoundException, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { DatabaseService } from '../database/database.service';
import { DocumentAuthorizationService } from './document-authorization.service';
import { decisionDigest, recordVersion, scopeId } from './owner-administrative-decision.domain';
import { templateFields, templateObject } from './document-template-input';
import { validateDocumentPayload } from './document-payload';

type Actor = { auth: { accountId: string } };
type Db = Prisma.TransactionClient | DatabaseService;
type Template = { id: string; organizationId: string; department: string; code: string; version: number; fields: unknown };
const POLICY = 'HR_ATTENDANCE_REFERENCE_CHECK_V1';
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
const day = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
const localDay = (v: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(v);

/** Read saved HR facts only. Matching references never approves leave, records attendance or returns an employee to work. */
@UseGuards(AccessTokenGuard)
@Controller('documents/organizations/:organizationId')
export class HrAttendanceSourceController {
  constructor(private readonly db: DatabaseService, private readonly authz: DocumentAuthorizationService) {}

  private async owner(tx: Db, actor: string, org: string) {
    const access = await this.authz.assert(actor, org, 'DOCUMENT_READ', tx);
    if (!('accessBasis' in access) || access.accessBasis !== 'PLATFORM_OWNER') throw new ForbiddenException('فحص الحضور والإجازة لمالك هيدرولاند المتحقق.');
  }
  private employmentScope(org: string): Prisma.EmploymentWhereInput {
    return { organizationId: org, orgUnit: { organizationId: org }, OR: [{ positionId: null }, { position: { orgUnit: { organizationId: org } } }] };
  }
  private binding(t: Template, org: string) {
    if (t.organizationId !== org || t.department !== 'HR' || !['HR-ATTENDANCE-SUMMARY', 'HR-LEAVE-RETURN'].includes(t.code)) throw new BadRequestException('هذا الفحص لبيان الحضور ومحضر العودة من الإجازة.');
    const returning = t.code === 'HR-LEAVE-RETURN', fields = templateFields(t.fields);
    const required = [['employeeReference', 'TEXT'], ['attendanceReference', 'TEXT'], ...(returning ? [['leaveReference', 'TEXT'], ['returnDate', 'DATE']] : [])];
    if (!required.every(([key, type]) => fields.some(f => f.key === key && f.type === type))) throw new ConflictException('تغير ربط حقول النموذج؛ راجع تعريف الإصدار.');
    return returning;
  }
  private async resolve(tx: Prisma.TransactionClient, org: string, t: Template, input: Record<string, unknown>) {
    const returning = this.binding(t, org);
    const base = { schemaVersion: 1, policy: POLICY, organizationId: org, templateId: t.id, templateCode: t.code, templateVersion: t.version,
      observedAt: new Date().toISOString(), readOnly: true, operationalClosureVerified: false, returnToWorkEstablished: false };
    if (!uuid(input.employeeReference) || !uuid(input.attendanceReference) || returning && (!uuid(input.leaveReference) || !day(input.returnDate))) return { ...base, match: 'INVALID_REFERENCES', source: null };
    const employeeId = input.employeeReference.toLowerCase(), scope = this.employmentScope(org);
    const attendance = await tx.attendanceEntry.findFirst({ where: { id: input.attendanceReference.toLowerCase(), employmentId: employeeId, employment: scope },
      select: { id: true, status: true, workDate: true, clockInAt: true, clockOutAt: true, updatedAt: true, employment: { select: { id: true, status: true, updatedAt: true } } } });
    const leave = returning ? await tx.leaveRequest.findFirst({ where: { id: (input.leaveReference as string).toLowerCase(), employmentId: employeeId, employment: scope },
      select: { id: true, status: true, startsAt: true, endsAt: true, approvedByAccountId: true, updatedAt: true } }) : null;
    if (!attendance || returning && !leave) return { ...base, match: 'SOURCE_UNAVAILABLE', source: null };
    const workDate = attendance.workDate.toISOString().slice(0, 10);
    const source = { employmentId: attendance.employment.id, employmentStatus: attendance.employment.status,
      attendance: { id: attendance.id, workDate, status: attendance.status, clockInRecorded: Boolean(attendance.clockInAt), clockOutRecorded: Boolean(attendance.clockOutAt),
        clockInMatchesWorkDate: attendance.clockInAt ? localDay(attendance.clockInAt) === workDate : false,
        clockTimesConsistent: Boolean(attendance.clockInAt && (!attendance.clockOutAt || attendance.clockOutAt >= attendance.clockInAt)) },
      leave: leave ? { id: leave.id, status: leave.status, startsOn: localDay(leave.startsAt), endsOn: localDay(leave.endsAt), approverPresent: Boolean(leave.approvedByAccountId) } : null,
      returnChecks: leave ? { requestedReturnDate: input.returnDate, dateMatchesAttendance: input.returnDate === workDate,
        dateAfterLeaveEndDate: (input.returnDate as string) > localDay(leave.endsAt), leaveDatesConsistent: leave.endsAt >= leave.startsAt,
        approvedLeaveRecord: ['APPROVED', 'EFFECTIVE', 'CLOSED'].includes(leave.status) && Boolean(leave.approvedByAccountId) } : null,
      revisions: { employment: attendance.employment.updatedAt.toISOString(), attendance: attendance.updatedAt.toISOString(), leave: leave?.updatedAt.toISOString() ?? null } };
    return { ...base, match: 'MATCHED', source, sourceHash: decisionDigest(source) };
  }

  @Get('hr-attendance-candidates') @Header('Cache-Control', 'private, no-store')
  async candidates(@Req() r: Actor, @Param('organizationId') org: string, @Query() query: unknown) {
    scopeId(org);
    const q = templateObject(query, ['kind', 'employeeReference', 'cursor']);
    if (!['ATTENDANCE', 'LEAVE'].includes(q.kind as string) || q.employeeReference !== undefined && !uuid(q.employeeReference) || q.cursor !== undefined && !uuid(q.cursor)) throw new BadRequestException('مرشحات سجلات الحضور والإجازة غير صالحة.');
    const result = await this.db.serializable(async tx => {
      await this.owner(tx, r.auth.accountId, org);
      const scope = { employment: this.employmentScope(org), ...(q.employeeReference ? { employmentId: (q.employeeReference as string).toLowerCase() } : {}) };
      const cursor = q.cursor ? (q.cursor as string).toLowerCase() : null;
      const name = { employment: { select: { id: true, account: { select: { person: { select: { firstName: true, lastName: true } } } } } } } as const;
      let items: Array<Record<string, unknown>>, hasMore: boolean;
      if (q.kind === 'LEAVE') {
        const after = cursor ? await tx.leaveRequest.findFirst({ where: { ...scope, id: cursor }, select: { id: true, createdAt: true } }) : null;
        if (cursor && !after) throw new NotFoundException('صفحة السجلات غير متاحة في هذا النطاق.');
        const rows = await tx.leaveRequest.findMany({ where: { ...scope, ...(after ? { OR: [{ createdAt: { lt: after.createdAt } }, { createdAt: after.createdAt, id: { lt: after.id } }] } : {}) }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 51,
          select: { id: true, status: true, startsAt: true, endsAt: true, ...name } });
        hasMore = rows.length > 50;
        items = rows.slice(0, 50).map(x => ({ id: x.id, employmentId: x.employment.id, name: `${x.employment.account.person.firstName} ${x.employment.account.person.lastName}`.trim(), status: x.status, startsOn: localDay(x.startsAt), endsOn: localDay(x.endsAt) }));
      } else {
        const after = cursor ? await tx.attendanceEntry.findFirst({ where: { ...scope, id: cursor }, select: { id: true, workDate: true } }) : null;
        if (cursor && !after) throw new NotFoundException('صفحة السجلات غير متاحة في هذا النطاق.');
        const rows = await tx.attendanceEntry.findMany({ where: { ...scope, ...(after ? { OR: [{ workDate: { lt: after.workDate } }, { workDate: after.workDate, id: { lt: after.id } }] } : {}) }, orderBy: [{ workDate: 'desc' }, { id: 'desc' }], take: 51,
          select: { id: true, status: true, workDate: true, ...name } });
        hasMore = rows.length > 50;
        items = rows.slice(0, 50).map(x => ({ id: x.id, employmentId: x.employment.id, name: `${x.employment.account.person.firstName} ${x.employment.account.person.lastName}`.trim(), status: x.status, workDate: x.workDate.toISOString().slice(0, 10) }));
      }
      return { schemaVersion: 1, policy: POLICY, organizationId: org, kind: q.kind, employeeReference: q.employeeReference ? (q.employeeReference as string).toLowerCase() : null, readOnly: true, items, hasMore, nextCursor: hasMore ? items.at(-1)!.id : null };
    });
    await this.owner(this.db, r.auth.accountId, org);
    return result;
  }

  @Post('hr-attendance-preview') @HttpCode(200) @Header('Cache-Control', 'private, no-store')
  async preview(@Req() r: Actor, @Param('organizationId') org: string, @Body() body: unknown) {
    scopeId(org);
    const x = templateObject(body, ['templateId', 'expectedTemplateVersion', 'employeeReference', 'attendanceReference', 'leaveReference', 'returnDate']);
    scopeId(x.templateId); const templateId = x.templateId, version = recordVersion(x.expectedTemplateVersion);
    const result = await this.db.serializable(async tx => {
      await this.owner(tx, r.auth.accountId, org);
      const t = await tx.documentTemplate.findFirst({ where: { id: templateId, organizationId: org, status: 'ACTIVE' } });
      if (!t) throw new NotFoundException('قالب نشط غير موجود في هذه الجهة.');
      if (t.version !== version) throw new ConflictException('تغير إصدار القالب؛ أعد تحميل النموذج.');
      if (!this.binding(t, org) && (Object.hasOwn(x, 'leaveReference') || Object.hasOwn(x, 'returnDate'))) throw new BadRequestException('حقول العودة لا تخص بيان الحضور.');
      return { ...await this.resolve(tx, org, t, x), kind: 'UNSAVED_REFERENCE_PREVIEW', documentId: null, documentVersion: null };
    });
    await this.owner(this.db, r.auth.accountId, org);
    return result;
  }

  @Get('documents/:documentId/hr-attendance') @Header('Cache-Control', 'private, no-store')
  async saved(@Req() r: Actor, @Param('organizationId') org: string, @Param('documentId') id: string, @Query('version') version: string) {
    scopeId(org); scopeId(id); const expected = recordVersion(version);
    const result = await this.db.serializable(async tx => {
      await this.owner(tx, r.auth.accountId, org);
      const d = await tx.managedDocument.findFirst({ where: { id, organizationId: org }, include: { template: true } });
      if (!d) throw new NotFoundException('المستند غير موجود في هذه الجهة.');
      if (d.version !== expected) throw new ConflictException('تغير إصدار المستند؛ أعد قراءة النسخة المحفوظة.');
      this.binding(d.template, org); validateDocumentPayload(d.template.fields, d.payload);
      const revision = await tx.documentRevision.findUnique({ where: { documentId_version: { documentId: id, version: d.version } } });
      if (!revision || revision.contentHash !== d.contentHash || decisionDigest(revision.payload) !== decisionDigest(d.payload)) throw new ConflictException('أدلة نسخة المستند غير متسقة.');
      return { ...await this.resolve(tx, org, d.template, d.payload as Record<string, unknown>), kind: 'SAVED_DOCUMENT_REFERENCE_CHECK', documentId: id, documentVersion: d.version };
    });
    await this.owner(this.db, r.auth.accountId, org);
    return result;
  }
}
