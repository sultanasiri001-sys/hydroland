import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { postingTransaction } from '../finance/posting/ledger-proof';
import { digestValue, hash, id, integer, json, object } from '../organizations/procurement.domain';
import { lockProcurementLabOwner, requireProcurementLabOwner } from './procurement-lab-access';
import { procurementExchangeContract, PROCUREMENT_EXCHANGE_PROTOCOL, validateExchangeMessage } from './procurement-api-contract';
import { checkProcurementConnection, ConnectionCheckResult, ProcurementApiSettings, procurementApiSettings, procurementConnectionBinding, procurementCredentialOptions } from './procurement-api-transport';

type Profile = { id: string; ownerAccountId: string; revision: number; configHash: string; settings: Prisma.JsonValue; history: Prisma.JsonValue; lastCheck: Prisma.JsonValue | null; createdAt: Date; updatedAt: Date };
type HistoryEvent = { eventId: string; requestId: string; kind: 'SAVE' | 'CHECK_REQUESTED' | 'CHECK_FINISHED'; fingerprint: string; revision: number; configHash: string; occurredAt: string; previousHash: string | null; evidenceHash: string; details: Record<string, unknown> };
const initial = (): ProcurementApiSettings => ({ displayName: 'HYDROLAND procurement API', protocol: PROCUREMENT_EXCHANGE_PROTOCOL, endpoint: null, credentialRef: null, authMode: 'BEARER' });
const configurationHash = (ownerAccountId: string, revision: number, settings: ProcurementApiSettings) => hash({ schemaVersion: 1, ownerAccountId, revision, settings });
const eventHash = (event: Omit<HistoryEvent, 'evidenceHash'>) => hash(event);
const asJson = (value: unknown) => json(value) as Prisma.InputJsonValue;
const plain = (value: unknown) => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
const completed = (history: HistoryEvent[], requestId: string) => history.find(event => event.requestId === requestId && event.kind === 'CHECK_FINISHED');
const pending = (history: HistoryEvent[]) => history.filter(event => event.kind === 'CHECK_REQUESTED' && !completed(history, event.requestId));

@Injectable()
export class ProcurementApiService {
  constructor(private readonly db: DatabaseService) {}

