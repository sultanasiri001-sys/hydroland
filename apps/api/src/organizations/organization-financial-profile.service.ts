import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';

const taxStatuses = ['UNDECLARED', 'EXEMPT', 'TAXABLE'] as const;
const registrationStatuses = ['UNDECLARED', 'REGISTERED', 'IN_PROGRESS', 'NOT_REGISTERED', 'EXPIRED'] as const;
const procurementFields = ['method', 'system', 'representativeRole', 'representativeName', 'contractReference', 'acceptanceMethod'] as const;
type Procurement = Partial<Record<typeof procurementFields[number], string>>;

function procurementSettings(value: unknown): Procurement | null {
  if (value === null) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new BadRequestException('إعدادات المشتريات غير صالحة.');
  const settings = value as Record<string, unknown>;
  if (Object.keys(settings).some(key => !procurementFields.some(field => field === key))) throw new BadRequestException('خيار مشتريات غير معروف.');
  const result: Procurement = {};
  for (const key of procurementFields) {
    const text = settings[key];
    if (text === undefined) continue;
    if (typeof text !== 'string' || text.length > 200 || text.includes('\0')) throw new BadRequestException('تحقق من قيمة خيار المشتريات.');
    if (text.trim()) result[key] = text.trim();
  }
  return Object.keys(result).length ? result : null;
}
type Profile = {
  procurement?: Procurement;
  currency: 'SAR';
  taxStatus: typeof taxStatuses[number];
  registrationStatus: typeof registrationStatuses[number];
  revision: number;
};
const initial: Profile = { currency: 'SAR', taxStatus: 'UNDECLARED', registrationStatus: 'UNDECLARED', revision: 0 };

function properties(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new BadRequestException('بيانات المنشأة غير صالحة.');
  const body = input as Record<string, unknown>;
  if (Object.keys(body).some(key => !['currency', 'taxStatus', 'registrationStatus', 'expectedRevision', 'procurement'].includes(key))
    || body.currency !== 'SAR' || !taxStatuses.includes(body.taxStatus as Profile['taxStatus'])
    || !registrationStatuses.includes(body.registrationStatus as Profile['registrationStatus'])
    || typeof body.expectedRevision !== 'number' || !Number.isSafeInteger(body.expectedRevision) || body.expectedRevision < 0) {
    throw new BadRequestException('تحقق من العملة والحالة الضريبية وحالة التسجيل وإصدار البيانات.');
  }
  return {
    procurement: body.procurement === undefined ? undefined : procurementSettings(body.procurement),
    currency: 'SAR' as const, taxStatus: body.taxStatus as Profile['taxStatus'],
    registrationStatus: body.registrationStatus as Profile['registrationStatus'], expectedRevision: body.expectedRevision,
  };
}

@Injectable()
export class OrganizationFinancialProfileService {
  constructor(private readonly db: DatabaseService, private readonly audit: AuditService) {}

  private async load(tx: Prisma.TransactionClient, accountId: string, organizationId: string) {
    const member = await tx.organizationMember.findUnique({
      where: { organizationId_accountId: { organizationId, accountId } }, select: { status: true, role: true },
    });
    if (member?.status !== 'ACTIVE' || !['OWNER', 'ADMIN'].includes(member.role)) {
      throw new ForbiddenException('تتطلب بيانات المنشأة المالية صلاحية مالك أو مدير نشط.');
    }
    const key = 'organization-financial-profile:' + organizationId;
    const stored = await tx.operationalSetting.findUnique({ where: { key }, select: { value: true } });
    return { key, profile: stored ? stored.value as unknown as Profile : initial };
  }

  async read(accountId: string, organizationId: string) {
    return (await this.load(this.db, accountId, organizationId)).profile;
  }

  save(accountId: string, organizationId: string, input: unknown) {
    const values = properties(input);
    return this.db.serializable(async tx => {
      const { key, profile } = await this.load(tx, accountId, organizationId);
      const procurement = values.procurement === undefined ? profile.procurement : values.procurement;
      const sameSettings = procurementFields.every(key => procurement?.[key] === profile.procurement?.[key]);
      if (sameSettings && profile.revision && values.taxStatus === profile.taxStatus && values.registrationStatus === profile.registrationStatus) return profile;
      if (profile.revision !== values.expectedRevision) throw new ConflictException('تغيرت بيانات المنشأة. أعد فتحها للاطلاع على آخر تعديل.');
      const value: Profile = { ...(procurement ? { procurement } : {}), currency: values.currency, taxStatus: values.taxStatus, registrationStatus: values.registrationStatus, revision: profile.revision + 1 };
      if (profile.revision === 0) {
        const created = await tx.operationalSetting.createMany({ data: [{ key, value }], skipDuplicates: true });
        if (!created.count) throw new ConflictException('سبق حفظ بيانات المنشأة. أعد فتحها قبل التعديل.');
      } else {
        await tx.operationalSetting.update({ where: { key }, data: { value, updatedAt: new Date() } });
      }
      await this.audit.record({ actorId: accountId, resource: 'organization', resourceId: organizationId,
        action: 'organization.financial-profile.declared', metadata: { previous: profile, declared: value } }, tx);
      return value;
    });
  }
}
