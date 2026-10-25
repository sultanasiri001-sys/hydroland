import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, Header, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { DatabaseService } from '../database/database.service';
import { PLATFORM_STAFFING_KEY, PLATFORM_STAFFING_KIND, record } from '../hr/staffing-catalog';
import { DocumentAuthorizationService } from './document-authorization.service';
import { DOCUMENT_DEPARTMENTS } from './document-form.domain';
import { ADMINISTRATIVE_CATALOG_REVISION, ADMINISTRATIVE_CATALOG_SOURCE, administrativeFormGuidance, legacyAdministrativeTemplates, reviewedAdministrativeTemplates } from './administrative-form-catalog';
import { templateFields, templateObject } from './document-template-input';

type Request = { auth: { accountId: string } };
function scope(value: unknown): string {
  if (value === undefined || value === 'ALL') return 'ALL';
  if (typeof value !== 'string' || !DOCUMENT_DEPARTMENTS.includes(value as never)) throw new BadRequestException('Invalid completion department.');
  return value;
}
// Compare only the persisted definition; ID and historical version are not content.
function definition(value: any): string {
  return JSON.stringify({ department: value.department, titleAr: value.titleAr, titleEn: value.titleEn,
    printable: value.printable, fields: templateFields(value.fields) });
}

/** Explicit version migration of recognized catalog definitions. Never startup seed,
 * arbitrary schema editor, contract migration, document approval or domain execution. */
@UseGuards(AccessTokenGuard)
@Controller('documents')
export class DocumentTemplateCompletionController {
  constructor(private readonly db: DatabaseService, private readonly authorization: DocumentAuthorizationService) {}

  private async prepare(tx: Prisma.TransactionClient, accountId: string, organizationId: string, department: string) {
    await this.authorization.assert(accountId, organizationId, 'TEMPLATE_CREATE', tx);
    await this.authorization.assert(accountId, organizationId, 'TEMPLATE_UPDATE', tx);
    const setting = await tx.operationalSetting.findUnique({ where: { key: PLATFORM_STAFFING_KEY }, select: { value: true } });
    const organization = await tx.organization.findUnique({ where: { id: organizationId }, select: { kind: true, status: true, ownerId: true } });
    if (record(setting?.value).organizationId !== organizationId || organization?.kind !== PLATFORM_STAFFING_KIND || organization.status !== 'ACTIVE' || organization.ownerId !== accountId) {
      throw new ForbiddenException('استكمال الكتالوج متاح لمالك جهة هيدرولاند الداخلية المتحقق فقط.');
    }
    const sources = reviewedAdministrativeTemplates(organizationId).filter(t => department === 'ALL' || t.department === department);
    const legacy = legacyAdministrativeTemplates(organizationId);
    if (new Set(sources.map(t => t.code)).size !== sources.length) throw new ConflictException('Duplicate completion catalog codes.');
    const rows = await tx.documentTemplate.findMany({ where: { organizationId, code: { in: sources.map(t => t.code) } },
      select: { id: true, code: true, department: true, version: true, status: true, titleAr: true, titleEn: true, printable: true, fields: true },
      orderBy: [{ code: 'asc' }, { version: 'asc' }] });
    const items = sources.map(target => {
      const versions = rows.filter(r => r.code === target.code), active = versions.filter(r => r.status === 'ACTIVE');
      let status: 'CREATE' | 'UPGRADE' | 'READY' | 'INACTIVE' | 'CONFLICT' | 'EDITED';
      const previous = legacy.find(t => t.code === target.code);
      if (versions.some(r => r.department !== target.department) || active.length > 1) status = 'CONFLICT';
      else if (!active.length) status = versions.length ? 'INACTIVE' : 'CREATE';
      else {
        try { status = definition(active[0]) === definition(target) ? 'READY'
          : previous && definition(active[0]) === definition(previous) ? 'UPGRADE' : 'EDITED'; }
        catch { status = 'EDITED'; }
      }
      return { code: target.code, titleAr: target.titleAr, department: target.department, status,
        currentVersion: active[0]?.version ?? null, nextVersion: Math.max(0, ...versions.map(r => r.version)) + 1,
        currentFieldCount: Array.isArray(active[0]?.fields) ? active[0].fields.length : 0,
        fields: target.fields, guidance: administrativeFormGuidance(target.code),
        addedKeys: target.fields.filter(f => !Array.isArray(active[0]?.fields) || !(active[0].fields as any[]).some(old => old.key === f.key)).map(f => f.key) };
    });
    const summary = { source: items.length, create: 0, upgrade: 0, ready: 0, inactive: 0, conflict: 0, edited: 0 };
    for (const item of items) summary[item.status.toLowerCase() as Exclude<keyof typeof summary, 'source'>]++;
    const planHash = createHash('sha256').update(JSON.stringify({ revision: ADMINISTRATIVE_CATALOG_REVISION, organizationId, department, sources, rows })).digest('hex');
    return { sources, rows, plan: { organizationId, department, planHash, revision: ADMINISTRATIVE_CATALOG_REVISION,
      sourcePack: ADMINISTRATIVE_CATALOG_SOURCE, sourceStatus: 'PREPARED_FOR_REVIEW', summary, items,
      existingDocumentsPreserved: true, specializedContractsIncluded: false, completeDocumentInventoryVerified: false } };
  }

