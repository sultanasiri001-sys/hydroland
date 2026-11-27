import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MarketingCampaignLifecycle, MarketingCampaignLifecycleEvent, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { lockAccountIdentities } from '../admin/admin-authorization';
import { DatabaseService } from '../database/database.service';
import { reviewPlatform } from '../document-forms/internal-document-review.domain';
import { validateMarketingDraftRecord } from './marketing-draft.domain';
import { assertCampaignRecord, campaignBudget, campaignCommand, campaignDecision, campaignEvidenceCommand, campaignHash, campaignId, campaignJson, campaignObject, campaignPreparationHash, campaignPrepare, campaignRecordHash, campaignRevoke, campaignRights, CAMPAIGN_NOTICE, CAMPAIGN_POLICY, CAMPAIGN_TEMPLATES } from './campaign-lifecycle.domain';
import { campaignFinanceAccount, campaignOwnerBinding, campaignSource, campaignSourceFailure, CampaignPlatform } from './campaign-lifecycle.sources';
import { campaignEvidence, CampaignEvidence, campaignMeasurements } from './campaign-lifecycle.evidence';

type Tx = Prisma.TransactionClient;
type Row = MarketingCampaignLifecycle;
type Command = ReturnType<typeof campaignCommand>;
type Occurrence = { id: string; eventId: string; auditId: string; at: Date };
const json = (value: unknown) => campaignJson(value) as Prisma.InputJsonValue;
const eventBody = (event: MarketingCampaignLifecycleEvent) => {
  const { eventDigest: _digest, ...body } = event;
  return body;
};

@Injectable()
export class CampaignLifecycleService {
  constructor(private readonly db: DatabaseService) {}

