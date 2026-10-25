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
const POLICY = 'HR_APPOINTMENT_REFERENCE_CHECK_V1';
const bindings: Record<string, string> = { 'HR-APPOINTMENT-RECORD': 'movementReference', 'HR-COMMENCEMENT': 'appointmentReference' };
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);

/** Read-only verification of saved canonical identifiers. No HR decision, IAM, source mutation or document approval. */
@UseGuards(AccessTokenGuard)
@Controller('documents/organizations/:organizationId')
export class HrDocumentSourceController {
  constructor(private readonly db: DatabaseService, private readonly authz: DocumentAuthorizationService) {}

  private async owner(tx: Db, actor: string, org: string) {
    const access = await this.authz.assert(actor, org, 'DOCUMENT_READ', tx);
    if (!('accessBasis' in access) || access.accessBasis !== 'PLATFORM_OWNER') throw new ForbiddenException('التحقق من السجلات الوظيفية الداخلية لمالك هيدرولاند المتحقق.');
  }
  private binding(template: { code: string; department: string; organizationId: string; fields: unknown }, org: string) {
    const key = Object.hasOwn(bindings, template.code) ? bindings[template.code] : null;
    if (!key || template.department !== 'HR' || template.organizationId !== org) throw new BadRequestException('هذا الفحص لمحضر التعيين ومحضر المباشرة الداخليين.');
    const fields = templateFields(template.fields);
    if (!['employeeReference', key].every(k => fields.some(f => f.key === k && f.type === 'TEXT'))) throw new ConflictException('تغيّر ربط حقول النموذج؛ راجع تعريف الإصدار.');
    return key;
  }
  private sourceScope(org: string): Prisma.EmploymentMovementWhereInput {
    return { type: 'APPOINTMENT', employment: { organizationId: org, orgUnit: { organizationId: org },
      OR: [{ positionId: null }, { position: { orgUnit: { organizationId: org } } }] } };
  }
  private async resolve(tx: Prisma.TransactionClient, org: string, template: { id: string; code: string; version: number; department: string; organizationId: string; fields: unknown }, employee: unknown, movement: unknown) {
    this.binding(template, org);
    const base = { schemaVersion: 1, policy: POLICY, organizationId: org, templateId: template.id, templateCode: template.code,
      templateVersion: template.version, observedAt: new Date().toISOString(), readOnly: true, operationalClosureVerified: false, commencementEstablished: false,
      notice: 'قراءة لمرجع الموظف وطلب تعيينه وحالتهما وقت الفحص. إثبات المباشرة وتنفيذ الصلاحيات يُراجعان في سجلاتهما المختصة.' };
    if (!uuid(employee) || !uuid(movement)) return { ...base, match: 'INVALID_REFERENCES', source: null };
    // Scope every join. A foreign or mismatched identifier has the same unavailable result as an absent one.
    const record = await tx.employmentMovement.findFirst({ where: { ...this.sourceScope(org), id: movement.toLowerCase(), employmentId: employee.toLowerCase() },
      select: { id: true, status: true, approvedByAccountId: true, effectiveAt: true, updatedAt: true,
        employment: { select: { id: true, status: true, startsAt: true, endsAt: true, updatedAt: true,
          orgUnit: { select: { code: true, nameAr: true, active: true, updatedAt: true } },
          position: { select: { titleAr: true, active: true, updatedAt: true } } } } } });
    if (!record) return { ...base, match: 'SOURCE_UNAVAILABLE', source: null };
    const e = record.employment;
    const source = { employmentId: e.id, appointmentId: record.id, employmentStatus: e.status, appointmentStatus: record.status,
      decisionApproverPresent: Boolean(record.approvedByAccountId), scheduledEffectiveAt: record.effectiveAt?.toISOString() ?? null,
      employmentStartsAt: e.startsAt?.toISOString() ?? null, employmentEndsAt: e.endsAt?.toISOString() ?? null,
      department: { code: e.orgUnit.code, nameAr: e.orgUnit.nameAr, active: e.orgUnit.active },
      position: e.position ? { titleAr: e.position.titleAr, active: e.position.active } : null,
      revisions: { employment: e.updatedAt.toISOString(), appointment: record.updatedAt.toISOString(), department: e.orgUnit.updatedAt.toISOString(), position: e.position?.updatedAt.toISOString() ?? null } };
    return { ...base, match: 'MATCHED', source, sourceHash: decisionDigest(source) };
  }

