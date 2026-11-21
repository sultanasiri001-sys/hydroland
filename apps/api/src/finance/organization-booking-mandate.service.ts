import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { record } from '../hr/staffing-catalog';
import { requirePlatformFinanceApprover } from './finance-operation-grant.service';

import { BOOKING_PREPAYMENT_OPERATION, mandateAmountMinor } from './finance-operation-mandate';
const purpose = 'ORGANIZATION_BOOKING_PREPAYMENT';
const reviewed = 'ORGANIZATION_BOOKING_MANDATE_REVIEWED';

function timestamp(value: unknown) {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?(?:Z|[+-]\d\d:\d\d)$/.test(value)) {
    throw new BadRequestException('أدخل بداية ونهاية التفويض بالتاريخ والوقت والمنطقة الزمنية.');
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new BadRequestException('تاريخ التفويض غير صالح.');
  return date;
}

function mandateTerms(payload: unknown) {
  const terms = record(payload);
  if (terms.purpose !== purpose || typeof terms.delegateAccountId !== 'string' || !terms.delegateAccountId.trim()) {
    throw new ConflictException('يلزم مستند تفويض مالي يسمّي حساب المفوّض ويحدد دفع حجوزات الجهة.');
  }
  const accountId = terms.delegateAccountId;
  if (terms.decision === 'REVOKE' && typeof terms.grantId === 'string' && terms.grantId.trim()) {
    return { decision: 'REVOKE' as const, accountId, grantId: terms.grantId };
  }
  const limitMinor = mandateAmountMinor(terms.limitMinor);
  if (terms.decision !== 'APPOINT' || terms.currency !== 'SAR' || limitMinor === null) {
    throw new ConflictException('تتطلب تسمية المفوّض عملة الريال وحدًا صريحًا صالحًا بالهللات.');
  }
  const validFrom = timestamp(terms.validFrom), validUntil = timestamp(terms.validUntil);
  if (validFrom >= validUntil) throw new BadRequestException('مدة التفويض غير صالحة.');
  return { decision: 'APPOINT' as const, accountId, currency: 'SAR', limitMinor, validFrom, validUntil };
}

@Injectable()
export class OrganizationBookingMandateService {
  constructor(private readonly db: DatabaseService) {}

  private async evidence(tx: Prisma.TransactionClient, organizationId: string, id: string) {
    const document = await tx.managedDocument.findFirst({
      where: { id, organizationId, status: { in: ['SIGNED', 'ARCHIVED'] }, signedAt: { not: null }, signedByAccountId: { not: null } },
      select: { id: true, organizationId: true, referenceNumber: true, version: true, contentHash: true, payload: true,
        signedByAccountId: true, signedAt: true, organization: { select: { status: true } },
        lifecycleEvents: { where: { action: 'SIGNED', fromStatus: 'APPROVED', toStatus: 'SIGNED' }, select: { version: true, actorAccountId: true } } },
    });
    if (!document || !document.lifecycleEvents.some(e => e.version === document.version && e.actorAccountId === document.signedByAccountId)) {
      throw new NotFoundException('لم يعثر على تفويض موقع من الجهة لهذا الإصدار.');
    }
    const terms = mandateTerms(document.payload);
    return { document, terms };
  }

  async preview(actorId: string, organizationId: string, documentId: string) {
    return this.db.serializable(async tx => {
      await requirePlatformFinanceApprover(tx, actorId);
      const { document, terms } = await this.evidence(tx, organizationId, documentId);
      return { organizationId, documentId, referenceNumber: document.referenceNumber, version: document.version,
        contentHash: document.contentHash, signedByAccountId: document.signedByAccountId, signedAt: document.signedAt, terms };
    });
  }