  private async owner(tx: Tx, actorId: string) {
    const p = await reviewPlatform(tx);
    if (p.ownerId !== actorId) throw new ForbiddenException('Campaign preparation is available only to the current verified platform owner.');
    return p;
  }
  private async lockOwner(tx: Tx, actorId: string) {
    await tx.$queryRaw`SELECT "key" FROM "OperationalSetting" WHERE "key"='PLATFORM_STAFFING_ORGANIZATION:v1' FOR SHARE`;
    await lockAccountIdentities(tx, [actorId]);
    const p = await this.owner(tx, actorId);
    await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id"::text=${p.id} FOR SHARE`;
    await tx.$queryRaw`SELECT "id" FROM "OrganizationMember" WHERE "organizationId"::text=${p.id} AND "accountId"::text=${actorId} FOR SHARE`;
    return this.owner(tx, actorId);
  }
  private async draft(tx: Tx, organizationId: string, id: string, lock = false) {
    if (lock) await tx.$queryRaw`SELECT "id" FROM "MarketingCampaignDraft" WHERE "id"::text=${id} AND "organizationId"::text=${organizationId} FOR UPDATE`;
    const row = await tx.marketingCampaignDraft.findFirst({ where: { id, organizationId } });
    if (!row) throw new NotFoundException('Campaign is unavailable.');
    validateMarketingDraftRecord(row);
    const history = await tx.marketingCampaignDraftRevision.findUnique({ where: { campaignDraftId_revision: { campaignDraftId: id, revision: row.revision } } });
    if (!history) throw new ConflictException('CAMPAIGN_DRAFT_HISTORY_MISSING');
    const { recordDigest, ...body } = history;
    if (recordDigest !== campaignHash(body) || campaignHash(history.snapshot) !== campaignHash(campaignJson(row))) throw new ConflictException('CAMPAIGN_DRAFT_HISTORY_CHANGED');
    return row;
  }
  private async row(tx: Tx, organizationId: string, campaignDraftId: string) {
    const row = await tx.marketingCampaignLifecycle.findFirst({ where: { organizationId, campaignDraftId } });
    if (!row) return null;
    assertCampaignRecord(row);
    const latest = await tx.marketingCampaignLifecycleEvent.findUnique({ where: { lifecycleId_afterRevision: { lifecycleId: row.id, afterRevision: row.revision } } });
    if (!latest || latest.organizationId !== organizationId || latest.campaignDraftId !== campaignDraftId || latest.eventDigest !== campaignHash(eventBody(latest)) || campaignHash(latest.snapshot) !== campaignHash(campaignJson(row))) throw new ConflictException('CAMPAIGN_LIFECYCLE_HISTORY_CHANGED');
    const audit = await tx.auditEvent.findFirst({ where: { action: 'MARKETING_CAMPAIGN_' + latest.action, resource: 'MarketingCampaignLifecycle', resourceId: row.id,
      actorId: latest.actorPersonId, metadata: { path: ['eventDigest'], equals: latest.eventDigest } }, select: { id: true } });
    if (!audit) throw new ConflictException('CAMPAIGN_LIFECYCLE_AUDIT_MISSING');
    return row;
  }
  private guard(row: Row | null, command: Command) {
    if ((row?.revision ?? 0) !== command.expectedRevision || (row?.recordDigest ?? null) !== command.expectedDigest) throw new ConflictException('CAMPAIGN_REVISION_CHANGED');
    if (row && row.revision >= 1_000_000) throw new ConflictException('CAMPAIGN_REVISION_LIMIT');
  }
  private async current(tx: Tx, p: CampaignPlatform, campaign: Awaited<ReturnType<CampaignLifecycleService['draft']>>, row: Row | null, lock = false) {
    const baseReasons: string[] = [];
    if (campaign.status !== 'DRAFT') baseReasons.push('CAMPAIGN_ARCHIVED');
    const currentOwner = campaignOwnerBinding(p);
    let sourceHashes: unknown = null;
    if (!row) baseReasons.push('PREPARATION_REQUIRED');
    else {
      if (row.boundDraftRevision !== campaign.revision || row.boundDraftDigest !== campaign.recordDigest) baseReasons.push('DRAFT_CHANGED');
      if (campaignHash(row.ownerBinding) !== campaignHash(currentOwner)) baseReasons.push('OWNER_AUTHORITY_CHANGED');
      if (row.validFrom.getTime() > Date.now() || row.validUntil.getTime() <= Date.now()) baseReasons.push('SOURCE_EXPIRED');
      try {
        const rights = await campaignSource(tx, p, row.rightsDocumentId, 'RIGHTS', campaign, lock), budget = await campaignSource(tx, p, row.budgetDocumentId, 'BUDGET', campaign, lock);
        const account = await campaignFinanceAccount(tx, p.id, row.financeAccountId, row.budgetCurrency, lock);
        sourceHashes = { rights: rights.hash, budget: budget.hash, financeAccount: { id: account.id, currency: account.currency, active: account.active } };
        if (row.rightsVersion !== rights.version || row.rightsHash !== rights.hash || row.budgetVersion !== budget.version || row.budgetHash !== budget.hash) baseReasons.push('SOURCE_BINDING_CHANGED');
        const terms = campaignBudget(budget.payload);
        if (terms.financeAccountId !== row.financeAccountId || terms.amountMinor !== row.budgetAmountMinor || terms.taxMinor !== row.budgetTaxMinor || terms.currency !== row.budgetCurrency || terms.taxBasis !== row.budgetTaxBasis) baseReasons.push('BUDGET_BINDING_CHANGED');
      } catch (error) { const code = campaignSourceFailure(error); if (!code) throw error; baseReasons.push(code); }
    }
    const decision = row ? campaignObject(row.decision) : null;
    const approved = row?.status === 'APPROVED' && decision?.status === 'APPROVED' && decision.preparationHash === campaignPreparationHash(row)
      && decision.actorAccountId === p.ownerId && decision.actorPersonId === p.ownerPersonId && typeof decision.recordedAt === 'string' && Number.isFinite(Date.parse(decision.recordedAt))
      && Date.parse(decision.recordedAt) <= Date.now();
    if (row?.status === 'APPROVED' && !approved) baseReasons.push('OWNER_DECISION_INTEGRITY');
    const evidence: CampaignEvidence[] = [], evidenceStates: { id: string; kind: string; current: boolean; reasonCodes: string[] }[] = [];
    if (row) {
      if (!Array.isArray(row.evidenceBindings) || row.evidenceBindings.length > 100) throw new ConflictException('CAMPAIGN_EVIDENCE_BINDING_INVALID');
      for (const value of row.evidenceBindings) {
        const bound = campaignObject(value);
        const evidenceId = campaignId(bound.id);
        try {
          const entry = await campaignEvidence(tx, p, evidenceId, campaign, typeof decision?.recordedAt === 'string' ? decision.recordedAt : null, lock);
          if (bound.hash !== entry.hash || bound.revision !== entry.revision || bound.kind !== entry.kind || bound.draftRevision !== row.boundDraftRevision || bound.draftDigest !== row.boundDraftDigest || bound.approvalEventId !== decision?.eventId) throw new ConflictException('CAMPAIGN_EVIDENCE_CHANGED');
          evidence.push(entry); evidenceStates.push({ id: entry.id, kind: entry.kind, current: true, reasonCodes: [] });
        } catch (error) { const code = campaignSourceFailure(error); if (!code) throw error; evidenceStates.push({ id: evidenceId, kind: typeof bound.kind === 'string' ? bound.kind : 'UNKNOWN', current: false, reasonCodes: ['EVIDENCE_NOT_CURRENT'] }); }
      }
    }
    const publicationIds = new Set(evidence.filter(e => e.kind === 'CAMPAIGN_PUBLICATION').map(e => e.id));
    const usable = evidence.filter(e => e.kind !== 'CAMPAIGN_ANALYTICS' || publicationIds.has(e.details.publicationEvidenceId));
    for (const state of evidenceStates) if (state.current && !usable.some(e => e.id === state.id)) { state.current = false; state.reasonCodes = ['PUBLICATION_BINDING_UNAVAILABLE']; }
    const reasonCodes = [...new Set([...baseReasons, ...(!approved ? [row?.status === 'REVOKED' ? 'OWNER_APPROVAL_REVOKED' : row?.status === 'DECLINED' ? 'OWNER_DECLINED' : 'OWNER_DECISION_REQUIRED'] : []), ...(evidenceStates.some(e => !e.current) ? ['EVIDENCE_NOT_CURRENT'] : [])])].sort();
    const canApprove = row?.status === 'PREPARED' && baseReasons.length === 0;
    const hash = campaignHash({ policy: CAMPAIGN_POLICY, campaign: { id: campaign.id, revision: campaign.revision, digest: campaign.recordDigest, status: campaign.status },
      lifecycleDigest: row?.recordDigest ?? null, owner: currentOwner, sourceHashes, reasonCodes, evidence: evidenceStates.map(e => ({ ...e, hash: usable.find(item => item.id === e.id)?.hash ?? null })) });
    return { readiness: { ready: Boolean(approved && reasonCodes.length === 0), canApprove: Boolean(canApprove), scope: 'INTERNAL_PREPARATION', hash, reasonCodes },
      canBindEvidence: Boolean(approved && baseReasons.length === 0), evidence: usable, evidenceStates, decision };
  }
  private async view(tx: Tx, p: CampaignPlatform, campaign: Awaited<ReturnType<CampaignLifecycleService['draft']>>, row: Row | null) {
    const current = await this.current(tx, p, campaign, row);
    const history = row ? await tx.marketingCampaignLifecycleEvent.findMany({ where: { lifecycleId: row.id, organizationId: p.id }, orderBy: { afterRevision: 'desc' }, take: 51,
      select: { id: true, afterRevision: true, action: true, reason: true, eventDigest: true, createdAt: true, actor: { select: { id: true, person: { select: { firstName: true, lastName: true } } } } } }) : [];
    const rights = row ? campaignRights(campaignObject(row.rightsSnapshot).payload) : null, budget = row ? campaignBudget(campaignObject(row.budgetSnapshot).payload) : null;
    const sourceRef = (snapshot: Prisma.JsonValue) => { const x = campaignObject(snapshot); return { id: x.id, version: x.version, referenceNumber: x.referenceNumber, department: campaignObject(x.template).department }; };
    const publications = current.evidence.filter(e => e.kind === 'CAMPAIGN_PUBLICATION').map(e => ({ id: e.id, reference: e.reference, channel: e.details.channel, publicationReference: e.details.publicationReference,
      occurredAt: e.occurredAt, actorAccountId: e.actorAccountId, provenance: e.provenance, providerVerified: false, proof: e.proof, currentPreparation: current.readiness.ready }));
    return { schemaVersion: 1, policy: CAMPAIGN_POLICY, organizationId: p.id, campaign: { id: campaign.id, title: campaign.title, revision: campaign.revision, recordDigest: campaign.recordDigest, channels: campaign.channels, status: campaign.status },
      lifecycle: row ? { id: row.id, revision: row.revision, status: row.status, recordDigest: row.recordDigest, boundDraftRevision: row.boundDraftRevision, boundDraftDigest: row.boundDraftDigest,
        rights: { ...sourceRef(row.rightsSnapshot), hash: row.rightsHash, ...rights }, budget: { ...sourceRef(row.budgetSnapshot), hash: row.budgetHash, ...budget },
        recommendation: row.recommendation, decision: current.decision?.status === 'NOT_REVIEWED' ? null : current.decision, evidenceBindings: row.evidenceBindings, createdAt: row.createdAt, updatedAt: row.updatedAt } : null,
      readiness: current.readiness, publication: { status: publications.length ? 'OWNER_RECORDED' : 'PENDING_CHANNEL', channelConnection: 'NOT_CONNECTED', externalAuthorization: 'REQUESTED_NOT_GRANTED', providerVerified: false, ownerRecordedPublication: publications },
      measurements: campaignMeasurements(current.evidence), evidenceStates: current.evidenceStates,
      spend: { executed: false, amountMinor: null, actualSpendStatus: 'UNAVAILABLE', reason: 'NO_EXECUTION_SOURCE' },
      history: history.slice(0, 50).map(e => ({ id: e.id, revision: e.afterRevision, action: e.action, reason: e.reason, eventDigest: e.eventDigest, createdAt: e.createdAt, actor: { accountId: e.actor.id, name: [e.actor.person.firstName, e.actor.person.lastName].filter(Boolean).join(' ') } })), historyTruncated: history.length > 50,
      capabilities: { prepare: campaign.status === 'DRAFT', decide: row?.status === 'PREPARED', revoke: Boolean(row && row.status !== 'REVOKED'), bindEvidence: current.canBindEvidence, installTemplates: true }, notice: CAMPAIGN_NOTICE };
  }
  async detail(actorId: string, id: string) {
    campaignId(id);
    return this.db.serializable(async tx => { const p = await this.owner(tx, actorId), campaign = await this.draft(tx, p.id, id); return this.view(tx, p, campaign, await this.row(tx, p.id, id)); });
  }
  async sources(actorId: string, id: string) {
    campaignId(id);
    return this.db.serializable(async tx => {
      const p = await this.owner(tx, actorId), campaign = await this.draft(tx, p.id, id), row = await this.row(tx, p.id, id);
      const documents: { rights: any[]; budgets: any[] } = { rights: [], budgets: [] };
      const documentsTruncated: Record<string, boolean> = {};
      for (const kind of ['RIGHTS', 'BUDGET'] as const) {
        const key = kind === 'RIGHTS' ? 'rights' : 'budgets', definition = CAMPAIGN_TEMPLATES[kind === 'RIGHTS' ? 0 : 1];
        const candidates = await tx.managedDocument.findMany({ where: { organizationId: p.id, template: { code: definition.code, organizationId: p.id }, payload: { path: ['campaignDraftId'], equals: id } }, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], take: 51, select: { id: true, version: true, referenceNumber: true, status: true } });
        documentsTruncated[key] = candidates.length > 50;
        for (const item of candidates.slice(0, 50)) {
          try {
            const source = await campaignSource(tx, p, item.id, kind, campaign);
            if (kind === 'BUDGET') { const budget = campaignBudget(source.payload); await campaignFinanceAccount(tx, p.id, budget.financeAccountId, budget.currency); }
            documents[key].push({ ...item, hash: source.hash, title: source.title, eligible: true, reasonCodes: [], summary: source.terms });
          } catch (error) { const code = campaignSourceFailure(error); if (!code) throw error; documents[key].push({ ...item, hash: null, title: definition.titleAr, eligible: false, reasonCodes: [code], summary: null }); }
        }
      }
      const templates = await tx.documentTemplate.findMany({ where: { organizationId: p.id, status: 'ACTIVE', code: { in: CAMPAIGN_TEMPLATES.map(t => t.code) } }, orderBy: [{ code: 'asc' }, { version: 'desc' }], select: { id: true, code: true, titleAr: true, titleEn: true, department: true, fields: true, version: true } });
      const financeAccounts = await tx.financeAccount.findMany({ where: { organizationId: p.id, active: true }, orderBy: [{ name: 'asc' }, { id: 'asc' }], take: 101, select: { id: true, name: true, currency: true } });
      const evidenceRows = await tx.operationalEvidence.findMany({ where: { organizationId: p.id, kind: { in: ['CAMPAIGN_PUBLICATION', 'CAMPAIGN_ANALYTICS'] }, details: { path: ['campaignDraftId'], equals: id } }, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], take: 101, select: { id: true, kind: true, reference: true, revision: true, status: true } });
      const evidence: any[] = [], decision = row ? campaignObject(row.decision) : {};
      for (const item of evidenceRows.slice(0, 100)) {
        try { const e = await campaignEvidence(tx, p, item.id, campaign, typeof decision.recordedAt === 'string' ? decision.recordedAt : null); evidence.push({ ...item, hash: e.hash, eligible: true, reasonCodes: [], details: e.details, provenance: e.provenance, providerVerified: false }); }
        catch (error) { const code = campaignSourceFailure(error); if (!code) throw error; evidence.push({ ...item, hash: null, eligible: false, reasonCodes: [code], details: null, provenance: 'OWNER_RECORDED', providerVerified: false }); }
      }
      return { schemaVersion: 1, campaignBinding: { campaignDraftId: campaign.id, draftRevision: campaign.revision, draftDigest: campaign.recordDigest, channels: campaign.channels },
        templates: templates.map(t => ({ ...t, title: t.titleAr })), documents, documentsTruncated, financeAccounts: financeAccounts.slice(0, 100), financeAccountsTruncated: financeAccounts.length > 100,
        evidence, evidenceTruncated: evidenceRows.length > 100, notice: CAMPAIGN_NOTICE };
    });
  }
  async installTemplates(actorId: string, body: unknown) {
    campaignObject(body, []);
    const ids = CAMPAIGN_TEMPLATES.map(() => ({ id: randomUUID(), auditId: randomUUID() }));
    return this.db.serializable(async tx => {
      const p = await this.lockOwner(tx, actorId);
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${`campaign-lifecycle-templates:${p.id}`},0))`;
      const templates = [];
      for (const [i, definition] of CAMPAIGN_TEMPLATES.entries()) {
        let template = await tx.documentTemplate.findFirst({ where: { organizationId: p.id, code: definition.code, status: 'ACTIVE' }, orderBy: { version: 'desc' } });
        if (template && campaignHash(template.fields) !== campaignHash(definition.fields)) throw new ConflictException('CAMPAIGN_TEMPLATE_SCHEMA_CHANGED');
        if (!template) {
          const previous = await tx.documentTemplate.findFirst({ where: { organizationId: p.id, code: definition.code }, orderBy: { version: 'desc' }, select: { version: true } });
          template = await tx.documentTemplate.create({ data: { id: ids[i].id, organizationId: p.id, code: definition.code, department: definition.department, titleAr: definition.titleAr, titleEn: definition.titleEn, fields: json(definition.fields), version: (previous?.version ?? 0) + 1, printable: true } });
          await tx.auditEvent.create({ data: { id: ids[i].auditId, actorId: p.ownerPersonId, action: 'MARKETING_CAMPAIGN_TEMPLATE_INSTALLED', resource: 'DocumentTemplate', resourceId: template.id, metadata: { actorAccountId: actorId, organizationId: p.id, policy: CAMPAIGN_POLICY, code: template.code, schemaHash: campaignHash(template.fields) } } });
        }
        templates.push({ id: template.id, code: template.code, title: template.titleAr, version: template.version, department: template.department, fields: template.fields });
      }
      return { templates, notice: CAMPAIGN_NOTICE };
    });
  }
  private async persist(tx: Tx, p: CampaignPlatform, old: Row | null, value: Row, command: Command, action: string, reason: string, fingerprint: string, happened: Occurrence) {
    value.recordDigest = campaignRecordHash(value);
    if (old) {
      const { id: _id, organizationId: _org, campaignDraftId: _campaign, createdAt: _created, ...data } = value;
      const claimed = await tx.marketingCampaignLifecycle.updateMany({ where: { id: old.id, organizationId: p.id, revision: old.revision, recordDigest: old.recordDigest }, data: data as Prisma.MarketingCampaignLifecycleUncheckedUpdateManyInput });
      if (claimed.count !== 1) throw new ConflictException('CAMPAIGN_REVISION_CHANGED');
    } else await tx.marketingCampaignLifecycle.create({ data: value as Prisma.MarketingCampaignLifecycleUncheckedCreateInput });
    const previous = old ? await tx.marketingCampaignLifecycleEvent.findUniqueOrThrow({ where: { lifecycleId_afterRevision: { lifecycleId: old.id, afterRevision: old.revision } } }) : null;
    const body = { id: happened.eventId, organizationId: p.id, lifecycleId: value.id, campaignDraftId: value.campaignDraftId, requestId: command.requestId, requestFingerprint: fingerprint,
      actorAccountId: p.ownerId, actorPersonId: p.ownerPersonId, action, afterRevision: value.revision, reason, previousDigest: previous?.eventDigest ?? null, snapshot: json(value), createdAt: happened.at };
    const eventDigest = campaignHash(body);
    await tx.marketingCampaignLifecycleEvent.create({ data: { ...body, eventDigest } });
    await tx.auditEvent.create({ data: { id: happened.auditId, actorId: p.ownerPersonId, action: 'MARKETING_CAMPAIGN_' + action, resource: 'MarketingCampaignLifecycle', resourceId: value.id,
      metadata: { policy: CAMPAIGN_POLICY, organizationId: p.id, campaignDraftId: value.campaignDraftId, actorAccountId: p.ownerId, revision: value.revision, eventId: happened.eventId, eventDigest,
        publicationExecuted: false, financialActionExecuted: false, providerVerified: false } } });
    return value;
  }
  private async mutate(actorId: string, id: string, body: unknown, action: 'PREPARE' | 'DECISION' | 'REVOKE' | 'BIND_EVIDENCE') {
    campaignId(id);
    const command = action === 'PREPARE' ? campaignPrepare(body) : action === 'DECISION' ? campaignDecision(body) : action === 'REVOKE' ? campaignRevoke(body) : campaignEvidenceCommand(body);
    const happened: Occurrence = { id: randomUUID(), eventId: randomUUID(), auditId: randomUUID(), at: new Date() };
    const fingerprint = campaignHash({ policy: CAMPAIGN_POLICY, campaignId: id, actorId, action, input: body });
    try { return await this.db.serializable(async tx => {
      const p = await this.lockOwner(tx, actorId), campaign = await this.draft(tx, p.id, id, true), old = await this.row(tx, p.id, id);
      const replay = await tx.marketingCampaignLifecycleEvent.findUnique({ where: { organizationId_requestId: { organizationId: p.id, requestId: command.requestId } } });
      if (replay) {
        if (replay.requestFingerprint !== fingerprint || replay.campaignDraftId !== id || replay.actorAccountId !== actorId || replay.eventDigest !== campaignHash(eventBody(replay))) throw new ConflictException('CAMPAIGN_REQUEST_CONFLICT');
        return { ...await this.view(tx, p, campaign, old), replayed: true };
      }
      this.guard(old, command);
      let value: Row, eventAction: string = action, reason: string;
      if (action === 'PREPARE') {
        const input = command as ReturnType<typeof campaignPrepare>;
        if (campaign.status !== 'DRAFT' || campaign.revision !== input.expectedDraftRevision || campaign.recordDigest !== input.expectedDraftDigest) throw new ConflictException('CAMPAIGN_DRAFT_CHANGED');
        const rights = await campaignSource(tx, p, input.rightsDocument.id, 'RIGHTS', campaign, true), budget = await campaignSource(tx, p, input.budgetDocument.id, 'BUDGET', campaign, true);
        if (rights.version !== input.rightsDocument.version || rights.hash !== input.rightsDocument.hash || budget.version !== input.budgetDocument.version || budget.hash !== input.budgetDocument.hash) throw new ConflictException('CAMPAIGN_SOURCE_CHANGED');
        const terms = campaignBudget(budget.payload), rightsTerms = campaignRights(rights.payload);
        await campaignFinanceAccount(tx, p.id, terms.financeAccountId, terms.currency, true);
        const validFrom = new Date(Math.max(Date.parse(rightsTerms.validFrom), Date.parse(terms.validFrom))), validUntil = new Date(Math.min(Date.parse(rightsTerms.validUntil), Date.parse(terms.validUntil)));
        if (validUntil <= validFrom) throw new ConflictException('CAMPAIGN_VALIDITY_MISMATCH');
        value = { id: old?.id ?? happened.id, organizationId: p.id, campaignDraftId: id, revision: (old?.revision ?? 0) + 1, status: 'PREPARED', boundDraftRevision: campaign.revision, boundDraftDigest: campaign.recordDigest,
          rightsDocumentId: rights.id, rightsVersion: rights.version, rightsHash: rights.hash, rightsSnapshot: json(rights.snapshot) as Prisma.JsonValue,
          budgetDocumentId: budget.id, budgetVersion: budget.version, budgetHash: budget.hash, budgetSnapshot: json(budget.snapshot) as Prisma.JsonValue,
          financeAccountId: terms.financeAccountId, budgetAmountMinor: terms.amountMinor, budgetTaxMinor: terms.taxMinor, budgetCurrency: terms.currency, budgetTaxBasis: terms.taxBasis,
          validFrom, validUntil, recommendation: input.recommendation, ownerBinding: campaignOwnerBinding(p), decision: { status: 'NOT_REVIEWED' }, evidenceBindings: [], recordDigest: '', createdAt: old?.createdAt ?? happened.at, updatedAt: happened.at };
        reason = input.recommendation;
      } else {
        if (!old) throw new ConflictException('CAMPAIGN_PREPARATION_REQUIRED');
        value = { ...old, revision: old.revision + 1, updatedAt: happened.at };
        if (action === 'DECISION') {
          const input = command as ReturnType<typeof campaignDecision>, current = await this.current(tx, p, campaign, old, true);
          if (old.status !== 'PREPARED' || current.readiness.hash !== input.expectedReadinessHash || input.decision === 'APPROVE' && !current.readiness.canApprove) throw new ConflictException('CAMPAIGN_READINESS_CHANGED');
          eventAction = input.decision; value.status = input.decision === 'APPROVE' ? 'APPROVED' : 'DECLINED';
          value.decision = { status: value.status, actorAccountId: actorId, actorPersonId: p.ownerPersonId, recordedAt: happened.at.toISOString(), eventId: happened.eventId, preparationHash: campaignPreparationHash(old), readinessHash: input.expectedReadinessHash, note: input.note };
          reason = input.note;
        } else if (action === 'REVOKE') {
          const input = command as ReturnType<typeof campaignRevoke>;
          if (old.status === 'REVOKED') throw new ConflictException('CAMPAIGN_ALREADY_REVOKED');
          value.status = 'REVOKED'; reason = input.reason;
        } else {
          const input = command as ReturnType<typeof campaignEvidenceCommand>, current = await this.current(tx, p, campaign, old, true);
          if (!current.canBindEvidence || typeof current.decision?.recordedAt !== 'string') throw new ConflictException('CAMPAIGN_CURRENT_OWNER_APPROVAL_REQUIRED');
          const entries: CampaignEvidence[] = [];
          for (const evidenceId of input.evidenceIds) entries.push(await campaignEvidence(tx, p, evidenceId, campaign, current.decision.recordedAt, true));
          if (entries.some(e => e.kind === 'CAMPAIGN_ANALYTICS' && !entries.some(publication => publication.id === e.details.publicationEvidenceId && publication.kind === 'CAMPAIGN_PUBLICATION'))) throw new ConflictException('CAMPAIGN_PUBLICATION_BINDING_REQUIRED');
          value.evidenceBindings = entries.map(e => ({ id: e.id, kind: e.kind, revision: e.revision, hash: e.hash, draftRevision: old.boundDraftRevision, draftDigest: old.boundDraftDigest, approvalEventId: current.decision!.eventId as string }));
          reason = input.reason;
        }
      }
      const saved = await this.persist(tx, p, old, value, command, eventAction, reason, fingerprint, happened);
      return { ...await this.view(tx, p, campaign, saved), replayed: false };
    }); } catch (error) {
      const databaseCode = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
      const sqlState = error && typeof error === 'object' && 'meta' in error && error.meta && typeof error.meta === 'object' && 'code' in error.meta ? String(error.meta.code) : '';
      if (['P2002', 'P2034'].includes(databaseCode) || databaseCode === 'P2010' && ['40001', '40P01'].includes(sqlState)) {
        // A transaction waiting on the first-create lock can retain an earlier
        // SERIALIZABLE snapshot and lose at a unique index. Recover only an
        // already committed identical request in a new, authorized snapshot;
        // never rerun a mutation or turn an unrelated conflict into approval.
        return this.db.serializable(async tx => {
          const p = await this.owner(tx, actorId);
          const replay = await tx.marketingCampaignLifecycleEvent.findUnique({ where: { organizationId_requestId: { organizationId: p.id, requestId: command.requestId } } });
          if (!replay || replay.requestFingerprint !== fingerprint || replay.campaignDraftId !== id || replay.actorAccountId !== actorId || replay.eventDigest !== campaignHash(eventBody(replay))) throw new ConflictException('CAMPAIGN_CONCURRENT_CHANGE');
          const campaign = await this.draft(tx, p.id, id), saved = await this.row(tx, p.id, id);
          if (!saved || saved.id !== replay.lifecycleId) throw new ConflictException('CAMPAIGN_CONCURRENT_CHANGE');
          return { ...await this.view(tx, p, campaign, saved), replayed: true };
        });
      }
      throw error;
    }
  }
  prepare(actorId: string, id: string, body: unknown) { return this.mutate(actorId, id, body, 'PREPARE'); }
  decide(actorId: string, id: string, body: unknown) { return this.mutate(actorId, id, body, 'DECISION'); }
  revoke(actorId: string, id: string, body: unknown) { return this.mutate(actorId, id, body, 'REVOKE'); }
  bindEvidence(actorId: string, id: string, body: unknown) { return this.mutate(actorId, id, body, 'BIND_EVIDENCE'); }
}
