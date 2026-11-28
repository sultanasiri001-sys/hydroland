import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomBytes, randomUUID } from 'node:crypto';
import { lockAccountIdentities } from '../admin/admin-authorization';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { inspectMarineReadiness, REQUIRED_MARINE_DOCUMENTS } from '../marine-operations/marine-operations.domain';
import { EquipmentInspectionService } from '../trips/equipment-inspection.service';
import { AssetSourceKind, PassportAction, passportCommand, passportDigest, passportSource } from './asset-passport.domain';

type Tx = Prisma.TransactionClient;
type Passport = { id: string; sourceKind: AssetSourceKind; sourceId: string; currentVersion: number; status: 'ACTIVE' | 'REVOKED'; createdAt: Date; updatedAt: Date };
type Revision = { id: string; passportId: string; version: number; sourceDigest: string; sourceSnapshot: Prisma.JsonObject; qrToken: string; issuedAt: Date };
type Source = { digest: string; canManage: boolean; snapshot: Prisma.JsonObject };
type Equipment = { id: string; organizationId: string | null; name: string; active: boolean; assetCode: string;
  serialNumber: string | null; sku: string | null; stockStatus: string; updatedAt: Date };
type Inspection = { id: string; status: string; inspectedAt: Date; serviceExpiresAt: Date | null; reviewedByAccountId: string | null; createdAt: Date };
const asJson = (value: unknown): Prisma.JsonObject => JSON.parse(JSON.stringify(value));

@Injectable()
export class AssetPassportsService {
  constructor(private readonly db: DatabaseService, private readonly audit: AuditService, private readonly inspections: EquipmentInspectionService) {}

  /** Ownership is always native/current, never accepted from the caller or a
   * historical passport. A QR is an opaque reference, not a bearer grant. */
  private async scope(tx: Tx, actor: string, kind: AssetSourceKind, organizationId: string | null) {
    const account = await tx.account.findFirst({ where: { id: actor, status: 'ACTIVE' }, select: { id: true } });
    if (!account) throw new ForbiddenException('Active account required.');
    if (await tx.roleAssignment.findFirst({ where: { accountId: actor, role: 'ADMIN', status: 'ACTIVE' }, select: { id: true } })) return { canManage: true };
    if (!organizationId) throw new NotFoundException('Asset not found in your scope.');
    const member = await tx.organizationMember.findFirst({ where: { accountId: actor, organizationId, status: 'ACTIVE',
      organization: { status: 'ACTIVE', kind: { in: kind === 'EQUIPMENT' ? ['DIVE_CENTER'] : ['DIVE_CENTER', 'MARINE_OPERATOR'] } } }, select: { role: true } });
    if (!member) throw new NotFoundException('Asset not found in your scope.');
    if (kind === 'EQUIPMENT') {
      const role = await tx.roleAssignment.findFirst({ where: { accountId: actor, role: 'DIVE_CENTER', status: 'ACTIVE' }, select: { id: true } });
      if (!role || !['OWNER', 'ADMIN'].includes(member.role)) throw new NotFoundException('Asset not found in your scope.');
    }
    return { canManage: ['OWNER', 'ADMIN', 'OPERATOR', 'STAFF'].includes(member.role) };
  }

  private async lockAuthority(tx: Tx, actor: string, kind: AssetSourceKind, id: string, organizationId: string | null) {
    // A Serializable snapshot alone may serialize a command before a separate
    // revocation/transfer that has already committed. Lock the native rows before
    // authorizing a write; a change since the snapshot forces a fresh retry.
    await lockAccountIdentities(tx, [actor]);
    if (kind === 'EQUIPMENT') {
      await tx.$queryRaw`SELECT "id" FROM "RoleAssignment" WHERE "accountId"::text=${actor} AND "role"='DIVE_CENTER' ORDER BY "id" FOR SHARE`;
      await tx.$queryRaw`SELECT r."id" FROM "CalendarResource" r JOIN "EquipmentBarcode" b ON b."resourceId"::text=r."id"::text
        WHERE r."id"::text=${id} AND r."type"='EQUIPMENT' FOR SHARE OF r,b`;
    } else {
      await tx.$queryRaw`SELECT "id" FROM "MarineAsset" WHERE "id"::text=${id} FOR SHARE`;
    }
    if (organizationId) {
      await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id"::text=${organizationId} FOR SHARE`;
      await tx.$queryRaw`SELECT "id" FROM "OrganizationMember" WHERE "organizationId"::text=${organizationId}
        AND "accountId"::text=${actor} ORDER BY "id" FOR SHARE`;
    }
  }