  async approve(actorId: string, organizationId: string, documentId: string, input: Record<string, unknown>) {
    if (!input || Object.keys(input).some(k => !['expectedVersion', 'expectedContentHash'].includes(k))
      || !Number.isSafeInteger(input.expectedVersion) || typeof input.expectedContentHash !== 'string' || !input.expectedContentHash.trim()) {
      throw new BadRequestException('راجع نسخة المستند وأرسل رقم الإصدار وبصمته.');
    }
    return this.db.serializable(async tx => {
      const owner = await requirePlatformFinanceApprover(tx, actorId);
      await tx.$queryRaw`SELECT "id" FROM "ManagedDocument" WHERE "id"::text=${documentId} FOR UPDATE`;
      const { document, terms } = await this.evidence(tx, organizationId, documentId);
      if (document.version !== input.expectedVersion || document.contentHash !== input.expectedContentHash) {
        throw new ConflictException('تغير مستند التفويض. راجع النسخة الحالية.');
      }
      const prior = await tx.auditEvent.findFirst({ where: { action: reviewed, resource: 'ManagedDocument', resourceId: document.id } });
      if (prior) {
        const saved = record(prior.metadata);
        if (saved.version !== document.version || saved.contentHash !== document.contentHash || saved.organizationId !== organizationId
          || saved.accountId !== terms.accountId || saved.decision !== terms.decision || typeof saved.grantId !== 'string') {
          throw new ConflictException('سبق استعمال هذا المستند ببيانات مختلفة.');
        }
        return { grantId: saved.grantId, decision: terms.decision, documentId, alreadyApplied: true };
      }
      const delegate = await tx.account.findUnique({ where: { id: terms.accountId }, select: { personId: true } });
      const signer = await tx.account.findUnique({ where: { id: document.signedByAccountId! }, select: { personId: true } });
      if (!signer || !delegate || [signer.personId, delegate.personId].includes(owner.personId)) {
        throw new ForbiddenException('يجب أن يعتمد التفويض مسؤول منصة مستقل عن المفوّض وموقّع الجهة.');
      }
      let grantId: string;
      if (terms.decision === 'APPOINT') {
        const member = await tx.organizationMember.findFirst({ where: { organizationId, accountId: terms.accountId, status: 'ACTIVE',
          account: { status: 'ACTIVE' } }, select: { id: true } });
        if (document.organization.status !== 'ACTIVE' || !member || terms.validUntil <= new Date()) {
          throw new ConflictException('يلزم حساب مفوّض وعضوية وجهة نشطة ومدة تفويض سارية أو مستقبلية.');
        }
        const overlap = await tx.financeOperationGrant.findFirst({ where: { organizationId, accountId: terms.accountId,
          operation: BOOKING_PREPAYMENT_OPERATION, revokedAt: null, validFrom: { lt: terms.validUntil }, validUntil: { gt: terms.validFrom } },
          select: { id: true } });
        if (overlap) throw new ConflictException('يوجد تفويض يتداخل مع هذه المدة. ألغِ التفويض السابق بمستند الجهة قبل تعيين بديل.');
        grantId = documentId;
        const evidenceId = randomUUID();
        await tx.financeOperationGrant.create({ data: { id: grantId, accountId: terms.accountId, organizationId,
          operation: BOOKING_PREPAYMENT_OPERATION, currency: terms.currency, limitMinor: terms.limitMinor, validFrom: terms.validFrom,
          validUntil: terms.validUntil, approvedByAccountId: owner.id, approvalEvidenceReference: evidenceId } });
        await tx.auditEvent.create({ data: { id: evidenceId, actorId: owner.personId, action: 'FINANCE_OPERATION_GRANT_APPROVED',
          resource: 'FinanceOperationGrant', resourceId: grantId, metadata: { accountId: terms.accountId, organizationId,
            operation: BOOKING_PREPAYMENT_OPERATION, currency: terms.currency, limitMinor: terms.limitMinor, validFrom: terms.validFrom.toISOString(),
            validUntil: terms.validUntil.toISOString(), documentId, documentVersion: document.version, documentHash: document.contentHash } } });
      } else {
        grantId = terms.grantId;
        const saved = await tx.financeOperationGrant.updateMany({ where: { id: grantId, organizationId, accountId: terms.accountId,
          operation: BOOKING_PREPAYMENT_OPERATION, revokedAt: null }, data: { revokedAt: new Date() } });
        if (saved.count !== 1) throw new ConflictException('لا يطابق المستند تفويضًا قائمًا لهذا الحساب والجهة.');
      }
      await tx.auditEvent.create({ data: { actorId: owner.personId, action: reviewed, resource: 'ManagedDocument', resourceId: documentId,
        metadata: { organizationId, accountId: terms.accountId, grantId, decision: terms.decision, version: document.version, contentHash: document.contentHash } } });
      return { grantId, decision: terms.decision, documentId, alreadyApplied: false };
    });
  }
}
