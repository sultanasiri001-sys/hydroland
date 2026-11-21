import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { reviewPlatform } from '../document-forms/internal-document-review.domain';
import { AuditService } from '../audit/audit.service';
import { CredentialObjectStorageService } from './credential-object-storage.service';

const kinds = ['NATIONAL_LICENSE', 'PROFESSIONAL_LICENSE', 'MEDICAL_EXAM', 'LIABILITY_WAIVER'] as const;
type View = 'instructor' | 'center' | 'platform';
const summary = {
  id: true,
  kind: true,
  revision: true,
  status: true,
  reason: true,
  originalName: true,
  centerId: true,
} as const;
const centerMember = (actor: string): Prisma.OrganizationMemberWhereInput => ({
  accountId: actor,
  status: 'ACTIVE',
  organization: { kind: 'DIVE_CENTER', status: 'ACTIVE' },
});

@Injectable()
export class InstructorDocumentsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly storage: CredentialObjectStorageService,
    private readonly audit: AuditService,
  ) {}

  private async scope(
    tx: Prisma.TransactionClient,
    actor: string,
    view: View,
  ): Promise<Prisma.InstructorDocumentWhereInput> {
    if (!['instructor', 'center', 'platform'].includes(view))
      throw new BadRequestException('Unknown review stage.');
    const role = view === 'instructor' ? 'INSTRUCTOR' : view === 'center' ? 'DIVE_CENTER' : 'ADMIN';
    const active = await tx.roleAssignment.findFirst({
      where: {
        accountId: actor,
        role,
        status: 'ACTIVE',
        account: { status: 'ACTIVE', emailVerifiedAt: { not: null } },
      },
      select: { id: true },
    });
    if (!active) throw new ForbiddenException();
    if (view === 'instructor') return { accountId: actor };
    if (view === 'center')
      return {
        status: 'CENTER_PENDING',
        accountId: { not: actor },
        center: {
          kind: 'DIVE_CENTER',
          status: 'ACTIVE',
          ownerId: actor,
          NOT: { members: { some: { accountId: actor, status: { not: 'ACTIVE' } } } },
        },
      };
    const platform = await reviewPlatform(tx);
    if (platform.ownerId !== actor) throw new ForbiddenException();
    return { status: 'PLATFORM_PENDING', accountId: { not: actor }, centerReviewerId: { not: actor } };
  }

  async list(actor: string, view: View) {
    return this.db.serializable(async (tx) => {
      const where = await this.scope(tx, actor, view);
      if (view === 'instructor') {
        const centers = await tx.organizationMember.findMany({
          where: centerMember(actor),
          select: { organization: { select: { id: true, displayName: true } } },
          orderBy: { organization: { displayName: 'asc' } },
        });
        const records = await tx.instructorDocument.findMany({
          where,
          select: summary,
          orderBy: [{ kind: 'asc' }, { revision: 'desc' }],
          distinct: ['kind'],
        });
        return { centers: centers.map((x) => x.organization), records };
      }
      const records = await tx.instructorDocument.findMany({
        where,
        select: {
          ...summary,
          account: { select: { person: { select: { firstName: true, lastName: true } } } },
          center: { select: { displayName: true } },
        },
        orderBy: { createdAt: 'asc' },
      });
      return { records };
    });
  }

  async upload(
    actor: string,
    kind: string,
    input: { centerId?: string; originalName?: string; base64?: string; previousId?: string | null },
  ) {
    if (!kinds.some((k) => k === kind) || typeof input?.centerId !== 'string' || !input.centerId)
      throw new BadRequestException('Choose a document and an affiliated center.');
    const name = typeof input.originalName === 'string' ? input.originalName.trim() : '';
    const payload = input.base64;
    if (
      !name ||
      name.length > 180 ||
      /[\/\\\u0000-\u001f]/.test(name) ||
      !/\.pdf$/i.test(name) ||
      typeof payload !== 'string' ||
      payload.length > 13_333_336
    )
      throw new BadRequestException('Attach one PDF up to 10 MB.');
    const bytes = Buffer.from(payload, 'base64');
    if (
      bytes.length > 10_000_000 ||
      bytes.subarray(0, 5).toString() !== '%PDF-' ||
      bytes.toString('base64') !== payload
    )
      throw new BadRequestException('Invalid PDF.');
    const centerId = input.centerId,
      digest = createHash('sha256').update(bytes).digest('hex');
    const inspect = async (tx: Prisma.TransactionClient) => {
      await this.scope(tx, actor, 'instructor');
      if (
        !(await tx.organizationMember.findFirst({
          where: { ...centerMember(actor), organizationId: centerId },
          select: { id: true },
        }))
      )
        throw new ForbiddenException('Choose an active affiliated center.');
      const previous = await tx.instructorDocument.findFirst({
        where: { accountId: actor, kind },
        orderBy: { revision: 'desc' },
        select: { ...summary, sha256: true },
      });
      if (
        previous?.centerId === centerId &&
        previous.sha256 === digest &&
        previous.status !== 'RETURNED'
      )
        return { existing: previous, revision: previous.revision };
      if (
        (previous?.id ?? null) !== (input.previousId ?? null) ||
        (previous && previous.status !== 'RETURNED')
      )
        throw new ConflictException('Reload the document before uploading.');
      return { existing: null, revision: (previous?.revision ?? 0) + 1 };
    };
    const before = await this.db.serializable(inspect);
    if (before.existing) return { id: before.existing.id, status: before.existing.status };
    const id = randomUUID(),
      storageKey = this.storage.key(actor, id, 'application/pdf', 'instructor-documents');
    await this.storage.put(storageKey, bytes, 'application/pdf');
    let stored = false;
    try {
      const result = await this.db.serializable(async (tx) => {
        const state = await inspect(tx);
        if (state.existing) return { id: state.existing.id, status: state.existing.status };
        const row = await tx.instructorDocument.create({
          data: {
            id,
            kind,
            accountId: actor,
            centerId,
            revision: state.revision,
            storageKey,
            sha256: digest,
            originalName: name,
          },
          select: { id: true, status: true },
        });
        await this.audit.record(
          {
            actorId: actor,
            action: 'INSTRUCTOR_DOCUMENT_SUBMITTED',
            resource: 'InstructorDocument',
            resourceId: id,
            metadata: { kind, centerId, revision: state.revision },
          },
          tx,
        );
        return row;
      });
      stored = result.id === id;
      return result;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new ConflictException('Reload this document.');
      throw error;
    } finally {
      if (
        !stored &&
        !(await this.db.instructorDocument
          .findUnique({ where: { id }, select: { id: true } })
          .catch(() => true))
      )
        await this.storage.delete(storageKey);
    }
  }

  async access(actor: string, view: View, id: string) {
    const lookup = async (tx: Prisma.TransactionClient) => {
      const where = await this.scope(tx, actor, view);
      const row = await tx.instructorDocument.findFirst({
        where: { ...where, id },
        select: { storageKey: true },
      });
      if (!row) throw new NotFoundException();
      return row;
    };
    const row = await this.db.serializable(lookup);
    if (!(await this.storage.exists(row.storageKey))) throw new NotFoundException();
    return this.db.serializable(async (tx) => {
      await lookup(tx);
      await this.audit.record(
        {
          actorId: actor,
          action: 'INSTRUCTOR_DOCUMENT_VIEWED',
          resource: 'InstructorDocument',
          resourceId: id,
          metadata: { view },
        },
        tx,
      );
      return this.storage.signedGet(row.storageKey);
    });
  }

  async decide(actor: string, view: View, id: string, input: { decision?: string; reason?: string }) {
    if (view !== 'center' && view !== 'platform') throw new BadRequestException('Invalid reviewer.');
    const decision = input?.decision;
    const reason = typeof input?.reason === 'string' ? input.reason.trim() : '';
    if (
      !['APPROVE', 'RETURN'].includes(decision ?? '') ||
      (decision === 'RETURN' && (!reason || reason.length > 500))
    )
      throw new BadRequestException('Enter a correction reason (up to 500 characters).');
    if (decision === 'APPROVE') {
      const row = await this.db.serializable(async (tx) => {
        const scope = await this.scope(tx, actor, view);
        return tx.instructorDocument.findFirst({
          where: { ...scope, id },
          select: { storageKey: true },
        });
      });
      if (!row) throw new NotFoundException('Document is no longer in this review queue.');
      if (!(await this.storage.exists(row.storageKey)))
        throw new ConflictException('The submitted file is unavailable.');
    }
    return this.db.serializable(async (tx) => {
      const where = await this.scope(tx, actor, view);
      const status =
        decision === 'RETURN' ? 'RETURNED' : view === 'center' ? 'PLATFORM_PENDING' : 'APPROVED';
      const result = await tx.instructorDocument.updateMany({
        where: { ...where, id },
        data: {
          status,
          reason: decision === 'RETURN' ? reason : null,
          ...(view === 'center' ? { centerReviewerId: actor } : {}),
        },
      });
      if (result.count !== 1) throw new NotFoundException('Document is no longer in this review queue.');
      await this.audit.record(
        {
          actorId: actor,
          action: 'INSTRUCTOR_DOCUMENT_REVIEWED',
          resource: 'InstructorDocument',
          resourceId: id,
          metadata: { view, status },
        },
        tx,
      );
      return { id, status };
    });
  }
}