  @Get('hr-source-candidates') @Header('Cache-Control', 'private, no-store')
  async candidates(@Req() r: Actor, @Param('organizationId') org: string, @Query('cursor') cursor?: string) {
    scopeId(org); if (cursor !== undefined && !uuid(cursor)) throw new BadRequestException('مرجع صفحة الطلبات غير صالح.');
    const result = await this.db.serializable(async tx => {
      await this.owner(tx, r.auth.accountId, org);
      const scope = this.sourceScope(org);
      const after = cursor ? await tx.employmentMovement.findFirst({ where: { ...scope, id: cursor }, select: { id: true, createdAt: true } }) : null;
      if (cursor && !after) throw new NotFoundException('صفحة طلبات التعيين غير متاحة في هذه الجهة.');
      const rows = await tx.employmentMovement.findMany({ where: { ...scope, ...(after ? { OR: [{ createdAt: { lt: after.createdAt } }, { createdAt: after.createdAt, id: { lt: after.id } }] } : {}) },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 51,
        select: { id: true, status: true, employment: { select: { id: true, status: true,
          account: { select: { person: { select: { firstName: true, lastName: true } } } },
          orgUnit: { select: { nameAr: true } }, position: { select: { titleAr: true } } } } } });
      const items = rows.slice(0, 50).map(row => ({ appointmentId: row.id, employmentId: row.employment.id,
        name: `${row.employment.account.person.firstName} ${row.employment.account.person.lastName}`.trim(),
        departmentName: row.employment.orgUnit.nameAr, positionTitle: row.employment.position?.titleAr ?? null,
        appointmentStatus: row.status, employmentStatus: row.employment.status }));
      return { schemaVersion: 1, policy: POLICY, organizationId: org, readOnly: true, items, hasMore: rows.length > 50,
        nextCursor: rows.length > 50 ? items.at(-1)!.appointmentId : null };
    });
    await this.owner(this.db, r.auth.accountId, org);
    return result;
  }

  @Post('hr-source-preview') @HttpCode(200) @Header('Cache-Control', 'private, no-store')
  async preview(@Req() r: Actor, @Param('organizationId') org: string, @Body() body: unknown) {
    scopeId(org);
    const x = templateObject(body, ['templateId', 'expectedTemplateVersion', 'employeeReference', 'movementReference', 'appointmentReference']);
    scopeId(x.templateId); const templateId = x.templateId, version = recordVersion(x.expectedTemplateVersion);
    const result = await this.db.serializable(async tx => {
      await this.owner(tx, r.auth.accountId, org);
      const t = await tx.documentTemplate.findFirst({ where: { id: templateId, organizationId: org, status: 'ACTIVE' } });
      if (!t) throw new NotFoundException('قالب نشط غير موجود في هذه الجهة.');
      if (t.version !== version) throw new ConflictException('تغير إصدار القالب؛ أعد تحميل النموذج.');
      const key = this.binding(t, org);
      if (Object.hasOwn(x, key === 'movementReference' ? 'appointmentReference' : 'movementReference')) throw new BadRequestException('مرجع التعيين لا يطابق نوع النموذج.');
      return { ...await this.resolve(tx, org, t, x.employeeReference, x[key]), kind: 'UNSAVED_REFERENCE_PREVIEW', documentId: null, documentVersion: null };
    });
    await this.owner(this.db, r.auth.accountId, org);
    return result;
  }

  @Get('documents/:documentId/hr-source') @Header('Cache-Control', 'private, no-store')
  async saved(@Req() r: Actor, @Param('organizationId') org: string, @Param('documentId') id: string, @Query('version') version: string) {
    scopeId(org); scopeId(id); const expected = recordVersion(version);
    const result = await this.db.serializable(async tx => {
      await this.owner(tx, r.auth.accountId, org);
      const d = await tx.managedDocument.findFirst({ where: { id, organizationId: org }, include: { template: true } });
      if (!d) throw new NotFoundException('المستند غير موجود في هذه الجهة.');
      if (d.version !== expected) throw new ConflictException('تغير إصدار المستند؛ أعد قراءة النسخة المحفوظة.');
      const key = this.binding(d.template, org);
      validateDocumentPayload(d.template.fields, d.payload);
      const revision = await tx.documentRevision.findUnique({ where: { documentId_version: { documentId: id, version: d.version } } });
      if (!revision || revision.contentHash !== d.contentHash || decisionDigest(revision.payload) !== decisionDigest(d.payload)) throw new ConflictException('أدلة نسخة المستند غير متسقة.');
      const payload = d.payload as Record<string, unknown>;
      return { ...await this.resolve(tx, org, d.template, payload.employeeReference, payload[key]), kind: 'SAVED_DOCUMENT_REFERENCE_CHECK', documentId: id, documentVersion: d.version };
    });
    await this.owner(this.db, r.auth.accountId, org);
    return result;
  }
}
