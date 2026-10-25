import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, Header, NotFoundException, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { DatabaseService } from '../database/database.service';
import { DocumentAuthorizationService } from './document-authorization.service';
import { DocumentAssetService } from './document-asset.service';
import { decisionDigest, decisionInput, decisionKey, OWNER_DECISION_NOTICE, OWNER_DECISION_POLICY, OWNER_DECISION_PREFIX, recordVersion, routineEligibility, scopeId, verifyDecision } from './owner-administrative-decision.domain';
import { renderOwnerDecisionPdf } from './owner-administrative-decision.pdf';

type Actor = { auth: { accountId: string } };

/** A separate, append-only administrative record. Never APPROVE, SIGN or ARCHIVE a source document. */
@UseGuards(AccessTokenGuard)
@Controller('documents/organizations/:organizationId/documents/:documentId/owner-decision')
export class OwnerAdministrativeDecisionController {
  constructor(private readonly db: DatabaseService, private readonly authz: DocumentAuthorizationService, private readonly assets: DocumentAssetService) {}

  private async owner(tx: Prisma.TransactionClient, accountId: string, org: string) {
    const access = await this.authz.assert(accountId, org, 'DOCUMENT_READ', tx);
    if (!('accessBasis' in access) || access.accessBasis !== 'PLATFORM_OWNER') throw new ForbiddenException('هذا المسار لمالك هيدرولاند الداخلي المتحقق فقط.');
  }
  private async source(tx: Prisma.TransactionClient, accountId: string, org: string, id: string) {
    await this.owner(tx, accountId, org);
    const d = await tx.managedDocument.findFirst({ where: { id, organizationId: org }, include: { template: true } });
    if (!d) throw new NotFoundException('Document not found in organization scope.');
    const eligibility = routineEligibility(d);
    return { d, eligibility };
  }
  private async review(tx: Prisma.TransactionClient, accountId: string, org: string, id: string) {
    const { d, eligibility } = await this.source(tx, accountId, org, id);
    if (!eligibility.eligible) return { d, eligibility, snapshot: null, reviewHash: null };
    const revision = await tx.documentRevision.findUnique({ where: { documentId_version: { documentId: id, version: d.version } } });
    if (!revision || revision.contentHash !== d.contentHash || decisionDigest(revision.payload) !== decisionDigest(d.payload)) throw new ConflictException('Source revision evidence is inconsistent.');
    const branding = await tx.documentBrandSnapshot.findUnique({ where: { organizationId_brandVersion: { organizationId: org, brandVersion: d.documentBrandVersion } } });
    if (!branding) throw new ConflictException('Pinned source branding is unavailable.');
    const snapshot = {
      documentId: d.id, organizationId: org, referenceNumber: d.referenceNumber, version: d.version, status: d.status,
      department: d.department, contentHash: d.contentHash, payload: d.payload, createdByAccountId: d.createdByAccountId,
      template: { id: d.template.id, code: d.template.code, version: d.template.version, department: d.template.department, titleAr: d.template.titleAr, titleEn: d.template.titleEn, fields: d.template.fields, printable: d.template.printable },
      branding: { brandVersion: branding.brandVersion, logoUrl: null, logoAssetId: branding.logoAssetId, brandNameAr: branding.brandNameAr, brandNameEn: branding.brandNameEn, footerAr: branding.footerAr, footerEn: branding.footerEn },
    };
    return { d, eligibility, snapshot, reviewHash: decisionDigest({ policy: OWNER_DECISION_POLICY, actorAccountId: accountId, source: snapshot }) };
  }
  @Get() @Header('Cache-Control', 'private, no-store')
  async inspect(@Req() r: Actor, @Param('organizationId') org: string, @Param('documentId') id: string) {
    scopeId(org); scopeId(id);
    return this.db.serializable(async tx => {
      const v = await this.review(tx, r.auth.accountId, org, id);
      // Receipts are independent of later source revisions; keep their version explicit.
      const rows = await tx.operationalSetting.findMany({ where: { key: { startsWith: `${OWNER_DECISION_PREFIX}${org}:${id}:` } }, take: 101, orderBy: { updatedAt: 'desc' } });
      const receipts = rows.slice(0, 100).map(row => {
        const n = recordVersion(row.key.split(':').at(-1));
        const receipt = verifyDecision(row.value, org, id, n);
        return { id: receipt.id, sourceVersion: n, recordedAt: receipt.recordedAt, referenceNumber: receipt.referenceNumber, receiptHash: receipt.receiptHash };
      });
      const current = await tx.operationalSetting.findUnique({ where: { key: decisionKey(org, id, v.d.version) } });
      const existing = current ? verifyDecision(current.value, org, id, v.d.version) : null;
      return { schemaVersion: 1, policy: OWNER_DECISION_POLICY, organizationId: org, documentId: id, sourceVersion: v.d.version,
        eligible: v.eligibility.eligible && !existing, reason: existing ? 'ALREADY_RECORDED' : v.eligibility.reason, purpose: v.eligibility.purpose,
        notice: OWNER_DECISION_NOTICE, reviewHash: existing ? null : v.reviewHash, source: v.snapshot, existing,
        receipts, hasMoreReceipts: rows.length > 100, originalWorkflowUnchanged: true };
    });
  }
  @Post() @Header('Cache-Control', 'private, no-store')
  async record(@Req() r: Actor, @Param('organizationId') org: string, @Param('documentId') id: string, @Body() body: unknown) {
    scopeId(org); scopeId(id); const input = decisionInput(body);
    try {
      return await this.db.serializable(async tx => {
        const v = await this.review(tx, r.auth.accountId, org, id);
        if (!v.eligibility.eligible || !v.snapshot) throw new BadRequestException('هذا النوع أو الإصدار خارج مسار المحاضر والمتابعة الروتينية.');
        if (v.d.version !== input.expectedVersion || v.reviewHash !== input.reviewHash) throw new ConflictException('تغيّر المستند أو هويته؛ أعد المعاينة والتأكيد.');
        const key = decisionKey(org, id, v.d.version);
        if (await tx.operationalSetting.findUnique({ where: { key } })) throw new ConflictException('يوجد قرار مسجل لهذا الإصدار؛ لن يُستبدل أو يتكرر.');
        const actor = await tx.account.findUniqueOrThrow({ where: { id: r.auth.accountId }, select: { personId: true } });
        const receiptId = randomUUID();
        const record = { policy: OWNER_DECISION_POLICY, id: receiptId, organizationId: org, documentId: id, sourceVersion: v.d.version,
          referenceNumber: `OD-${receiptId}`, status: 'OWNER_DECISION_RECORDED', recordedAt: new Date().toISOString(), actorAccountId: r.auth.accountId,
          purpose: v.eligibility.purpose, note: input.note, scopeNotice: OWNER_DECISION_NOTICE, source: v.snapshot,
          independentReview: false, electronicSignature: false, originalWorkflowUnchanged: true, confirmation: { routineOnly: true, notIndependentApproval: true } };
        const receipt = { ...record, receiptHash: decisionDigest(record) };
        await tx.operationalSetting.create({ data: { key, value: receipt as unknown as Prisma.InputJsonValue } });
        await tx.auditEvent.create({ data: { actorId: actor.personId, action: 'OWNER_ADMINISTRATIVE_DECISION_RECORDED', resource: 'OwnerAdministrativeDecision', resourceId: receiptId,
          metadata: { accountId: r.auth.accountId, organizationId: org, documentId: id, sourceVersion: v.d.version, policy: OWNER_DECISION_POLICY, receiptHash: receipt.receiptHash, independentReview: false, electronicSignature: false } } });
        return { schemaVersion: 1, organizationId: org, documentId: id, sourceVersion: v.d.version, receipt, originalWorkflowUnchanged: true };
      });
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e && ['P2002', 'P2034'].includes(String(e.code))) throw new ConflictException('Concurrent decision or revision; read the latest saved result before retrying.');
      throw e;
    }
  }
  @Get('pdf')
  async pdf(@Req() r: Actor, @Param('organizationId') org: string, @Param('documentId') id: string, @Query('version') version: string, @Res() res: any) {
    scopeId(org); scopeId(id); const n = recordVersion(version);
    const receipt = await this.db.serializable(async tx => {
      await this.owner(tx, r.auth.accountId, org);
      const stored = await tx.operationalSetting.findUnique({ where: { key: decisionKey(org, id, n) } });
      if (!stored) throw new NotFoundException('Saved owner decision not found.');
      return verifyDecision(stored.value, org, id, n);
    });
    const rendered = await renderOwnerDecisionPdf(receipt, this.assets);
    await this.db.serializable(tx => this.owner(tx, r.auth.accountId, org));
    res.setHeader('Cache-Control', 'private, no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Type', 'application/pdf'); res.setHeader('Content-Disposition', `inline; filename="OWNER-DECISION-${receipt.id.replace(/[^a-zA-Z0-9-]/g, '')}.pdf"`);
    return res.send(rendered.bytes);
  }
}