  private async lock(tx: Prisma.TransactionClient, actorId: string) {
    await lockProcurementLabOwner(tx, actorId);
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'F08_API_PROFILE:' + actorId}, 0))::text`;
  }

  private history(profile: Profile): HistoryEvent[] {
    if (!Array.isArray(profile.history) || profile.history.length < 1 || profile.history.length > 100) throw new ConflictException('The connection preparation history requires review.');
    const settings = procurementApiSettings(profile.settings), history = profile.history as unknown as HistoryEvent[];
    let previousHash: string | null = null; let saves = 0;
    const events = new Set<string>(); const requests = new Map<string, HistoryEvent>();
    for (const event of history) {
      if (!event || typeof event !== 'object') throw new ConflictException('The connection preparation history is inconsistent.');
      const { evidenceHash, ...source } = event;
      if (!event || !['SAVE', 'CHECK_REQUESTED', 'CHECK_FINISHED'].includes(event.kind) || events.has(event.eventId) || event.previousHash !== previousHash || eventHash(source) !== evidenceHash) throw new ConflictException('The connection preparation history is inconsistent.');
      events.add(event.eventId);
      if (event.kind === 'SAVE') {
        saves++;
        const saved = procurementApiSettings(event.details.settings);
        if (event.revision !== saves || event.configHash !== configurationHash(profile.ownerAccountId, saves, saved)) throw new ConflictException('The saved connection revision is inconsistent.');
      }
      if (event.kind !== 'CHECK_FINISHED') {
        if (requests.has(event.requestId)) throw new ConflictException('The connection request history contains a duplicate.');
        requests.set(event.requestId, event);
      } else {
        const start = requests.get(event.requestId);
        if (!start || start.kind !== 'CHECK_REQUESTED' || start.fingerprint !== event.fingerprint || start.configHash !== event.configHash || history.filter(item => item.requestId === event.requestId && item.kind === 'CHECK_FINISHED').length !== 1) throw new ConflictException('The connection check does not bind its original request.');
      }
      previousHash = evidenceHash;
    }
    if (profile.revision !== saves || profile.configHash !== configurationHash(profile.ownerAccountId, profile.revision, settings)) throw new ConflictException('The connection settings changed outside their recorded revision.');
    const latestSave = [...history].reverse().find(event => event.kind === 'SAVE');
    if (!latestSave || hash(latestSave.details.settings) !== hash(settings)) throw new ConflictException('The connection settings do not match their original save.');
    const latestCheck = [...history].reverse().find(event => event.kind === 'CHECK_FINISHED');
    if (hash(profile.lastCheck) !== hash(latestCheck?.details ?? null)) throw new ConflictException('The connection check projection changed outside its recorded result.');
    return history;
  }

  private append(history: HistoryEvent[], input: Omit<HistoryEvent, 'previousHash' | 'evidenceHash'>) {
    const source = { ...input, previousHash: history.at(-1)?.evidenceHash ?? null };
    return [...history, { ...source, evidenceHash: eventHash(source) }];
  }

  private room(history: HistoryEvent[], additional: number) {
    if (history.length + pending(history).length + additional > 100) throw new ConflictException('The connection preparation history is full. Preserve its evidence before preparing a new profile.');
  }

  private view(profile: Profile | null, command?: Record<string, unknown>) {
    const settings = profile ? procurementApiSettings(profile.settings) : initial();
    if (profile) this.history(profile);
    const binding = procurementConnectionBinding(settings);
    const last = plain(profile?.lastCheck);
    const lastCheck = last ? { status: last.status, code: last.code, checkedAt: last.checkedAt, configHash: last.configHash, externalRequestAttempted: last.externalRequestAttempted } : null;
    const fresh = Boolean(last && last.status === 'SUCCEEDED' && last.configHash === profile?.configHash && last.bindingHash === binding.digest
      && typeof last.checkedAt === 'string' && Date.now() - Date.parse(last.checkedAt) >= 0 && Date.now() - Date.parse(last.checkedAt) < 15 * 60_000);
    return { ...settings, revision: profile?.revision ?? 0, configHash: profile?.configHash ?? null,
      credentialOptions: procurementCredentialOptions(), state: fresh ? 'CONNECTION_VERIFIED' : binding.missing.length ? 'NOT_CONFIGURED' : 'CONFIGURED',
      missing: binding.missing, lastCheck, connectionCheckCurrent: fresh, checkValiditySeconds: 900,
      businessExchangeEnabled: false, requiresRealOrganizationForInternalTest: false, ...(command ? { command } : {}) };
  }

  async get(actorId: string) {
    return postingTransaction(this.db, async tx => {
      await requireProcurementLabOwner(tx, actorId);
      return this.view(await tx.procurementApiProfile.findUnique({ where: { ownerAccountId: actorId } }));
    });
  }

  async contract(actorId: string) {
    await postingTransaction(this.db, tx => requireProcurementLabOwner(tx, actorId));
    return procurementExchangeContract();
  }

  async validate(actorId: string, body: unknown) {
    const input = object(body, ['message']);
    await postingTransaction(this.db, tx => requireProcurementLabOwner(tx, actorId));
    return validateExchangeMessage(input.message);
  }

  async save(actorId: string, body: unknown) {
    const input = object(body, ['requestId', 'expectedRevision', 'displayName', 'protocol', 'endpoint', 'credentialRef', 'authMode']);
    const requestId = id(input.requestId, 'Request identifier'), expectedRevision = integer(input.expectedRevision, 'Expected configuration revision');
    const settings = procurementApiSettings({ displayName: input.displayName, protocol: input.protocol, endpoint: input.endpoint, credentialRef: input.credentialRef, authMode: input.authMode });
    if (settings.credentialRef && !procurementCredentialOptions().some(option => option.ref === settings.credentialRef)) throw new BadRequestException('Select a registered server credential reference. Credential values cannot be submitted here.');
    const fingerprint = hash({ actorId, requestId, expectedRevision, settings, action: 'SAVE' });
    const profileId = randomUUID(), eventId = randomUUID(), at = new Date();
    return postingTransaction(this.db, async tx => {
      await this.lock(tx, actorId);
      const current = await tx.procurementApiProfile.findUnique({ where: { ownerAccountId: actorId } });
      const history = current ? this.history(current) : [];
      const replay = history.find(event => event.requestId === requestId && event.kind !== 'CHECK_FINISHED');
      if (replay) {
        if (replay.kind !== 'SAVE' || replay.fingerprint !== fingerprint) throw new ConflictException('The request identifier is already bound to different connection settings.');
        return this.view(current, { requestId, replayed: true, resultRevision: replay.revision });
      }
      if ((current?.revision ?? 0) !== expectedRevision) throw new ConflictException('Connection settings changed. Reload the current revision.');
      this.room(history, 1);
      const revision = expectedRevision + 1, configHash = configurationHash(actorId, revision, settings);
      const nextHistory = this.append(history, { eventId, requestId, kind: 'SAVE', fingerprint, revision, configHash, occurredAt: at.toISOString(), details: { settings } });
      const data = { revision, configHash, settings: asJson(settings), history: asJson(nextHistory) };
      const saved = current ? await tx.procurementApiProfile.update({ where: { id: current.id }, data })
        : await tx.procurementApiProfile.create({ data: { id: profileId, ownerAccountId: actorId, ...data, createdAt: at } });
      return this.view(saved, { requestId, replayed: false, resultRevision: revision });
    });
  }

  private checkDetails(start: HistoryEvent, result: ConnectionCheckResult) {
    return { ...result, configHash: start.configHash, bindingHash: digestValue(start.details.bindingHash) };
  }

  async check(actorId: string, body: unknown) {
    const input = object(body, ['requestId', 'expectedRevision', 'expectedConfigHash']);
    const requestId = id(input.requestId, 'Request identifier'), revision = integer(input.expectedRevision, 'Expected configuration revision', 1), configHash = digestValue(input.expectedConfigHash);
    const fingerprint = hash({ actorId, requestId, revision, configHash, action: 'CHECK' });
    const startId = randomUUID(), finishId = randomUUID(), interruptedId = randomUUID();
    const prepare = await postingTransaction(this.db, async tx => {
      await this.lock(tx, actorId);
      // Start the lease after acquiring the lock, including on a transaction retry.
      // Time spent waiting for a prior command must not age a new network check.
      const startedAt = new Date();
      const profile = await tx.procurementApiProfile.findUnique({ where: { ownerAccountId: actorId } });
      if (!profile) throw new ConflictException('Save the API connection settings before checking them.');
      let history = this.history(profile);
      const replay = history.find(event => event.requestId === requestId && event.kind !== 'CHECK_FINISHED');
      if (replay && (replay.kind !== 'CHECK_REQUESTED' || replay.fingerprint !== fingerprint)) throw new ConflictException('The request identifier is already bound to a different operation.');
      if (replay && completed(history, requestId)) return { replay: this.view(profile, { requestId, replayed: true }), settings: null, start: null };
      const active = pending(history)[0];
      if (active) {
        if (Date.now() - Date.parse(active.occurredAt) < 20_000) throw new ConflictException('A connection check is still running. Reload before retrying.');
        const result: ConnectionCheckResult = { status: 'FAILED', code: 'CHECK_INTERRUPTED', checkedAt: startedAt.toISOString(), externalRequestAttempted: null };
        const details = this.checkDetails(active, result);
        history = this.append(history, { eventId: interruptedId, requestId: active.requestId, kind: 'CHECK_FINISHED', fingerprint: active.fingerprint, revision: active.revision, configHash: active.configHash, occurredAt: startedAt.toISOString(), details });
        const interrupted = await tx.procurementApiProfile.update({ where: { id: profile.id }, data: { history: asJson(history), lastCheck: asJson(details) } });
        if (replay) return { replay: this.view(interrupted, { requestId, replayed: true }), settings: null, start: null };
      }
      if (profile.revision !== revision || profile.configHash !== configHash) throw new ConflictException('Connection settings changed. Reload before checking.');
      const settings = procurementApiSettings(profile.settings), binding = procurementConnectionBinding(settings);
      if (binding.missing.length) throw new BadRequestException('Complete the endpoint and its registered server credential before checking this connection.');
      this.room(history, 2);
      const start = { eventId: startId, requestId, kind: 'CHECK_REQUESTED' as const, fingerprint, revision, configHash, occurredAt: startedAt.toISOString(), details: { bindingHash: binding.digest } };
      const nextHistory = this.append(history, start);
      await tx.procurementApiProfile.update({ where: { id: profile.id }, data: { history: asJson(nextHistory) } });
      return { replay: null, settings, start: nextHistory.at(-1)! };
    });
    if (prepare.replay) return prepare.replay;
    if (!prepare.settings || !prepare.start) throw new ConflictException('The connection check was not prepared.');
    // No network call is inside a transaction or automatic transaction retry.
    const result = await checkProcurementConnection(prepare.settings);
    const finishedAt = new Date();
    return postingTransaction(this.db, async tx => {
      await this.lock(tx, actorId);
      const profile = await tx.procurementApiProfile.findUnique({ where: { ownerAccountId: actorId } });
      if (!profile) throw new ConflictException('The connection profile is unavailable.');
      const history = this.history(profile), start = history.find(event => event.requestId === requestId && event.kind === 'CHECK_REQUESTED');
      if (!start || start.fingerprint !== fingerprint) throw new ConflictException('The original connection request is unavailable.');
      if (completed(history, requestId)) return this.view(profile, { requestId, replayed: true });
      let outcome = result;
      if (profile.revision !== revision || profile.configHash !== configHash) outcome = { ...result, status: 'FAILED', code: 'CONFIGURATION_CHANGED' };
      else if (procurementConnectionBinding(procurementApiSettings(profile.settings)).digest !== start.details.bindingHash) outcome = { ...result, status: 'FAILED', code: 'CREDENTIAL_CONFIGURATION_CHANGED' };
      const details = this.checkDetails(start, outcome);
      const nextHistory = this.append(history, { eventId: finishId, requestId, kind: 'CHECK_FINISHED', fingerprint, revision, configHash, occurredAt: finishedAt.toISOString(), details });
      const saved = await tx.procurementApiProfile.update({ where: { id: profile.id }, data: { history: asJson(nextHistory), lastCheck: asJson(details) } });
      return this.view(saved, { requestId, replayed: false });
    });
  }
}
