import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, Header, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { DatabaseService } from '../database/database.service';
import { PLATFORM_STAFFING_KEY, PLATFORM_STAFFING_KIND, record } from '../hr/staffing-catalog';
import { DocumentAuthorizationService } from './document-authorization.service';
import { DOCUMENT_DEPARTMENTS } from './document-form.domain';
import { buildDepartmentTemplateCatalog } from './document-template-catalog';
import { buildOperationalDocumentCatalog } from './operational-document-catalog';
import { buildHrDocumentCatalog } from './hr-document-catalog';
import { templateFields } from './document-template-input';

type Request = { auth: { accountId: string } };
const statuses = ['MISSING', 'READY', 'INACTIVE', 'CONFLICT'] as const;
type SetupStatus = typeof statuses[number];
function scope(value: unknown): string {
  if (value === undefined || value === 'ALL') return 'ALL';
  if (typeof value !== 'string' || !DOCUMENT_DEPARTMENTS.includes(value as never)) throw new BadRequestException('Invalid setup department.');
  return value;
}

/** Explicit, add-only setup of the existing internal catalog; never a startup seed. */
@UseGuards(AccessTokenGuard)
@Controller('documents')
export class DocumentTemplateSetupController {
  constructor(private readonly db: DatabaseService, private readonly authorization: DocumentAuthorizationService) {}

  private async prepare(tx: Prisma.TransactionClient, accountId: string, organizationId: string, department: string) {
    await this.authorization.assert(accountId, organizationId, 'TEMPLATE_CREATE', tx);
    const setting = await tx.operationalSetting.findUnique({ where: { key: PLATFORM_STAFFING_KEY }, select: { value: true } });
    const organization = await tx.organization.findUnique({ where: { id: organizationId }, select: { kind: true, status: true, ownerId: true } });
    if (record(setting?.value).organizationId !== organizationId || organization?.kind !== PLATFORM_STAFFING_KIND || organization.status !== 'ACTIVE' || organization.ownerId !== accountId) {
      throw new ForbiddenException('تهيئة الكتالوج الداخلي متاحة لمالك جهة هيدرولاند الداخلية المتحقق فقط.');
    }
    const sources = [...buildDepartmentTemplateCatalog(organizationId), ...buildOperationalDocumentCatalog(organizationId), ...buildHrDocumentCatalog(organizationId)]
      .filter(t => department === 'ALL' || t.department === department).sort((a, b) => a.code.localeCompare(b.code));
    if (new Set(sources.map(t => t.code)).size !== sources.length) throw new ConflictException('Duplicate source catalog codes.');
    const rows = await tx.documentTemplate.findMany({
      where: { organizationId, code: { in: sources.map(t => t.code) } },
      select: { id: true, code: true, department: true, version: true, status: true },
      orderBy: [{ code: 'asc' }, { version: 'asc' }],
    });
    const items = sources.map(t => {
      const versions = rows.filter(r => r.code === t.code), active = versions.filter(r => r.status === 'ACTIVE');
      const status: SetupStatus = versions.some(r => r.department !== t.department) || active.length > 1 ? 'CONFLICT' : active.length ? 'READY' : versions.length ? 'INACTIVE' : 'MISSING';
      return { code: t.code, titleAr: t.titleAr, department: t.department, status };
    });
    const summary = { source: sources.length, missing: 0, ready: 0, inactive: 0, conflicts: 0 };
    for (const item of items) {
      if (item.status === 'MISSING') summary.missing++;
      else if (item.status === 'READY') summary.ready++;
      else if (item.status === 'INACTIVE') summary.inactive++;
      else summary.conflicts++;
    }
    const planHash = createHash('sha256').update(JSON.stringify({ revision: 1, organizationId, department, sources, rows })).digest('hex');
    return { sources, plan: { organizationId, department, planHash, summary, items, emptyTemplatesOnly: true,
      specializedContractsIncluded: false, completeDocumentInventoryVerified: false } };
  }

  @Get('organizations/:organizationId/template-setup')
  @Header('Cache-Control', 'private, no-store')
  plan(@Req() request: Request, @Param('organizationId') organizationId: string, @Query('department') department?: string) {
    const selected = scope(department);
    return this.db.serializable(async tx => (await this.prepare(tx, request.auth.accountId, organizationId, selected)).plan);
  }

  @Post('organizations/:organizationId/template-setup')
  @Header('Cache-Control', 'private, no-store')
  async apply(@Req() request: Request, @Param('organizationId') organizationId: string, @Body() body: unknown) {
    const input = record(body);
    if (!body || Array.isArray(body) || typeof body !== 'object' || Object.keys(input).some(k => !['department', 'expectedPlanHash', 'confirmed'].includes(k)) || input.confirmed !== true || typeof input.expectedPlanHash !== 'string' || !/^[a-f0-9]{64}$/.test(input.expectedPlanHash)) {
      throw new BadRequestException('راجع خطة التهيئة وأكّد إنشاء النماذج الفارغة الناقصة فقط.');
    }
    const selected = scope(input.department);
    try {
      return await this.db.serializable(async tx => {
        const { sources, plan } = await this.prepare(tx, request.auth.accountId, organizationId, selected);
        if (plan.planHash !== input.expectedPlanHash) throw new ConflictException('تغير حصر النماذج؛ أعد المعاينة قبل التأكيد.');
        if (plan.summary.conflicts) throw new ConflictException('توجد تعارضات في الإصدارات أو ملكية الإدارة؛ عالجها قبل التهيئة.');
        const missing = new Set(plan.items.filter(t => t.status === 'MISSING').map(t => t.code));
        const data = sources.filter(t => missing.has(t.code)).map(t => ({ organizationId, code: t.code, department: t.department,
          titleAr: t.titleAr, titleEn: t.titleEn, version: 1, status: 'ACTIVE' as const, printable: t.printable, fields: templateFields(t.fields) as unknown as Prisma.InputJsonValue }));
        if (data.length) {
          const actor = await tx.account.findUniqueOrThrow({ where: { id: request.auth.accountId }, select: { personId: true } });
          await tx.documentTemplate.createMany({ data });
          await tx.auditEvent.create({ data: { actorId: actor.personId, action: 'DOCUMENT_TEMPLATE_BASELINE_SETUP', resource: 'DocumentTemplate', resourceId: organizationId,
            metadata: { accountId: request.auth.accountId, department: selected, planHash: plan.planHash, createdCodes: data.map(t => t.code), emptyTemplatesOnly: true } } });
        }
        return { organizationId, department: selected, created: data.length, createdCodes: data.map(t => t.code), retained: plan.summary.ready + plan.summary.inactive,
          inactiveRetained: plan.summary.inactive, sourceCount: plan.summary.source, emptyTemplatesOnly: true, specializedContractsIncluded: false, completeDocumentInventoryVerified: false };
      });
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && ['P2002', 'P2034'].includes(String(error.code))) {
        throw new ConflictException('تغيرت النماذج أثناء التهيئة؛ أعد المعاينة. لم تُعتمد دفعة جزئية.');
      }
      throw error;
    }
  }
}
