import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, Header, NotFoundException, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { DatabaseService } from '../database/database.service';
import { DocumentAuthorizationService } from './document-authorization.service';
import { DocumentAssetService } from './document-asset.service';
import { decisionDigest, plain, recordVersion, scopeId } from './owner-administrative-decision.domain';
import { administrativeEligibility, approvalInput, approvalKey, OWNER_APPROVAL_NOTICE, OWNER_APPROVAL_POLICY, OWNER_APPROVAL_PREFIX, verifyApproval } from './owner-administrative-approval.domain';
import { lockAccountIdentities } from '../admin/admin-authorization';
import { renderOwnerApprovalPdf } from './owner-administrative-approval.pdf';

type Actor = { auth: { accountId: string } };

/** Owner approval for internal administrative documents in all fourteen departments. Independent review, signature and domain execution remain separate. */
@UseGuards(AccessTokenGuard)
@Controller('documents/organizations/:organizationId')
export class OwnerAdministrativeApprovalController {
  constructor(private readonly db: DatabaseService, private readonly authz: DocumentAuthorizationService, private readonly assets: DocumentAssetService) {}

  private async owner(tx: Prisma.TransactionClient, accountId: string, org: string) {
    const access = await this.authz.assert(accountId, org, 'DOCUMENT_READ', tx);
    if (!('accessBasis' in access) || access.accessBasis !== 'PLATFORM_OWNER') throw new ForbiddenException('هذا المسار لمالك هيدرولاند الداخلي المتحقق فقط.');
    const account = await tx.account.findUniqueOrThrow({ where: { id: accountId }, select: { updatedAt: true, emailVerifiedAt: true } });
    const role = await tx.roleAssignment.findUniqueOrThrow({ where: { accountId_role: { accountId, role: 'ADMIN' } }, select: { updatedAt: true } });
    const organization = await tx.organization.findUniqueOrThrow({ where: { id: org }, select: { updatedAt: true } });
    const member = await tx.organizationMember.findUnique({ where: { organizationId_accountId: { organizationId: org, accountId } }, select: { updatedAt: true } });
    const pointer = await tx.operationalSetting.findUniqueOrThrow({ where: { key: 'PLATFORM_STAFFING_ORGANIZATION:v1' }, select: { updatedAt: true } });
    return { accountRevision: account.updatedAt.toISOString(), verifiedAt: account.emailVerifiedAt?.toISOString(),
      roleRevision: role.updatedAt.toISOString(), organizationRevision: organization.updatedAt.toISOString(),
      memberRevision: member?.updatedAt.toISOString() ?? null, platformRevision: pointer.updatedAt.toISOString() };
  }
  private async lock(tx: Prisma.TransactionClient, accountId: string, org: string, id: string) {
    await this.owner(tx, accountId, org);
    await tx.$queryRaw`SELECT "key" FROM "OperationalSetting" WHERE "key"='PLATFORM_STAFFING_ORGANIZATION:v1' FOR SHARE`;
    await lockAccountIdentities(tx, [accountId]);
    await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id"::text=${org} FOR SHARE`;
    await tx.$queryRaw`SELECT "id" FROM "OrganizationMember" WHERE "organizationId"::text=${org} AND "accountId"::text=${accountId} FOR SHARE`;
    await tx.$queryRaw`SELECT "id" FROM "ManagedDocument" WHERE "id"::text=${id} AND "organizationId"::text=${org} FOR UPDATE`;
  }
  private async source(tx: Prisma.TransactionClient, accountId: string, org: string, id: string) {
    const authority = await this.owner(tx, accountId, org);
    const d = await tx.managedDocument.findFirst({ where: { id, organizationId: org }, include: { template: true } });
    if (!d) throw new NotFoundException('Document not found in organization scope.');
    const eligibility = administrativeEligibility(d);
    return { d, eligibility, authority };
  }
  private async review(tx: Prisma.TransactionClient, accountId: string, org: string, id: string) {
    const { d, eligibility, authority } = await this.source(tx, accountId, org, id);
    if (!eligibility.eligible) return { d, eligibility, snapshot: null, reviewHash: null };
    const revision = await tx.documentRevision.findUnique({ where: { documentId_version: { documentId: id, version: d.version } } });
    if (!revision || revision.contentHash !== d.contentHash || decisionDigest(revision.payload) !== decisionDigest(d.payload)) throw new ConflictException('Source revision evidence is inconsistent.');
    const brandVersion = d.documentBrandVersion;
    if (brandVersion === null || !Number.isSafeInteger(brandVersion) || brandVersion < 1) throw new ConflictException('Source branding version is not pinned.');
    const branding = await tx.documentBrandSnapshot.findUnique({ where: { organizationId_brandVersion: { organizationId: org, brandVersion } } });
    if (!branding) throw new ConflictException('Pinned source branding is unavailable.');
    const snapshot = {
      documentId: d.id, organizationId: org, referenceNumber: d.referenceNumber, version: d.version, status: d.status,
      department: d.department, contentHash: d.contentHash, payload: d.payload, createdByAccountId: d.createdByAccountId,
      template: { id: d.template.id, code: d.template.code, version: d.template.version, department: d.template.department, titleAr: d.template.titleAr, titleEn: d.template.titleEn, fields: d.template.fields, printable: d.template.printable },
      branding: { brandVersion: branding.brandVersion, logoUrl: null, logoAssetId: branding.logoAssetId, brandNameAr: branding.brandNameAr, brandNameEn: branding.brandNameEn, footerAr: branding.footerAr, footerEn: branding.footerEn },
    };
    return { d, eligibility, snapshot, reviewHash: decisionDigest({ policy: OWNER_APPROVAL_POLICY, actorAccountId: accountId, authority, source: snapshot }) };
  }
  @Get('owner-approvals') @Header('Cache-Control', 'private, no-store')
  async summary(@Req() r: Actor, @Param('organizationId') org: string) {
    scopeId(org);
    return this.db.serializable(async tx => {
      await this.owner(tx, r.auth.accountId, org);
      const documents = await tx.managedDocument.findMany({ where: { organizationId: org }, select: { id: true, version: true, contentHash: true, payload: true } });
      const rows = await tx.operationalSetting.findMany({ where: { key: { in: documents.map(d => approvalKey(org, d.id, d.version)) } } });
      const approvals = rows.map(row => {
        const d = documents.find(d => row.key === approvalKey(org, d.id, d.version))!;
        const receipt = verifyApproval(row.value, org, d.id, d.version);
        if (receipt.source.contentHash !== d.contentHash || decisionDigest(receipt.source.payload) !== decisionDigest(d.payload)) throw new ConflictException('Administrative approval source has changed.');
        return { documentId: d.id, sourceVersion: d.version, status: receipt.status, referenceNumber: receipt.referenceNumber, recordedAt: receipt.recordedAt, actorAccountId: receipt.actorAccountId };
      });
      return { schemaVersion: 1, policy: OWNER_APPROVAL_POLICY, organizationId: org, authority: 'CURRENT_PLATFORM_OWNER_ALL_DEPARTMENTS', approvals };
    });
  }
  @Get('documents/:documentId/owner-approval') @Header('Cache-Control', 'private, no-store')
  async inspect(@Req() r: Actor, @Param('organizationId') org: string, @Param('documentId') id: string) {
    scopeId(org); scopeId(id);
    return this.db.serializable(async tx => {
      const v = await this.review(tx, r.auth.accountId, org, id);
      // Receipts are independent of later source revisions; keep their version explicit.
      const rows = await tx.operationalSetting.findMany({ where: { key: { startsWith: `${OWNER_APPROVAL_PREFIX}${org}:${id}:` } }, take: 101, orderBy: { updatedAt: 'desc' } });
      const receipts = rows.slice(0, 100).map(row => {
        const n = recordVersion(row.key.split(':').at(-1));
        const receipt = verifyApproval(row.value, org, id, n);
        return { id: receipt.id, sourceVersion: n, recordedAt: receipt.recordedAt, referenceNumber: receipt.referenceNumber, receiptHash: receipt.receiptHash };
      });
      const current = await tx.operationalSetting.findUnique({ where: { key: approvalKey(org, id, v.d.version) } });
      const existing = current ? verifyApproval(current.value, org, id, v.d.version) : null;
      return { schemaVersion: 1, policy: OWNER_APPROVAL_POLICY, organizationId: org, documentId: id, sourceVersion: v.d.version,
        eligible: v.eligibility.eligible && !existing, reason: existing ? 'ALREADY_RECORDED' : v.eligibility.reason, purpose: v.eligibility.purpose,
        notice: OWNER_APPROVAL_NOTICE, reviewHash: existing ? null : v.reviewHash, source: v.snapshot, existing,
        receipts, hasMoreReceipts: rows.length > 100, originalWorkflowUnchanged: true };
    });
  }
  @Post('documents/:documentId/owner-approval') @Header('Cache-Control', 'private, no-store')
  async record(@Req() r: Actor, @Param('organizationId') org: string, @Param('documentId') id: string, @Body() body: unknown) {
    scopeId(org); scopeId(id); const input = approvalInput(body);
    try {
      return await this.db.serializable(async tx => {
        await this.lock(tx, r.auth.accountId, org, id);
        const v = await this.review(tx, r.auth.accountId, org, id);
        if (!v.eligibility.eligible || !v.snapshot) throw new BadRequestException('هذه النسخة غير متاحة للاعتماد الإداري؛ راجع حالتها ومحتواها.');
        if (v.d.version !== input.expectedVersion || v.reviewHash !== input.reviewHash) throw new ConflictException('تغيّر المستند أو هويته؛ أعد المعاينة والتأكيد.');
        const key = approvalKey(org, id, v.d.version);
        if (await tx.operationalSetting.findUnique({ where: { key } })) throw new ConflictException('يوجد اعتماد إداري محفوظ لهذا الإصدار؛ لن يتكرر أو يستبدل.');
        const actor = await tx.account.findUniqueOrThrow({ where: { id: r.auth.accountId }, select: { personId: true } });
        const receiptId = randomUUID();
        const record = { policy: OWNER_APPROVAL_POLICY, id: receiptId, organizationId: org, documentId: id, sourceVersion: v.d.version,
          referenceNumber: `OA-${receiptId}`, status: 'ADMINISTRATIVELY_APPROVED', recordedAt: new Date().toISOString(), actorAccountId: r.auth.accountId,
          purpose: v.eligibility.purpose, note: input.note, scopeNotice: OWNER_APPROVAL_NOTICE, source: v.snapshot,
          independentReview: false, electronicSignature: false, originalWorkflowUnchanged: true, confirmation: { administrativeOnly: true, notIndependentApproval: true } };
        const receipt = { ...record, receiptHash: decisionDigest(record) };
        await tx.operationalSetting.create({ data: { key, value: receipt as unknown as Prisma.InputJsonValue } });
        await tx.auditEvent.create({ data: { actorId: actor.personId, action: 'OWNER_ADMINISTRATIVE_APPROVAL_RECORDED', resource: 'OwnerAdministrativeApproval', resourceId: receiptId,
          metadata: { accountId: r.auth.accountId, organizationId: org, documentId: id, sourceVersion: v.d.version, policy: OWNER_APPROVAL_POLICY, receiptHash: receipt.receiptHash, independentReview: false, electronicSignature: false } } });
        return { schemaVersion: 1, organizationId: org, documentId: id, sourceVersion: v.d.version, receipt, originalWorkflowUnchanged: true };
      });
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e && ['P2002', 'P2034'].includes(String(e.code))) throw new ConflictException('Concurrent decision or revision; read the latest saved result before retrying.');
      throw e;
    }
  }
  @Post('documents/:documentId/owner-approval/reopen') @Header('Cache-Control', 'private, no-store')
  async reopen(@Req() r: Actor, @Param('organizationId') org: string, @Param('documentId') id: string, @Body() body: unknown) {
    scopeId(org); scopeId(id);
    if (!plain(body) || Object.keys(body).some(k => !['expectedVersion', 'receiptHash', 'note', 'confirmed'].includes(k)) || body.confirmed !== true
      || typeof body.receiptHash !== 'string' || typeof body.note !== 'string' || body.note.trim().length < 5 || body.note.length > 2000
      || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(body.note)) throw new BadRequestException('أكد إنشاء نسخة جديدة وسجل سبب التعديل.');
    const version = recordVersion(body.expectedVersion), note = body.note.trim(), receiptHash = body.receiptHash;
    return this.db.serializable(async tx => {
      await this.lock(tx, r.auth.accountId, org, id);
      const v = await this.review(tx, r.auth.accountId, org, id);
      if (v.d.version !== version) throw new ConflictException('تغير الإصدار؛ أعد قراءة الحالة.');
      if (!v.eligibility.eligible) throw new BadRequestException('النسخ المعتمدة استقلاليًا أو الموقعة أو المؤرشفة تبقى في مسارها المختص.');
      const stored = await tx.operationalSetting.findUnique({ where: { key: approvalKey(org, id, version) } });
      if (!stored) throw new ConflictException('لا يوجد اعتماد إداري لهذه النسخة.');
      const receipt = verifyApproval(stored.value, org, id, version);
      if (receipt.receiptHash !== receiptHash || receipt.source.contentHash !== v.d.contentHash || decisionDigest(receipt.source.payload) !== decisionDigest(v.d.payload)) throw new ConflictException('تغير إثبات الاعتماد أو المصدر؛ أعد المراجعة.');
      const nextVersion = version + 1;
      await tx.managedDocument.update({ where: { id }, data: { version: nextVersion, status: 'DRAFT' } });
      await tx.documentRevision.create({ data: { documentId: id, version: nextVersion, contentHash: v.d.contentHash, payload: v.d.payload as Prisma.InputJsonValue, createdByAccountId: r.auth.accountId } });
      await tx.documentLifecycleEvent.create({ data: { documentId: id, actorAccountId: r.auth.accountId, action: 'OWNER_ADMINISTRATIVE_REVISION_OPENED', fromStatus: v.d.status, toStatus: 'DRAFT', version: nextVersion,
        metadata: { previousVersion: version, previousAdministrativeReceiptHash: receiptHash, note } } });
      const actor = await tx.account.findUniqueOrThrow({ where: { id: r.auth.accountId }, select: { personId: true } });
      await tx.auditEvent.create({ data: { actorId: actor.personId, action: 'OWNER_ADMINISTRATIVE_REVISION_OPENED', resource: 'ManagedDocument', resourceId: id,
        metadata: { accountId: r.auth.accountId, organizationId: org, sourceVersion: version, nextVersion, receiptHash, note } } });
      return { schemaVersion: 1, organizationId: org, documentId: id, sourceVersion: nextVersion, status: 'DRAFT', previousApprovalRetained: true };
    });
  }
  @Get('documents/:documentId/owner-approval/pdf')
  async pdf(@Req() r: Actor, @Param('organizationId') org: string, @Param('documentId') id: string, @Query('version') version: string, @Res() res: any) {
    scopeId(org); scopeId(id); const n = recordVersion(version);
    const receipt = await this.db.serializable(async tx => {
      await this.owner(tx, r.auth.accountId, org);
      const stored = await tx.operationalSetting.findUnique({ where: { key: approvalKey(org, id, n) } });
      if (!stored) throw new NotFoundException('Saved owner approval not found.');
      return verifyApproval(stored.value, org, id, n);
    });
    const rendered = await renderOwnerApprovalPdf(receipt, this.assets);
    await this.db.serializable(tx => this.owner(tx, r.auth.accountId, org));
    res.setHeader('Cache-Control', 'private, no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Type', 'application/pdf'); res.setHeader('Content-Disposition', `inline; filename="OWNER-APPROVAL-${receipt.id.replace(/[^a-zA-Z0-9-]/g, '')}.pdf"`);
    return res.send(rendered.bytes);
  }
}