  private async source(tx: Tx, actor: string, kind: AssetSourceKind, id: string, locking = false): Promise<Source> {
    if (kind === 'EQUIPMENT') {
      const rows = await tx.$queryRaw<Equipment[]>`SELECT r."id", r."name", r."active", b."organizationId"::text,
        b."assetCode", b."serialNumber", b."sku", b."stockStatus", b."updatedAt"
        FROM "CalendarResource" r JOIN "EquipmentBarcode" b ON b."resourceId"::text=r."id"::text
        WHERE r."id"::text=${id} AND r."type"='EQUIPMENT'`;
      const asset = rows[0];
      if (!asset) throw new NotFoundException('Asset not found in your scope.');
      if (locking) await this.lockAuthority(tx, actor, kind, id, asset.organizationId);
      const permission = await this.scope(tx, actor, kind, asset.organizationId);
      const organization = asset.organizationId ? await tx.organization.findUnique({ where: { id: asset.organizationId }, select: { status: true } }) : null;
      const latest = (await tx.$queryRaw<Inspection[]>`SELECT "id", "status", "inspectedAt", "serviceExpiresAt", "reviewedByAccountId", "createdAt"
        FROM "EquipmentInspection" WHERE "resourceId"::text=${id} ORDER BY "inspectedAt" DESC, "createdAt" DESC, "id" DESC LIMIT 1`)[0];
      // Native policy values are bound into the digest but never disclosed as
      // source documents, staff identities or private inspection notes.
      const policies = await tx.$queryRaw<Array<{ ruleKey: string; state: string; metadata: unknown; updatedAt: Date }>>`
        SELECT "ruleKey", "state", "metadata", "updatedAt" FROM "PolicyControl"
        WHERE "category"='EQUIPMENT' AND "ruleKey" IN ('INSPECTION_STATUS','SERVICE_EXPIRY') ORDER BY "ruleKey"`;
      let gate: object;
      try {
        const result = await this.inspections.evaluate([id], tx);
        gate = { blocked: result.blocked, reviewRequired: result.reviewRequired, policyStates: result.states,
          issues: result.issues.map(issue => issue.split(':')[0]) };
      } catch (error) {
        if (!(error instanceof ConflictException) || (error.getResponse() as { code?: string }).code !== 'MANDATORY_SOURCE_REVIEW_REQUIRED') throw error;
        gate = { blocked: true, reviewRequired: true, issues: ['MANDATORY_SOURCE_REVIEW_REQUIRED'] };
      }
      const serviceExpired = Boolean(latest?.serviceExpiresAt && latest.serviceExpiresAt <= new Date());
      const evidence = { inspectionStatus: latest?.status ?? 'NOT_RECORDED', inspectedAt: latest?.inspectedAt ?? null,
        serviceExpiresAt: latest?.serviceExpiresAt ?? null, serviceExpired, reviewed: Boolean(latest?.reviewedByAccountId),
        evidenceComplete: Boolean(latest?.status === 'PASS' && latest.reviewedByAccountId && latest.serviceExpiresAt && !serviceExpired), nativeGate: gate };
      const snapshot = asJson({ kind, displayName: asset.name, identity: { assetCode: asset.assetCode, serialNumber: asset.serialNumber, sku: asset.sku },
        active: asset.active, stockStatus: asset.stockStatus, organizationStatus: organization?.status ?? 'UNASSIGNED', evidence, operationalClearance: false });
      return { ...permission, snapshot, digest: passportDigest({ asset, inspection: latest ?? null, policies, snapshot }) };
    }
    const asset = await tx.marineAsset.findUnique({ where: { id }, include: { documents: { orderBy: { id: 'asc' } }, maintenance: { orderBy: { id: 'asc' } } } });
    if (!asset) throw new NotFoundException('Asset not found in your scope.');
    if (locking) await this.lockAuthority(tx, actor, kind, id, asset.organizationId);
    const permission = await this.scope(tx, actor, kind, asset.organizationId);
    const organization = await tx.organization.findUnique({ where: { id: asset.organizationId }, select: { status: true } });
    const now = new Date();
    const documents = asset.documents.map(doc => ({ documentType: doc.documentType, status: doc.status,
      expiresAt: doc.expiresAt, expired: Boolean(doc.expiresAt && doc.expiresAt <= now), hasFile: Boolean(doc.storageKey && doc.sha256), reviewed: Boolean(doc.verifiedAt) }));
    const evidenceComplete = REQUIRED_MARINE_DOCUMENTS.every(type => documents.some(doc => doc.documentType === type && doc.status === 'VERIFIED' && doc.hasFile && doc.reviewed && !doc.expired));
    const nativeReadiness = inspectMarineReadiness(asset, now);
    const snapshot = asJson({ kind, displayName: asset.name, identity: { assetType: asset.assetType, registrationNumber: asset.registrationNumber,
      hullNumber: asset.hullNumber, passengerCapacity: asset.passengerCapacity }, assetStatus: asset.status, organizationStatus: organization?.status ?? 'UNASSIGNED',
      evidence: { evidenceComplete, documents, nativeReadiness: nativeReadiness.status === 'READY' && !evidenceComplete
        ? { status: 'NEEDS_REVIEW', reasonCodes: [...nativeReadiness.reasonCodes, 'DOCUMENT_EVIDENCE_INCOMPLETE'] } : nativeReadiness }, operationalClearance: false });
    // The native evidence (including attachment hashes and review revisions) is
    // bound, but never returned in a QR verification response.
    const { maintenance, documents: nativeDocuments, ...identity } = asset;
    const evidenceRecords = nativeDocuments.map(({ reviewNote: _note, originalName: _name, ...doc }) => doc);
    const maintenanceRecords = maintenance.map(({ notes: _notes, ...record }) => record);
    return { ...permission, snapshot, digest: passportDigest({ identity, evidenceRecords, maintenanceRecords, snapshot }) };
  }

