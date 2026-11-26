import { ConflictException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProcurementLabEvent } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { postingTransaction } from '../finance/posting/ledger-proof';
import { digestValue, hash, id, integer, json, object, purchaseLines } from '../organizations/procurement.domain';
import { lockProcurementLabOwner, requireProcurementLabOwner } from './procurement-lab-access';
import {
  applyLabAction, boundedLabObject, createLabState, LAB_ACTION_ROLES, LAB_DEFAULT_LINES, LAB_LIMITS, LAB_ROLES, LAB_SCENARIO,
  LabAction, labActions, labProjection, LabRole, LabState,
} from './procurement-lab.domain';

type Session = Prisma.ProcurementLabSessionGetPayload<{ include: { events: true } }>;
type EventDraft = Omit<ProcurementLabEvent, 'resultDigest' | 'evidenceHash'>;
type Command = { eventId: string; requestId: string; replayed: boolean; resultRevision: number; resultDigest: string };
const asJson = (value: unknown) => json(value) as Prisma.InputJsonValue;
const createFingerprint = (requestId: string, lines: unknown) => hash({ operation: 'CREATE', requestId, scenario: LAB_SCENARIO, lines });
const actionFingerprint = (requestId: string, sessionId: string, beforeRevision: number, previousDigest: string, action: string, role: string, payload: unknown) =>
  hash({ operation: 'ACT', requestId, sessionId, expectedRevision: beforeRevision, expectedDigest: previousDigest, action, role, payload });

function eventProof(event: EventDraft, state: LabState) {
  const stateHash = hash({ sessionId: event.sessionId, ownerAccountId: event.ownerAccountId, revision: event.afterRevision, state });
  const evidenceHash = hash({ id: event.id, ownerAccountId: event.ownerAccountId, sessionId: event.sessionId, requestId: event.requestId,
    action: event.action, role: event.role, requestFingerprint: event.requestFingerprint, beforeRevision: event.beforeRevision,
    afterRevision: event.afterRevision, previousDigest: event.previousDigest, payload: event.payload, stateHash, createdAt: event.createdAt.toISOString() });
  return { evidenceHash, resultDigest: hash({ stateHash, evidenceHash }) };
}

@Injectable()
export class ProcurementLabService {
  constructor(private readonly db: DatabaseService) {}