  @Get('organizations/:organizationId/template-completion')
  @Header('Cache-Control', 'private, no-store')
  plan(@Req() request: Request, @Param('organizationId') organizationId: string, @Query('department') department?: string) {
    const selected = scope(department);
    return this.db.serializable(async tx => (await this.prepare(tx, request.auth.accountId, organizationId, selected)).plan);
  }

  @Post('organizations/:organizationId/template-completion')
  @Header('Cache-Control', 'private, no-store')
  async apply(@Req() request: Request, @Param('organizationId') organizationId: string, @Body() body: unknown) {
    const input = templateObject(body, ['department', 'expectedPlanHash', 'confirmed']);
    if (input.confirmed !== true || typeof input.expectedPlanHash !== 'string' || !/^[a-f0-9]{64}$/.test(input.expectedPlanHash)) {
      throw new BadRequestException('راجع تعريفات الحقول والقائمة وأكّد حفظ إصدارات القوالب.');
    }
    const selected = scope(input.department);
    try {
      return await this.db.serializable(async tx => {
        const { sources, rows, plan } = await this.prepare(tx, request.auth.accountId, organizationId, selected);
        if (plan.planHash !== input.expectedPlanHash) throw new ConflictException('تغير الكتالوج؛ أعد المعاينة قبل التأكيد.');
        if (plan.summary.conflict || plan.summary.edited) throw new ConflictException('توجد تعارضات أو تعديلات مخصصة؛ يلزم مراجعتها دون استبدالها آليًا.');
        const changes = plan.items.filter(t => t.status === 'CREATE' || t.status === 'UPGRADE');
        for (const item of changes) {
          const target = sources.find(t => t.code === item.code)!;
          if (item.status === 'UPGRADE') {
            const previous = rows.find(r => r.code === item.code && r.status === 'ACTIVE')!;
            const claimed = await tx.documentTemplate.updateMany({ where: { id: previous.id, organizationId, status: 'ACTIVE', version: previous.version }, data: { status: 'INACTIVE' } });
            if (claimed.count !== 1) throw new ConflictException('تغير إصدار القالب أثناء الاستكمال.');
          }
          await tx.documentTemplate.create({ data: { organizationId, code: target.code, department: target.department,
            titleAr: target.titleAr, titleEn: target.titleEn, version: item.nextVersion, status: 'ACTIVE', printable: target.printable,
            fields: templateFields(target.fields) as unknown as Prisma.InputJsonValue } });
        }
        const createdCodes = changes.filter(t => t.status === 'CREATE').map(t => t.code);
        const upgradedCodes = changes.filter(t => t.status === 'UPGRADE').map(t => t.code);
        if (changes.length) {
          const actor = await tx.account.findUniqueOrThrow({ where: { id: request.auth.accountId }, select: { personId: true } });
          await tx.auditEvent.create({ data: { actorId: actor.personId, action: 'DOCUMENT_TEMPLATE_CATALOG_COMPLETED', resource: 'DocumentTemplate', resourceId: organizationId,
            metadata: { accountId: request.auth.accountId, department: selected, revision: plan.revision, sourcePack: plan.sourcePack,
              sourceStatus: plan.sourceStatus, planHash: plan.planHash, createdCodes, upgradedCodes, existingDocumentsPreserved: true } } });
        }
        return { organizationId, department: selected, revision: plan.revision, created: createdCodes.length, upgraded: upgradedCodes.length,
          createdCodes, upgradedCodes, retained: plan.summary.ready, inactiveRetained: plan.summary.inactive, sourceCount: plan.summary.source,
          existingDocumentsPreserved: true, specializedContractsIncluded: false, completeDocumentInventoryVerified: false };
      });
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && ['P2002', 'P2034'].includes(String(error.code))) {
        throw new ConflictException('تغيرت القوالب أثناء الاستكمال؛ أعد المعاينة. لم تُحفظ دفعة جزئية.');
      }
      throw error;
    }
  }
}