  private async passport(tx: Tx, kind: AssetSourceKind, id: string) {
    return (await tx.$queryRaw<Passport[]>`SELECT * FROM "AssetPassport" WHERE "sourceKind"=${kind} AND "sourceId"=${id}`)[0];
  }

  private revisionStatus(passport: Passport, revision: Revision, source: Source) {
    if (passport.status === 'REVOKED') return 'REVOKED';
    if (revision.version !== passport.currentVersion) return 'SUPERSEDED';
    return revision.sourceDigest === source.digest ? 'CURRENT' : 'STALE';
  }

  private async view(tx: Tx, kind: AssetSourceKind, id: string, source: Source) {
    const passport = await this.passport(tx, kind, id);
    if (!passport) return { sourceKind: kind, sourceId: id, sourceDigest: source.digest, source: source.snapshot, canManage: source.canManage, passport: null, revisions: [] };
    const revisions = await tx.$queryRaw<Revision[]>`SELECT "id", "passportId", "version", "sourceDigest", "sourceSnapshot", "qrToken", "issuedAt"
      FROM "AssetPassportRevision" WHERE "passportId"=${passport.id} ORDER BY "version" DESC LIMIT 100`;
    const revocation = passport.status === 'REVOKED' ? (await tx.$queryRaw<Array<{ reason: string; occurredAt: Date }>>`
      SELECT "reason", "occurredAt" FROM "AssetPassportCommand" WHERE "passportId"=${passport.id} AND "action"='REVOKE' LIMIT 1`)[0] : null;
    return { sourceKind: kind, sourceId: id, sourceDigest: source.digest, source: source.snapshot, canManage: source.canManage,
      passport: { id: passport.id, currentVersion: passport.currentVersion, status: passport.status, revocation },
      historyTruncated: passport.currentVersion > revisions.length,
      revisions: revisions.map(revision => ({ id: revision.id, version: revision.version, issuedAt: revision.issuedAt,
        sourceDigest: revision.sourceDigest, sourceSnapshot: revision.sourceSnapshot,
        qrValue: 'hydroland:passport:' + revision.qrToken, status: this.revisionStatus(passport, revision, source) })) };
  }

