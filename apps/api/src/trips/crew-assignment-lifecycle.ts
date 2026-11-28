import { BadRequestException, ForbiddenException, HttpException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { AuditService } from '../audit/audit.service';
import { reviewPlatform } from '../document-forms/internal-document-review.domain';
import { assertCalendarHumanAvailable } from './calendar-training-availability';
import {
  assertCrewSnapshot, crewAccount, crewAssignmentReadiness, crewAuthority, crewCompensation, crewFailure, crewFields, crewHash, crewId, crewJson,
  crewLockDecision, crewNote, crewObject, crewOrganization, crewQualification, crewRevision, crewSource, crewSourceTemplate, CREW_SOURCE_CODE,
  type CrewRow, type CrewTrip, type CrewTx,
} from './crew-assignment-evidence';

type Result = {assignmentId: string; status: string; revision: number; financialExecution: false; replacement?: null; requiresAdminAction?: boolean};
const active = ['WAITLISTED','PROPOSED','PENDING','ACCEPTED'];
const mutableTrip = (trip: CrewTrip) => {
  if (['CANCELLED','COMPLETED'].includes(trip.status) || trip.startsAt <= new Date()) crewFailure('F02_TRIP_NOT_OPEN_FOR_ASSIGNMENT');
};
const result = (row: CrewRow): Result => ({assignmentId: row.id, status: row.status, revision: row.revision, financialExecution: false});

/** Native crew state transitions. All source reads, reservations, receipts,
 * notifications and audit writes share the same Serializable transaction. */
export class CrewAssignmentLifecycle {
  constructor(private readonly db: DatabaseService, private readonly audit: AuditService) {}

  private async row(tx: CrewTx, id: string, lock = false) {
    const rows = lock ? await tx.$queryRaw<CrewRow[]>`SELECT * FROM "CrewAssignment" WHERE id::text=${id} FOR UPDATE`
      : await tx.$queryRaw<CrewRow[]>`SELECT * FROM "CrewAssignment" WHERE id::text=${id}`;
    if (!rows[0]) throw new NotFoundException('F02_ASSIGNMENT_NOT_FOUND');
    return rows[0];
  }
  private async trip(tx: CrewTx, id: string) {
    const trip = await tx.trip.findUnique({where: {id}});
    if (!trip) throw new NotFoundException('F02_TRIP_NOT_FOUND');
    return trip;
  }
  private async replay(tx: CrewTx, actor: string, requestId: string, fingerprint: string) {
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${'F02_COMMAND:'+actor+':'+requestId})::bigint)`;
    const [receipt] = await tx.$queryRaw<Array<{fingerprint: string; result: Result}>>`SELECT fingerprint,result FROM "CrewAssignmentCommand" WHERE "actorAccountId"=${actor} AND "requestId"=${requestId}`;
    if (receipt && receipt.fingerprint !== fingerprint) return crewFailure('F02_REQUEST_ID_REUSED');
    return receipt ? {...receipt.result, alreadyApplied: true} : null;
  }
  private async receipt(tx: CrewTx, actor: string, requestId: string, action: string, fingerprint: string, value: Result) {
    await tx.$executeRaw`INSERT INTO "CrewAssignmentCommand" (id,"actorAccountId","requestId","assignmentId",action,fingerprint,result)
      VALUES (${randomUUID()},${actor},${requestId},${value.assignmentId},${action},${fingerprint},${JSON.stringify(value)}::jsonb)`;
    return {...value, alreadyApplied: false};
  }
  private notify(tx: CrewTx, accountId: string, type: string, payload: Record<string, unknown>) {
    return tx.notification.create({data: {accountId, type, payload: crewJson(payload), status: 'PENDING'}});
  }
  private async managers(tx: CrewTx, trip: CrewTrip) {
    const organization = await crewOrganization(tx, trip), platform = await reviewPlatform(tx);
    const members = await tx.organizationMember.findMany({where: {organizationId: organization.id, status: 'ACTIVE', role: {in: ['OWNER','ADMIN']}}, select: {accountId: true}});
    const ids = [...new Set([organization.ownerId, platform.ownerId, ...members.map(m => m.accountId)])], allowed: string[] = [];
    for (const id of ids) {
      try { await crewAuthority(tx, id, organization.id); allowed.push(id); }
      catch (error) { if (!(error instanceof ForbiddenException)) throw error; }
    }
    return allowed;
  }
  private async notifyManagers(tx: CrewTx, trip: CrewTrip, type: string, payload: Record<string, unknown>) {
    for (const id of await this.managers(tx, trip)) await this.notify(tx, id, type, payload);
  }
  private async auditTransition(tx: CrewTx, actor: string, trip: CrewTrip, row: CrewRow, action: string, prior: string | null, reason: string, requestId: string) {
    const organization = await crewOrganization(tx, trip);
    await this.audit.record({actorId: actor, action: 'CREW_ASSIGNMENT_'+action, resource: 'CrewAssignment', resourceId: row.id,
      metadata: {actorAccountId: actor, organizationId: organization.id, tripId: trip.id, accountId: row.accountId, resourceId: row.resourceId, roleType: row.roleType,
        previousStatus: prior, status: row.status, revision: row.revision, requestId, reason, replacesAssignmentId: row.replacesAssignmentId,
        qualificationHash: row.qualificationSnapshot ? crewHash(row.qualificationSnapshot) : null, compensationHash: row.compensationSnapshot ? crewHash(row.compensationSnapshot) : null,
        requestedByAccountId: row.requestedByAccountId, approvedByAccountId: row.approvedByAccountId, financialExecution: false}}, tx);
  }
  private async reserve(tx: CrewTx, trip: CrewTrip, row: CrewRow) {
    await assertCalendarHumanAvailable(tx, [row.resourceId], trip.startsAt, trip.endsAt, trip.id);
    const event = await tx.calendarEvent.upsert({where: {referenceType_referenceId: {referenceType: 'TRIP', referenceId: trip.id}},
      create: {organizationId: trip.organizationId, type: 'TRIP', referenceType: 'TRIP', referenceId: trip.id, title: trip.title, startsAt: trip.startsAt, endsAt: trip.endsAt},
      update: {organizationId: trip.organizationId, title: trip.title, startsAt: trip.startsAt, endsAt: trip.endsAt, status: 'ACTIVE'}});
    const existing = await tx.calendarAllocation.findFirst({where: {eventId: event.id, resourceId: row.resourceId, status: 'ACTIVE'}});
    if (existing && (existing.startsAt.getTime() !== trip.startsAt.getTime() || existing.endsAt.getTime() !== trip.endsAt.getTime())) return crewFailure('F02_CALENDAR_RESERVATION_CHANGED');
    if (!existing) await tx.calendarAllocation.create({data: {eventId: event.id, resourceId: row.resourceId, startsAt: trip.startsAt, endsAt: trip.endsAt}});
  }
  private async release(tx: CrewTx, trip: CrewTrip, row: CrewRow) {
    // An old record must never release another still-active reservation.
    const other = await tx.crewAssignment.findFirst({where: {tripId: trip.id, resourceId: row.resourceId, id: {not: row.id}, status: {in: ['PENDING','ACCEPTED']}}});
    if (!other) await tx.calendarAllocation.updateMany({where: {resourceId: row.resourceId, status: 'ACTIVE', event: {referenceType: 'TRIP', referenceId: trip.id}}, data: {status: 'INACTIVE'}});
  }

  async propose(actor: string, tripId: string, input: unknown) {
    crewId(tripId);
    const body = crewFields(input, ['requestId','resourceId','sourceId','reason','waitlisted','replacesAssignmentId','replacesRevision']);
    const requestId = crewId(body.requestId), resourceId = crewId(body.resourceId), sourceId = crewId(body.sourceId), reason = crewNote(body.reason);
    if (typeof body.waitlisted !== 'boolean') throw new BadRequestException('F02_WAITLIST_CHOICE_REQUIRED');
    const replacesAssignmentId = body.replacesAssignmentId ? crewId(body.replacesAssignmentId) : null;
    const replacesRevision = replacesAssignmentId ? crewRevision(body.replacesRevision) : null;
    if (!replacesAssignmentId && body.replacesRevision !== undefined) throw new BadRequestException('F02_INVALID_FIELDS');
    const command = {tripId, resourceId, sourceId, reason, waitlisted: body.waitlisted, replacesAssignmentId, replacesRevision}, fingerprint = crewHash({action: 'CREATE', ...command});
    return this.db.serializable(async tx => {
      await tx.$executeRaw`SET LOCAL TIME ZONE 'UTC'`;
      const trip = await this.trip(tx, tripId), organization = await crewOrganization(tx, trip);
      await crewAuthority(tx, actor, organization.id);
      const prior = await this.replay(tx, actor, requestId, fingerprint); if (prior) return prior;
      mutableTrip(trip);
      const qualification = await crewQualification(tx, trip, resourceId, sourceId, !body.waitlisted), q = crewObject(qualification);
      const accountId = String(q.accountId), roleType = String(q.roleType), compensation = await crewCompensation(tx, trip, accountId, roleType);
      if (await tx.crewAssignment.findFirst({where: {tripId, accountId, status: {in: active}}})) return crewFailure('F02_PERSON_ALREADY_LISTED');
      if (replacesAssignmentId) {
        const old = await this.row(tx, replacesAssignmentId, true);
        if (old.tripId !== tripId || old.revision !== replacesRevision || old.accountId === accountId || old.roleType !== roleType
          || !['PENDING','ACCEPTED','REJECTED','CANCELLED'].includes(old.status)) return crewFailure('F02_REPLACEMENT_SOURCE_CHANGED');
      }
      await crewLockDecision(tx, trip, [actor], qualification, compensation);
      const created = await tx.crewAssignment.create({data: {tripId, resourceId, accountId, roleType, status: body.waitlisted ? 'WAITLISTED' : 'PROPOSED', replacesAssignmentId}});
      await tx.$executeRaw`UPDATE "CrewAssignment" SET "requestedByAccountId"=${actor},"replacesRevision"=${replacesRevision},
        "qualificationSnapshot"=${JSON.stringify(qualification)}::jsonb,"compensationSnapshot"=${JSON.stringify(compensation)}::jsonb,"decisionReason"=${reason} WHERE id::text=${created.id}`;
      const row = await this.row(tx, created.id);
      await this.auditTransition(tx, actor, trip, row, row.status, null, reason, requestId);
      await this.notify(tx, accountId, 'CREW_ASSIGNMENT_'+row.status, {assignmentId: row.id, tripId, status: row.status, requiresIndependentApproval: true});
      return this.receipt(tx, actor, requestId, 'CREATE', fingerprint, result(row));
    });
  }

  async command(actor: string, id: string, input: unknown) {
    crewId(id);
    const body = crewFields(input, ['requestId','expectedRevision','action','reason']);
    const requestId = crewId(body.requestId), expectedRevision = crewRevision(body.expectedRevision), reason = crewNote(body.reason), action = String(body.action);
    if (!['PROPOSE','APPROVE','DECLINE','CANCEL'].includes(action)) throw new BadRequestException('F02_INVALID_ACTION');
    const fingerprint = crewHash({id, expectedRevision, reason, action});
    return this.db.serializable(async tx => {
      await tx.$executeRaw`SET LOCAL TIME ZONE 'UTC'`;
      const row = await this.row(tx, id, true), trip = await this.trip(tx, row.tripId), organization = await crewOrganization(tx, trip);
      const account = await crewAccount(tx, actor);
      const authority = action === 'CANCEL' && row.accountId === actor ? null : await crewAuthority(tx, actor, organization.id);
      const replay = await this.replay(tx, actor, requestId, fingerprint); if (replay) return replay;
      mutableTrip(trip);
      if (row.revision !== expectedRevision) return crewFailure('F02_STALE_REVISION');
      if (!active.includes(row.status)) return crewFailure('F02_INVALID_STATE');
      await crewLockDecision(tx, trip, [actor, row.accountId, row.requestedByAccountId, row.approvedByAccountId], row.qualificationSnapshot, row.compensationSnapshot);
      let status: string;
      if (action === 'PROPOSE') {
        if (row.status !== 'WAITLISTED') return crewFailure('F02_INVALID_STATE');
        await assertCrewSnapshot(tx, row, trip, {latestCompensation: true, approval: false});
        status = 'PROPOSED';
      } else if (action === 'APPROVE') {
        if (row.status !== 'PROPOSED' || !row.requestedByAccountId || !authority) return crewFailure('F02_INVALID_STATE');
        const people = await tx.account.findMany({where: {id: {in: [row.requestedByAccountId, row.accountId]}}, select: {id: true, personId: true}});
        if (people.some(person => person.personId === account.personId)) throw new ForbiddenException('F02_INDEPENDENT_APPROVER_REQUIRED');
        await crewAuthority(tx, row.requestedByAccountId, organization.id);
        await assertCrewSnapshot(tx, row, trip, {latestCompensation: true, approval: false});
        if (row.replacesAssignmentId) {
          const old = await this.row(tx, row.replacesAssignmentId, true), oldAccount = await tx.account.findUniqueOrThrow({where: {id: old.accountId}, select: {personId: true}});
          if (oldAccount.personId === account.personId) throw new ForbiddenException('F02_INDEPENDENT_APPROVER_REQUIRED');
          if (old.revision !== row.replacesRevision || !['PENDING','ACCEPTED','REJECTED','CANCELLED'].includes(old.status)) return crewFailure('F02_REPLACEMENT_SOURCE_CHANGED');
          const [pending] = await tx.$queryRaw<Array<{id: string}>>`SELECT id FROM "CrewAssignment" WHERE "replacesAssignmentId"::text=${old.id} AND status IN ('PENDING','ACCEPTED') AND id::text<>${id}`;
          if (pending) return crewFailure('F02_REPLACEMENT_ALREADY_APPROVED');
        }
        await this.reserve(tx, trip, row);
        await tx.$executeRaw`UPDATE "CrewAssignment" SET "approvedByAccountId"=${actor},"approvedAt"=NOW(),"approvalAuthority"=${JSON.stringify(authority)}::jsonb WHERE id::text=${id}`;
        status = 'PENDING';
      } else if (action === 'DECLINE') {
        if (!['WAITLISTED','PROPOSED'].includes(row.status)) return crewFailure('F02_INVALID_STATE');
        status = 'REJECTED';
      } else status = 'CANCELLED';
      await tx.$executeRaw`UPDATE "CrewAssignment" SET status=${status},revision=revision+1,"decisionReason"=${reason},"updatedAt"=NOW() WHERE id::text=${id} AND revision=${expectedRevision}`;
      const changed = await this.row(tx, id);
      if (status === 'CANCELLED' || status === 'REJECTED') await this.release(tx, trip, changed);
      await this.auditTransition(tx, actor, trip, changed, action === 'APPROVE' ? 'APPROVED' : status, row.status, reason, requestId);
      await this.notify(tx, row.accountId, status === 'PENDING' ? 'TRIP_CREW_ASSIGNMENT' : 'CREW_ASSIGNMENT_'+status,
        {assignmentId: id, tripId: trip.id, status, actionRequired: status === 'PENDING', replacementForAssignmentId: row.replacesAssignmentId});
      return this.receipt(tx, actor, requestId, action, fingerprint, result(changed));
    });
  }

  async respond(actor: string, id: string, response: 'ACCEPTED'|'REJECTED', input: unknown = {}) {
    crewId(id);
    if (!['ACCEPTED','REJECTED'].includes(response)) throw new BadRequestException('F02_INVALID_RESPONSE');
    const body = crewFields(input, ['requestId','expectedRevision','reason']);
    const requestId = body.requestId === undefined ? 'response_'+crewHash({actor,id,response}) : crewId(body.requestId);
    const expectedRevision = body.expectedRevision === undefined ? null : crewRevision(body.expectedRevision);
    const reason = body.reason === undefined ? (response === 'ACCEPTED' ? 'Crew member accepted the recorded assignment' : 'Crew member declined the assignment') : crewNote(body.reason);
    const fingerprint = crewHash({id, response, expectedRevision, reason});
    return this.db.serializable(async tx => {
      await tx.$executeRaw`SET LOCAL TIME ZONE 'UTC'`;
      await crewAccount(tx, actor);
      const row = await this.row(tx, id, true);
      if (row.accountId !== actor) throw new NotFoundException('F02_ASSIGNMENT_NOT_FOUND');
      const trip = await this.trip(tx, row.tripId), replay = await this.replay(tx, actor, requestId, fingerprint); if (replay) return replay;
      mutableTrip(trip);
      if (row.status !== 'PENDING' || expectedRevision !== null && row.revision !== expectedRevision) return crewFailure('F02_STALE_REVISION');
      if (response === 'ACCEPTED') {
        await assertCrewSnapshot(tx, row, trip);
        await crewLockDecision(tx, trip, [actor, row.requestedByAccountId, row.approvedByAccountId], row.qualificationSnapshot, row.compensationSnapshot);
        await this.reserve(tx, trip, row);
        if (row.replacesAssignmentId) {
          const old = await this.row(tx, row.replacesAssignmentId, true);
          if (old.revision !== row.replacesRevision || !['PENDING','ACCEPTED','REJECTED','CANCELLED'].includes(old.status)) return crewFailure('F02_REPLACEMENT_SOURCE_CHANGED');
          await tx.$executeRaw`UPDATE "CrewAssignment" SET status='REASSIGNED',revision=revision+1,"updatedAt"=NOW() WHERE id::text=${old.id} AND revision=${old.revision}`;
          await this.release(tx, trip, old);
          const organization = await crewOrganization(tx, trip);
          await this.audit.record({actorId: actor, action: 'CREW_ASSIGNMENT_REASSIGNED', resource: 'CrewAssignment', resourceId: row.id,
            metadata: {organizationId: organization.id, tripId: trip.id, previousAssignmentId: old.id, previousAccountId: old.accountId,
              replacementAccountId: row.accountId, previousResourceId: old.resourceId, replacementResourceId: row.resourceId, roleType: row.roleType,
              requestedByAccountId: row.requestedByAccountId, approvedByAccountId: row.approvedByAccountId, acceptedByAccountId: actor, requestId}}, tx);
          await this.notify(tx, old.accountId, 'CREW_REASSIGNED', {assignmentId: old.id, replacementAssignmentId: row.id, tripId: trip.id});
        }
      }
      if (response === 'REJECTED') await crewLockDecision(tx, trip, [actor], row.qualificationSnapshot, row.compensationSnapshot);
      await tx.$executeRaw`UPDATE "CrewAssignment" SET status=${response},"respondedAt"=NOW(),revision=revision+1,"updatedAt"=NOW(),"decisionReason"=${reason} WHERE id::text=${id} AND revision=${row.revision}`;
      const changed = await this.row(tx, id);
      if (response === 'REJECTED') await this.release(tx, trip, changed);
      await this.auditTransition(tx, actor, trip, changed, response, row.status, reason, requestId);
      await this.notifyManagers(tx, trip, response === 'ACCEPTED' ? 'CREW_ASSIGNMENT_ACCEPTED' : 'CREW_REPLACEMENT_REQUIRED', {assignmentId: id, tripId: trip.id, status: response, automaticReplacement: false});
      const value: Result = {...result(changed), ...(response === 'REJECTED' ? {replacement: null, requiresAdminAction: true} : {})};
      return this.receipt(tx, actor, requestId, response, fingerprint, value);
    });
  }

  private async projection(tx: CrewTx, row: CrewRow, actor: string, trip?: CrewTrip) {
    const currentTrip = trip ?? await this.trip(tx, row.tripId), q = crewObject(row.qualificationSnapshot), source = crewObject(q.source), compensation = crewObject(row.compensationSnapshot);
    const readiness = await crewAssignmentReadiness(tx, row.id);
    let manager = false, canApprove = false;
    try {
      const organization = await crewOrganization(tx, currentTrip), authority = await crewAuthority(tx, actor, organization.id);
      manager = true;
      const blockedIds = [row.accountId, row.requestedByAccountId, ...(row.replacesAssignmentId ? [(await this.row(tx, row.replacesAssignmentId)).accountId] : [])].filter((v): v is string => Boolean(v));
      const people = await tx.account.findMany({where: {id: {in: blockedIds}}, select: {personId: true}});
      canApprove = !people.some(person => person.personId === authority.personId);
    } catch (error) { if (!(error instanceof ForbiddenException)) throw error; }
    const mutable = !['CANCELLED','COMPLETED'].includes(currentTrip.status) && currentTrip.startsAt > new Date();
    const actions = mutable ? [
      ...(row.status === 'PENDING' && row.accountId === actor ? [
        ...(!readiness.legacyUnverified && readiness.reasons.length === 1 && readiness.reasons[0] === 'F02_CREW_ACCEPTANCE_REQUIRED' ? ['ACCEPT'] : []), 'REJECT',
      ] : []),
      ...(row.status === 'WAITLISTED' && manager ? ['PROPOSE'] : []),
      ...(row.status === 'PROPOSED' && manager && canApprove ? ['APPROVE'] : []),
      ...(['WAITLISTED','PROPOSED'].includes(row.status) && manager ? ['DECLINE'] : []),
      ...(active.includes(row.status) && (manager || row.accountId === actor) ? ['CANCEL'] : []),
    ] : [];
    return {id: row.id, tripId: row.tripId, tripTitle: currentTrip.title, tripType: currentTrip.type, startsAt: currentTrip.startsAt, endsAt: currentTrip.endsAt,
      accountId: row.accountId, resourceId: row.resourceId, roleType: row.roleType, status: row.status, revision: row.revision,
      replacesAssignmentId: row.replacesAssignmentId, requestedByAccountId: row.requestedByAccountId, approvedByAccountId: row.approvedByAccountId,
      approvedAt: row.approvedAt, respondedAt: row.respondedAt, decisionReason: row.decisionReason,
      qualification: row.qualificationSnapshot ? {sourceReference: source.referenceNumber, sourceVersion: source.version, credentialCount: Array.isArray(q.credentials) ? q.credentials.length : 0} : null,
      compensation: row.compensationSnapshot ? {kind: compensation.kind, revision: compensation.revision, mode: compensation.mode,
        currency: compensation.currency, fixedMinor: compensation.fixedMinor, rateBps: compensation.rateBps, baseAmountMinor: compensation.baseAmountMinor,
        allowances: compensation.allowances, benefits: compensation.benefits,
        earningTiming: compensation.earningTiming, reversalTerms: compensation.reversalTerms, financialExecution: false} : null,
      ...readiness, actions};
  }
  async mine(actor: string) {
    return this.db.serializable(async tx => {
      await crewAccount(tx, actor);
      const rows = await tx.$queryRaw<CrewRow[]>`SELECT c.* FROM "CrewAssignment" c JOIN "Trip" t ON t.id=c."tripId" WHERE c."accountId"::text=${actor} ORDER BY t."startsAt" DESC,c."createdAt" DESC LIMIT 100`;
      return Promise.all(rows.map(row => this.projection(tx, row, actor)));
    });
  }
  async workspace(actor: string, tripId?: string) {
    if (tripId !== undefined) crewId(tripId);
    return this.db.serializable(async tx => {
      await crewAccount(tx, actor);
      const platform = await reviewPlatform(tx), owned = await tx.organizationMember.findMany({where: {accountId: actor, status: 'ACTIVE', role: {in: ['OWNER','ADMIN']}}, select: {organizationId: true}});
      let global = platform.ownerId === actor;
      if (!global) {
        try { global = (await crewAuthority(tx, actor, platform.id)).kind === 'MARINE_OPERATIONS'; }
        catch (error) { if (!(error instanceof ForbiddenException)) throw error; }
      }
      if (!global && !owned.length) throw new ForbiddenException('F02_MANAGEMENT_SCOPE_REQUIRED');
      const trips = await tx.trip.findMany({where: {...(!global ? {organizationId: {in: owned.map(m => m.organizationId)}} : {}), status: {in: ['DRAFT','OPEN','CLOSED']}, startsAt: {gt: new Date()}}, orderBy: {startsAt: 'asc'}, take: 101});
      if (trips.length > 100) return crewFailure('F02_TRIP_LIST_REQUIRES_NARROWER_SCOPE');
      const allowed: CrewTrip[] = [];
      for (const trip of trips) { try { await crewAuthority(tx, actor, (await crewOrganization(tx, trip)).id); allowed.push(trip); } catch (error) { if (!(error instanceof ForbiddenException)) throw error; } }
      const selected = tripId ? allowed.find(t => t.id === tripId) : allowed[0];
      if (tripId && !selected) throw new NotFoundException('F02_TRIP_NOT_FOUND');
      const template = await tx.documentTemplate.findUnique({where: {organizationId_code_version: {organizationId: platform.id, code: CREW_SOURCE_CODE, version: 1}}, select: {id: true}});
      if (!selected) return {trips: [], trip: null, assignments: [], resources: [], sources: [], canPrepareTemplate: platform.ownerId === actor, templateReady: Boolean(template)};
      const organization = await crewOrganization(tx, selected);
      const members = await tx.organizationMember.findMany({where: {organizationId: organization.id, status: 'ACTIVE', account: {status: 'ACTIVE'}}, select: {accountId: true}});
      const resources = await tx.calendarResource.findMany({where: {type: {in: ['INSTRUCTOR','CAPTAIN','CREW']}, active: true, referenceId: {in: members.map(m => m.accountId)}}, select: {id: true, name: true, type: true, referenceId: true}, orderBy: [{type: 'asc'}, {name: 'asc'}], take: 201});
      if (resources.length > 200) return crewFailure('F02_RESOURCE_LIST_REQUIRES_NARROWER_SCOPE');
      const documents = await tx.managedDocument.findMany({where: {organizationId: platform.id, status: {in: ['APPROVED','SIGNED']}, template: {code: CREW_SOURCE_CODE, status: 'ACTIVE'}, payload: {path: ['organizationId'], equals: organization.id}}, select: {id: true}, take: 101});
      if (documents.length > 100) return crewFailure('F02_SOURCE_LIST_REQUIRES_NARROWER_SCOPE');
      const sources: Array<{id: string; label: string; roleType: string}> = [];
      for (const document of documents) for (const role of ['INSTRUCTOR','CAPTAIN','CREW']) {
        try { const source = await crewSource(tx, document.id, selected, role); sources.push({id: document.id, label: source.pin.referenceNumber+' · v'+source.pin.version, roleType: role}); }
        catch (error) { if (!(error instanceof HttpException) || error.getStatus() >= 500) throw error; }
      }
      const rows = await tx.$queryRaw<CrewRow[]>`SELECT * FROM "CrewAssignment" WHERE "tripId"::text=${selected.id} ORDER BY "createdAt",id LIMIT 201`;
      if (rows.length > 200) return crewFailure('F02_ASSIGNMENT_LIST_REQUIRES_NARROWER_SCOPE');
      return {trips: allowed.map(t => ({id: t.id, title: t.title, type: t.type, startsAt: t.startsAt})), trip: {id: selected.id, title: selected.title, organizationId: organization.id},
        assignments: await Promise.all(rows.map(row => this.projection(tx, row, actor, selected))), resources, sources,
        canPrepareTemplate: platform.ownerId === actor, templateReady: Boolean(template), financialExecution: false};
    });
  }

  async prepareTemplate(actor: string, input: unknown) {
    const body = crewFields(input, ['confirmed']); if (body.confirmed !== true) throw new BadRequestException('F02_TEMPLATE_CONFIRMATION_REQUIRED');
    return this.db.serializable(async tx => {
      const platform = await reviewPlatform(tx); if (platform.ownerId !== actor) throw new ForbiddenException('F02_PLATFORM_OWNER_REQUIRED');
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${'F02_TEMPLATE:'+platform.id})::bigint)`;
      const existing = await tx.documentTemplate.findUnique({where: {organizationId_code_version: {organizationId: platform.id, code: CREW_SOURCE_CODE, version: 1}}});
      if (existing && (existing.department !== crewSourceTemplate.department || crewHash(existing.fields) !== crewHash(crewSourceTemplate.fields))) return crewFailure('F02_TEMPLATE_ALREADY_DIFFERS');
      const template = existing ?? await tx.documentTemplate.create({data: {organizationId: platform.id, ...crewSourceTemplate, fields: crewJson(crewSourceTemplate.fields)}});
      if (!existing) await this.audit.record({actorId: actor, action: 'CREW_QUALIFICATION_TEMPLATE_PREPARED', resource: 'DocumentTemplate', resourceId: template.id, metadata: {code: CREW_SOURCE_CODE, approvalsCreated: 0}}, tx);
      return {id: template.id, code: template.code, created: !existing, approvalsCreated: 0};
    });
  }

  async dispatchForConfirmedBooking(tripId: string, bookingId: string, client?: CrewTx) {
    const work = async (tx: CrewTx) => {
      const trip = await this.trip(tx, tripId);
      if (['CANCELLED','COMPLETED'].includes(trip.status)) return crewFailure('F02_TRIP_TERMINAL');
      const rows = await tx.$queryRaw<CrewRow[]>`SELECT * FROM "CrewAssignment" WHERE "tripId"::text=${tripId} AND status IN ('PENDING','ACCEPTED')`;
      let notifiedCrew = 0;
      for (const row of rows) {
        const exists = await tx.notification.findFirst({where: {accountId: row.accountId, type: 'TRIP_BOOKING_CONFIRMED', AND: [{payload: {path: ['bookingId'], equals: bookingId}}, {payload: {path: ['assignmentId'], equals: row.id}}]}, select: {id: true}});
        if (!exists) { await this.notify(tx, row.accountId, 'TRIP_BOOKING_CONFIRMED', {assignmentId: row.id, tripId, bookingId, tripTitle: trip.title, actionRequired: false}); notifiedCrew++; }
      }
      // Booking confirmation never fabricates a qualification or an approval.
      return {tripId, bookingId, notifiedCrew, policyReview: {required: !rows.length, issues: rows.length ? [] : ['F02_CREW_REVIEW_REQUIRED'], states: {}}, automaticAssignments: 0};
    };
    return client ? work(client) : this.db.serializable(work);
  }
  async escalatePending(hoursBefore = 24) {
    const hours = Math.min(168, Math.max(1, Math.trunc(hoursBefore))), deadline = new Date(Date.now()+hours*3600000);
    return this.db.serializable(async tx => {
      const rows = await tx.$queryRaw<CrewRow[]>`SELECT c.* FROM "CrewAssignment" c JOIN "Trip" t ON t.id=c."tripId" WHERE c.status='PENDING' AND t.status IN ('OPEN','CLOSED') AND t."startsAt">(NOW() AT TIME ZONE 'UTC') AND t."startsAt"<=(${deadline}::timestamptz AT TIME ZONE 'UTC')`;
      let adminRequired = 0;
      for (const row of rows) {
        const exists = await tx.notification.findFirst({where: {type: 'CREW_RESPONSE_OVERDUE', AND: [{payload: {path: ['assignmentId'], equals: row.id}}, {payload: {path: ['revision'], equals: row.revision}}]}, select: {id: true}});
        if (exists) continue;
        const trip = await this.trip(tx, row.tripId);
        await this.notifyManagers(tx, trip, 'CREW_RESPONSE_OVERDUE', {assignmentId: row.id, revision: row.revision, tripId: row.tripId, automaticReplacement: false});
        await this.audit.record({action: 'CREW_RESPONSE_ESCALATED', resource: 'CrewAssignment', resourceId: row.id, metadata: {tripId: row.tripId, revision: row.revision, automaticReplacement: false}}, tx);
        adminRequired++;
      }
      return {checked: rows.length, reassigned: 0, adminRequired, hoursBefore: hours};
    });
  }
}