  private async lock(tx: Prisma.TransactionClient, actorId: string) {
    await lockProcurementLabOwner(tx, actorId);
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`procurement-lab-owner:${actorId}`},0))`;
  }

  private async load(tx: Prisma.TransactionClient, ownerAccountId: string, sessionId: string): Promise<Session> {
    const session = await tx.procurementLabSession.findFirst({ where: { id: sessionId, ownerAccountId },
      include: { events: { orderBy: { afterRevision: 'asc' }, take: LAB_LIMITS.maxEvents + 1 } } });
    if (!session) throw new NotFoundException('The simulation session was not found for its owner.');
    return session;
  }

  /** Rebuild from bounded immutable occurrences rather than trusting a stored
   * status or balance. This is a simulation history, never a real signature. */
  private verifiedState(session: Session): LabState {
    const mismatch = () => { throw new ConflictException('The retained simulation no longer matches its recorded evidence.'); };
    try {
      if (session.scenario !== LAB_SCENARIO || session.revision < 1 || session.revision > LAB_LIMITS.maxEvents || session.events.length !== session.revision) mismatch();
      let state: LabState | null = null, previousDigest: string | null = null, previousTime = 0;
      for (let index = 0; index < session.events.length; index += 1) {
        const event = session.events[index], at = event.createdAt.toISOString();
        if (event.ownerAccountId !== session.ownerAccountId || event.sessionId !== session.id || event.beforeRevision !== index || event.afterRevision !== index + 1
          || event.previousDigest !== previousDigest || event.createdAt.getTime() < previousTime) mismatch();
        const payload = boundedLabObject(event.payload);
        if (index === 0) {
          object(payload, ['scenario', 'lines']);
          if (event.action !== 'CREATE' || event.role !== 'MAKER' || payload.scenario !== LAB_SCENARIO) mismatch();
          const lines = purchaseLines(payload.lines);
          if (event.requestFingerprint !== createFingerprint(event.requestId, lines)) mismatch();
          state = createLabState(session.id, at, lines);
        } else {
          if (!state || !previousDigest || !Object.prototype.hasOwnProperty.call(LAB_ACTION_ROLES, event.action)
            || !LAB_ROLES.some(role => role.id === event.role)) mismatch();
          if (event.requestFingerprint !== actionFingerprint(event.requestId, session.id, event.beforeRevision, previousDigest!, event.action, event.role, payload)) mismatch();
          state = applyLabAction(state!, event.action as LabAction, event.role as LabRole, payload, { eventId: event.id, occurredAt: at });
        }
        const proof = eventProof(event, state!);
        if (event.evidenceHash !== proof.evidenceHash || event.resultDigest !== proof.resultDigest) mismatch();
        previousDigest = proof.resultDigest; previousTime = event.createdAt.getTime();
      }
      if (!state || session.digest !== previousDigest || session.status !== state.status || session.amountMinor !== state.amountMinor
        || hash(session.state) !== hash(state) || session.createdAt.getTime() !== session.events[0].createdAt.getTime()
        || session.updatedAt.getTime() !== session.events[session.events.length - 1].createdAt.getTime()) mismatch();
      return state!;
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() >= 400 && error.getStatus() < 500) return mismatch();
      throw error;
    }
  }

  private view(session: Session, command?: Command) {
    const state = this.verifiedState(session);
    return { id: session.id, scenario: LAB_SCENARIO, synthetic: true, scope: 'PROCUREMENT_LAB', revision: session.revision, digest: session.digest,
      ...labProjection(state), roles: LAB_ROLES, actions: labActions(state, session.revision >= LAB_LIMITS.maxEvents), limits: LAB_LIMITS,
      events: session.events.map(event => ({ id: event.id, revision: event.afterRevision, action: event.action, role: event.role, occurredAt: event.createdAt.toISOString(), digest: event.resultDigest })),
      realRepresentativeAcceptance: false, realFinancialEffects: false, externalTraffic: false,
      createdAt: session.createdAt.toISOString(), updatedAt: session.updatedAt.toISOString(), ...(command ? { command } : {}) };
  }

  private async replay(tx: Prisma.TransactionClient, actorId: string, requestId: string, fingerprint: string) {
    const event = await tx.procurementLabEvent.findUnique({ where: { ownerAccountId_requestId: { ownerAccountId: actorId, requestId } } });
    if (!event) return null;
    if (event.requestFingerprint !== fingerprint) throw new ConflictException('This simulation request identifier was already used for different content.');
    return this.view(await this.load(tx, actorId, event.sessionId), { eventId: event.id, requestId, replayed: true, resultRevision: event.afterRevision, resultDigest: event.resultDigest });
  }

  async workspace(actorId: string) {
    return this.db.serializable(async tx => {
      await requireProcurementLabOwner(tx, actorId);
      const sessions = await tx.procurementLabSession.findMany({ where: { ownerAccountId: actorId }, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        take: LAB_LIMITS.maxSessions + 1, include: { events: { orderBy: { afterRevision: 'asc' }, take: LAB_LIMITS.maxEvents + 1 } } });
      if (sessions.length > LAB_LIMITS.maxSessions) throw new ConflictException('The retained simulation workspace exceeds its bounded session count.');
      return { synthetic: true, scope: 'PROCUREMENT_LAB', sessions: sessions.map(session => {
        this.verifiedState(session);
        return { id: session.id, scenario: session.scenario, status: session.status, revision: session.revision, digest: session.digest,
          amountMinor: session.amountMinor, currency: 'SAR', createdAt: session.createdAt.toISOString(), updatedAt: session.updatedAt.toISOString() };
      }), capabilities: { create: { allowed: sessions.length < LAB_LIMITS.maxSessions, reason: sessions.length < LAB_LIMITS.maxSessions ? null : 'This owner reached the retained simulation session limit.' } }, limits: LAB_LIMITS };
    });
  }

  async detail(actorId: string, sessionId: string) {
    const requestedId = id(sessionId, 'Simulation session identifier');
    return this.db.serializable(async tx => {
      await requireProcurementLabOwner(tx, actorId);
      return this.view(await this.load(tx, actorId, requestedId));
    });
  }

  async create(actorId: string, value: unknown) {
    const body = boundedLabObject(value, ['requestId', 'scenario', 'lines']), requestId = id(body.requestId, 'Simulation request identifier');
    if (body.scenario !== LAB_SCENARIO) throw new ConflictException('Select the supported STANDARD_V1 simulation scenario.');
    const lines = purchaseLines(body.lines ?? json(LAB_DEFAULT_LINES)), fingerprint = createFingerprint(requestId, lines);
    // Caller-owned occurrence identity and time remain stable through retries.
    const sessionId = randomUUID(), eventId = randomUUID(), occurredAt = new Date();
    const state = createLabState(sessionId, occurredAt.toISOString(), lines);
    const event: EventDraft = { id: eventId, ownerAccountId: actorId, sessionId, requestId, action: 'CREATE', role: 'MAKER',
      requestFingerprint: fingerprint, beforeRevision: 0, afterRevision: 1, previousDigest: null,
      payload: asJson({ scenario: LAB_SCENARIO, lines }) as Prisma.JsonValue, createdAt: occurredAt };
    const proof = eventProof(event, state);
    return postingTransaction(this.db, async tx => {
      await this.lock(tx, actorId);
      const replay = await this.replay(tx, actorId, requestId, fingerprint); if (replay) return replay;
      if (await tx.procurementLabSession.count({ where: { ownerAccountId: actorId } }) >= LAB_LIMITS.maxSessions) throw new ConflictException('This owner reached the retained simulation session limit.');
      await tx.procurementLabSession.create({ data: { id: sessionId, ownerAccountId: actorId, scenario: LAB_SCENARIO, status: state.status,
        revision: 1, digest: proof.resultDigest, amountMinor: state.amountMinor, state: asJson(state), createdAt: occurredAt, updatedAt: occurredAt } });
      await tx.procurementLabEvent.create({ data: { ...event, ...proof, payload: asJson(event.payload) } });
      return this.view(await this.load(tx, actorId, sessionId), { eventId, requestId, replayed: false, resultRevision: 1, resultDigest: proof.resultDigest });
    });
  }

  async act(actorId: string, sessionId: string, value: unknown) {
    const requestedId = id(sessionId, 'Simulation session identifier');
    const body = boundedLabObject(value, ['requestId', 'expectedRevision', 'expectedDigest', 'action', 'role', 'payload']);
    const requestId = id(body.requestId, 'Simulation request identifier'), expectedRevision = integer(body.expectedRevision, 'Simulation revision', 1), expectedDigest = digestValue(body.expectedDigest);
    if (typeof body.action !== 'string' || !Object.prototype.hasOwnProperty.call(LAB_ACTION_ROLES, body.action)
      || typeof body.role !== 'string' || !LAB_ROLES.some(role => role.id === body.role)) throw new ConflictException('Select a supported simulation action and role.');
    const action = body.action as LabAction, role = body.role as LabRole, payload = boundedLabObject(body.payload ?? {});
    const fingerprint = actionFingerprint(requestId, requestedId, expectedRevision, expectedDigest, action, role, payload);
    const eventId = randomUUID(), occurredAt = new Date();
    return postingTransaction(this.db, async tx => {
      await this.lock(tx, actorId);
      const replay = await this.replay(tx, actorId, requestId, fingerprint); if (replay) return replay;
      const session = await this.load(tx, actorId, requestedId), previous = this.verifiedState(session);
      if (session.revision !== expectedRevision || session.digest !== expectedDigest) throw new ConflictException('The simulation changed. Reload its current revision and evidence digest.');
      if (session.revision >= LAB_LIMITS.maxEvents) throw new ConflictException('This simulation reached its event limit. Start a new session.');
      if (occurredAt < session.updatedAt) throw new ConflictException('The simulation clock moved backwards. Retry with a new request identifier.');
      const state = applyLabAction(previous, action, role, payload, { eventId, occurredAt: occurredAt.toISOString() });
      const event: EventDraft = { id: eventId, ownerAccountId: actorId, sessionId: requestedId, requestId, action, role,
        requestFingerprint: fingerprint, beforeRevision: session.revision, afterRevision: session.revision + 1, previousDigest: session.digest,
        payload: asJson(payload) as Prisma.JsonValue, createdAt: occurredAt };
      const proof = eventProof(event, state);
      await tx.procurementLabSession.update({ where: { id: requestedId }, data: { status: state.status, revision: event.afterRevision,
        digest: proof.resultDigest, state: asJson(state), updatedAt: occurredAt } });
      await tx.procurementLabEvent.create({ data: { ...event, ...proof, payload: asJson(event.payload) } });
      return this.view(await this.load(tx, actorId, requestedId), { eventId, requestId, replayed: false, resultRevision: event.afterRevision, resultDigest: proof.resultDigest });
    });
  }
}