  async read(actor: string, rawKind: string, id: string) {
    const kind = passportSource(rawKind, id);
    return this.db.serializable(async tx => this.view(tx, kind, id, await this.source(tx, actor, kind, id)));
  }

  async verify(actor: string, token: string) {
    if (!/^[0-9a-f]{64}$/.test(token)) throw new NotFoundException('Passport not found in your scope.');
    return this.db.serializable(async tx => {
      const revision = (await tx.$queryRaw<Revision[]>`SELECT "id", "passportId", "version", "sourceDigest", "sourceSnapshot", "qrToken", "issuedAt"
        FROM "AssetPassportRevision" WHERE "qrToken"=${token}`)[0];
      if (!revision) throw new NotFoundException('Passport not found in your scope.');
      const passport = (await tx.$queryRaw<Passport[]>`SELECT * FROM "AssetPassport" WHERE "id"=${revision.passportId}`)[0];
      if (!passport) throw new NotFoundException('Passport not found in your scope.');
      const source = await this.source(tx, actor, passport.sourceKind, passport.sourceId);
      // Deliberately no organization/source/reviewer IDs, serial/registration,
      // attachment locations, inspection narratives, prices or revoke notes.
      return { version: revision.version, issuedAt: revision.issuedAt, sourceKind: passport.sourceKind,
        displayName: source.snapshot.displayName, status: this.revisionStatus(passport, revision, source),
        sourceState: passport.sourceKind === 'EQUIPMENT'
          ? { active: source.snapshot.active, stockStatus: source.snapshot.stockStatus, organizationStatus: source.snapshot.organizationStatus }
          : { assetStatus: source.snapshot.assetStatus, organizationStatus: source.snapshot.organizationStatus },
        sourceMatches: revision.sourceDigest === source.digest, currentEvidence: source.snapshot.evidence,
        operationalClearance: false, evaluatedAt: new Date().toISOString() };
    });
  }

  async execute(actor: string, rawKind: string, id: string, action: PassportAction, body: unknown, retry = true): Promise<unknown> {
    const kind = passportSource(rawKind, id), input = passportCommand(body, action);
    const payloadDigest = passportDigest({ actor, kind, id, action, ...input });
    try {
      return await this.db.serializable(async tx => {
        await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${'asset-passport:' + kind + ':' + id})::bigint)`;
        const source = await this.source(tx, actor, kind, id, true);
        if (!source.canManage) throw new ForbiddenException('Asset management scope required.');
        const prior = (await tx.$queryRaw<Array<{ payloadDigest: string; revisionId: string; action: string }>>`
          SELECT "payloadDigest", "revisionId", "action" FROM "AssetPassportCommand" WHERE "requestId"=${input.requestId}`)[0];
        if (prior) {
          if (prior.payloadDigest !== payloadDigest) throw new ConflictException('This requestId belongs to a different passport command.');
          return { ...await this.view(tx, kind, id, source), replayed: true, receipt: { requestId: input.requestId, action: prior.action, revisionId: prior.revisionId } };
        }
        let passport = await this.passport(tx, kind, id);
        if ((passport?.currentVersion ?? 0) !== input.expectedVersion) throw new ConflictException('Passport version changed. Refresh before continuing.');
        if (passport?.status === 'REVOKED') throw new ConflictException('This passport is revoked. Its history cannot be reactivated.');
        if (action === 'ISSUE' && passport) throw new ConflictException('A passport already exists. Use an explicit update.');
        if (action !== 'ISSUE' && !passport) throw new ConflictException('Issue a passport first.');
        if (action !== 'REVOKE' && input.sourceDigest !== source.digest) throw new ConflictException('Native source changed. Review the current asset before issuing a version.');
        let revisionId: string;
        if (action === 'REVOKE') {
          const current = (await tx.$queryRaw<Revision[]>`SELECT "id" FROM "AssetPassportRevision" WHERE "passportId"=${passport!.id} AND "version"=${passport!.currentVersion}`)[0];
          if (!current) throw new ConflictException('Current passport revision is missing.');
          revisionId = current.id;
          await tx.$executeRaw`UPDATE "AssetPassport" SET "status"='REVOKED', "updatedAt"=NOW() WHERE "id"=${passport!.id}`;
        } else {
          if (passport) {
            const current = (await tx.$queryRaw<Array<{ sourceDigest: string }>>`SELECT "sourceDigest" FROM "AssetPassportRevision"
              WHERE "passportId"=${passport.id} AND "version"=${passport.currentVersion}`)[0];
            if (current?.sourceDigest === source.digest) throw new ConflictException('The current version already records this native source.');
            await tx.$executeRaw`UPDATE "AssetPassport" SET "currentVersion"="currentVersion"+1, "updatedAt"=NOW() WHERE "id"=${passport.id}`;
            passport = { ...passport, currentVersion: passport.currentVersion + 1 };
          } else {
            passport = { id: randomUUID(), sourceKind: kind, sourceId: id, currentVersion: 1, status: 'ACTIVE', createdAt: new Date(), updatedAt: new Date() };
            await tx.$executeRaw`INSERT INTO "AssetPassport"("id", "sourceKind", "sourceId", "currentVersion", "status") VALUES (${passport.id}, ${kind}, ${id}, 1, 'ACTIVE')`;
          }
          revisionId = randomUUID();
          await tx.$executeRaw`INSERT INTO "AssetPassportRevision"("id", "passportId", "version", "sourceDigest", "sourceSnapshot", "qrToken", "issuedByAccountId")
            VALUES (${revisionId}, ${passport.id}, ${passport.currentVersion}, ${source.digest}, ${JSON.stringify(source.snapshot)}::jsonb, ${randomBytes(32).toString('hex')}, ${actor})`;
        }
        await tx.$executeRaw`INSERT INTO "AssetPassportCommand"("requestId", "passportId", "revisionId", "actorAccountId", "action", "payloadDigest", "reason")
          VALUES (${input.requestId}, ${passport!.id}, ${revisionId}, ${actor}, ${action}, ${payloadDigest}, ${input.reason ?? null})`;
        await this.audit.record({ actorId: actor, action: 'ASSET_PASSPORT_' + action, resource: 'AssetPassport', resourceId: passport!.id,
          metadata: { requestId: input.requestId, sourceKind: kind, sourceId: id, revisionId, version: passport!.currentVersion,
            sourceDigest: source.digest, reason: input.reason ?? null, operationalClearance: false } }, tx);
        return { ...await this.view(tx, kind, id, source), replayed: false, receipt: { requestId: input.requestId, action, revisionId } };
      });
    } catch (error) {
      const known = error as { code?: string; meta?: { code?: string } };
      if (retry && (known.code === 'P2002' || (known.code === 'P2010' && known.meta?.code === '23505'))) return this.execute(actor, rawKind, id, action, body, false);
      throw error;
    }
  }
}
