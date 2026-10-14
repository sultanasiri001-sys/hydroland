import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Trip } from '@prisma/client';
import { createHash } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { OperationalClearanceService } from './operational-clearance.service';
import { PolicyControlService } from './policy-control.service';

type Mode = 'center' | 'admin';
type Action = 'PUBLISH' | 'REOPEN' | 'CLOSE' | 'CANCEL' | 'COMPLETE';
const terminal = (trip: Trip) => ['COMPLETED', 'CANCELLED'].includes(trip.status);
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const stale = () => new ConflictException('تغيرت الرحلة أو حجوزاتها أو مدفوعاتها. حدّث التفاصيل وراجعها قبل إعادة الإجراء.');

@Injectable()
export class TripLifecycleService {
  constructor(private readonly db: DatabaseService, private readonly audit: AuditService, private readonly clearance: OperationalClearanceService, private readonly policies: PolicyControlService) {}

  private async trip(tx: Prisma.TransactionClient, accountId: string, tripId: string, mode: Mode) {
    const role = await tx.roleAssignment.findFirst({ where: { accountId, role: mode === 'center' ? 'DIVE_CENTER' : 'ADMIN', status: 'ACTIVE', account: { status: 'ACTIVE' } } });
    if (!role) throw new ForbiddenException('لا تملك صلاحية إدارة هذه الرحلة.');
    let organizationId: string | undefined;
    if (mode === 'center') {
      const member = await tx.organizationMember.findFirst({ where: { accountId, status: 'ACTIVE', role: { in: ['OWNER', 'ADMIN'] }, organization: { kind: 'DIVE_CENTER', status: 'ACTIVE' } }, orderBy: { createdAt: 'asc' }, select: { organizationId: true } });
      if (!member) throw new ForbiddenException('يتطلب الإجراء إدارة مركز غوص نشط.');
      organizationId = member.organizationId;
    }
    const trip = await tx.trip.findFirst({ where: { id: tripId, ...(organizationId ? { organizationId } : {}) } });
    if (!trip) throw new NotFoundException('الرحلة غير موجودة ضمن نطاق حسابك.');
    return trip;
  }

  // Include booking/participant/payment revisions: Trip.updatedAt alone misses changes in these records.
  private async snapshot(tx: Prisma.TransactionClient, trip: Trip) {
    const bookings = await tx.booking.findMany({ where: { tripId: trip.id }, orderBy: { id: 'asc' }, select: { id: true, accountId: true, status: true, seats: true, updatedAt: true } });
    const participants = await tx.bookingParticipant.findMany({ where: { booking: { tripId: trip.id, status: 'CONFIRMED' } }, orderBy: { id: 'asc' }, select: { id: true, bookingId: true, accountId: true, fullName: true, eligibilityStatus: true, updatedAt: true } });
    const payments = await tx.payment.findMany({ where: { booking: { tripId: trip.id } }, orderBy: { id: 'asc' }, select: { id: true, bookingId: true, status: true, currency: true, amountMinor: true, updatedAt: true } });
    const financial: Record<string, { currency: string; status: string; count: number; amountMinor: number }> = {};
    for (const payment of payments) {
      const key = payment.currency + ':' + payment.status;
      financial[key] ??= { currency: payment.currency, status: payment.status, count: 0, amountMinor: 0 };
      financial[key].count++; financial[key].amountMinor += payment.amountMinor;
    }
    return { bookings, participants, financial: Object.values(financial), stateToken: hash([trip.updatedAt, bookings, participants, payments]) };
  }

  async preview(accountId: string, tripId: string, mode: Mode = 'center') {
    return this.db.serializable(async tx => {
      const trip = await this.trip(tx, accountId, tripId, mode), state = await this.snapshot(tx, trip), now = new Date();
      const actions: Action[] = [];
      if (!terminal(trip)) {
        actions.push('CANCEL');
        if (trip.status === 'OPEN') actions.push('CLOSE');
        if (trip.status === 'CLOSED' && trip.startsAt > now) actions.push('REOPEN');
        if (trip.status === 'DRAFT' && mode === 'admin' && trip.startsAt > now) actions.push('PUBLISH');
        if (['OPEN', 'CLOSED'].includes(trip.status) && trip.endsAt <= now) actions.push('COMPLETE');
      }
      const latest = await tx.auditEvent.findFirst({ where: { resource: 'Trip', resourceId: tripId, action: { in: ['TRIP_STATUS_CHANGED', 'TRIP_COMPLETED'] } }, orderBy: { occurredAt: 'desc' }, select: { metadata: true, occurredAt: true } });
      const metadata = latest?.metadata as Record<string, unknown> | null;
      return {
        trip: { id: trip.id, title: trip.title, status: trip.status, startsAt: trip.startsAt, endsAt: trip.endsAt, updatedAt: trip.updatedAt },
        stateToken: state.stateToken, actions,
        bookings: { pending: state.bookings.filter(b => b.status === 'PENDING').length, confirmed: state.bookings.filter(b => b.status === 'CONFIRMED').length, cancelled: state.bookings.filter(b => b.status === 'CANCELLED').length, confirmedSeats: state.bookings.filter(b => b.status === 'CONFIRMED').reduce((sum, b) => sum + b.seats, 0) },
        participants: state.participants.map(p => ({ id: p.id, fullName: p.fullName, eligibilityStatus: p.eligibilityStatus })),
        financial: state.financial, financialActionExecuted: false,
        clearance: await this.clearance.currentStatus(tripId, tx),
        lastAction: latest ? { occurredAt: latest.occurredAt, reason: metadata?.reason, attendedParticipants: metadata?.attendedParticipants, absentParticipants: metadata?.absentParticipants, cancelledBookings: metadata?.cancelledBookings } : null,
      };
    });
  }

  private validate(input: Record<string, unknown>) {
    const allowed = ['action', 'expectedUpdatedAt', 'expectedState', 'requestId', 'reason', 'financialAcknowledged', 'attendedParticipantIds', 'siteName', 'regionCode', 'maxDepthM', 'durationMin', 'instructorName', 'notes'];
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k => !allowed.includes(k))) throw new BadRequestException('حقول إجراء الرحلة غير صالحة.');
    if (!['PUBLISH', 'REOPEN', 'CLOSE', 'CANCEL', 'COMPLETE'].includes(String(input.action))) throw new BadRequestException('إجراء الرحلة غير صالح.');
    if (!uuid(input.requestId) || typeof input.expectedUpdatedAt !== 'string' || !Number.isFinite(Date.parse(input.expectedUpdatedAt)) || typeof input.expectedState !== 'string' || !/^[a-f0-9]{64}$/.test(input.expectedState)) throw new BadRequestException('حمّل تفاصيل الرحلة قبل تنفيذ الإجراء.');
    if (typeof input.reason !== 'string' || input.reason.trim().length < 10 || input.reason.trim().length > 1000) throw new BadRequestException('اكتب سبب الإجراء من 10 إلى 1000 حرف.');
    const action = input.action as Action;
    if (['CANCEL', 'COMPLETE'].includes(action) && input.financialAcknowledged !== true) throw new BadRequestException('أكد علمك بأن الإجراء لا ينفّذ استردادًا ماليًا تلقائيًا.');
    const completionFields = ['attendedParticipantIds', 'siteName', 'regionCode', 'maxDepthM', 'durationMin', 'instructorName', 'notes'];
    if (action !== 'COMPLETE' && completionFields.some(k => k in input)) throw new BadRequestException('بيانات الغوص متاحة عند إنهاء الرحلة فقط.');
    if (action === 'COMPLETE') {
      if (!Array.isArray(input.attendedParticipantIds) || !input.attendedParticipantIds.length || input.attendedParticipantIds.length > 2000 || !input.attendedParticipantIds.every(uuid) || new Set(input.attendedParticipantIds).size !== input.attendedParticipantIds.length) throw new BadRequestException('حدد المشاركين الذين حضروا الغوص فعليًا دون تكرار.');
      if (typeof input.siteName !== 'string' || !input.siteName.trim() || input.siteName.trim().length > 240) throw new BadRequestException('أدخل اسم موقع الغوص.');
      if (typeof input.maxDepthM !== 'number' || !Number.isFinite(input.maxDepthM) || input.maxDepthM <= 0 || input.maxDepthM > 150 || typeof input.durationMin !== 'number' || !Number.isInteger(input.durationMin) || input.durationMin < 1 || input.durationMin > 600) throw new BadRequestException('تحقق من العمق ومدة الغوص.');
      for (const [key, max] of [['regionCode', 60], ['instructorName', 240], ['notes', 2000]] as const) if (input[key] !== undefined && (typeof input[key] !== 'string' || (input[key] as string).trim().length > max)) throw new BadRequestException('بيانات الغوص النصية غير صالحة.');
    }
    return { action, reason: input.reason.trim(), requestId: input.requestId, expectedUpdatedAt: new Date(input.expectedUpdatedAt) };
  }

  private assertTransition(trip: Trip, action: Action, mode: Mode) {
    if (terminal(trip)) throw new ConflictException('الرحلة منتهية أو ملغاة؛ لا يمكن تغيير حالتها.');
    if (action === 'CANCEL') return;
    if (action === 'COMPLETE') {
      if (!['OPEN', 'CLOSED'].includes(trip.status) || trip.endsAt > new Date()) throw new ConflictException('يمكن إنهاء رحلة منشورة بعد موعد نهايتها فقط.');
    } else if (action === 'CLOSE') {
      if (trip.status !== 'OPEN') throw new ConflictException('إغلاق الحجز متاح للرحلة المفتوحة فقط.');
    } else if (trip.startsAt <= new Date() || (action === 'REOPEN' ? trip.status !== 'CLOSED' && !(mode === 'admin' && trip.status === 'DRAFT') : mode !== 'admin' || trip.status !== 'DRAFT')) throw new ConflictException('لا يمكن فتح الحجز لهذه الرحلة.');
  }

  async apply(accountId: string, tripId: string, input: Record<string, unknown>, mode: Mode = 'center') {
    const command = this.validate(input);
    const fingerprint = hash([accountId, mode, tripId, Object.keys(input).sort().map(k => [k, input[k]])]);
    const check = async (tx: Prisma.TransactionClient) => {
      const trip = await this.trip(tx, accountId, tripId, mode);
      const prior = await tx.auditEvent.findFirst({ where: { resource: 'Trip', resourceId: tripId, action: { in: ['TRIP_STATUS_CHANGED', 'TRIP_COMPLETED'] }, metadata: { path: ['requestId'], equals: command.requestId } }, select: { metadata: true } });
      if (prior) {
        const metadata = prior.metadata as Record<string, unknown>;
        if (metadata.fingerprint !== fingerprint) throw new ConflictException('استُخدم طلب الحفظ نفسه ببيانات مختلفة. حدّث التفاصيل.');
        return { trip, replay: { ...(metadata.result as Record<string, unknown>), alreadyApplied: true } };
      }
      const state = await this.snapshot(tx, trip);
      if (trip.updatedAt.getTime() !== command.expectedUpdatedAt.getTime() || state.stateToken !== input.expectedState) throw stale();
      this.assertTransition(trip, command.action, mode);
      return { trip, state };
    };
    // Resolve expensive readiness only after authorization; check the same clearance again inside the write transaction.
    const before = await this.db.serializable(check);
    if (before.replay) return before.replay;
    const operational = ['CLOSE', 'COMPLETE'].includes(command.action) ? await this.clearance.assertValid(tripId) : null;
    return this.db.serializable(async tx => {
      const checked = await check(tx);
      if (checked.replay) return checked.replay;
      const { trip, state } = checked;
      if (!state) throw stale();
      if (operational) await this.clearance.assertCurrent(tripId, operational.clearance.id, tx);
      const nextStatus = { PUBLISH: 'OPEN', REOPEN: 'OPEN', CLOSE: 'CLOSED', CANCEL: 'CANCELLED', COMPLETE: 'COMPLETED' }[command.action] as Trip['status'];
      if (nextStatus === 'OPEN') {
        const price = await tx.operationalSetting.findUnique({ where: { key: 'trip-price:' + tripId } });
        const value = price?.value as Record<string, unknown> | null;
        if (!value || value.currency !== 'SAR' || !Number.isSafeInteger(value.pricePerSeatMinor) || Number(value.pricePerSeatMinor) < 0) throw new ConflictException('حدد سعر الرحلة قبل فتح الحجز.');
      }
      let createdDiveLogs = 0;
      const attendedIds = command.action === 'COMPLETE' ? input.attendedParticipantIds as string[] : [];
      const reviewIssues: string[] = [];
      if (command.action === 'COMPLETE') {
        const safety = await tx.safetyChecklist.findFirst({ where: { tripId }, orderBy: { createdAt: 'desc' }, select: { decision: true } });
        if (safety?.decision !== 'ALLOWED') throw new ConflictException('يتطلب الإنهاء قرار سلامة ساريًا بالموافقة.');
        const [eligibility, capacity] = await Promise.all([this.policies.decision('DIVE_LOG', 'PARTICIPANT_ELIGIBILITY', tx), this.policies.decision('BOOKING', 'CAPACITY_LIMIT', tx)]);
        const seats = state.bookings.filter(b => b.status === 'CONFIRMED').reduce((sum, b) => sum + b.seats, 0);
        if (seats > trip.capacity) { if (capacity.enforce) throw new ConflictException('المقاعد المؤكدة تتجاوز سعة الرحلة.'); if (capacity.review) reviewIssues.push('CAPACITY_LIMIT'); }
        if (seats !== state.participants.length) { if (eligibility.enforce) throw new ConflictException('عدد المشاركين لا يطابق المقاعد المؤكدة.'); if (eligibility.review) reviewIssues.push('PARTICIPANT_COUNT_MISMATCH'); }
        const attending = state.participants.filter(p => attendedIds.includes(p.id));
        if (attending.length !== attendedIds.length) throw new ConflictException('يمكن تسجيل حضور مشاركين من حجوزات هذه الرحلة المؤكدة فقط.');
        if (attending.some(p => p.eligibilityStatus !== 'ELIGIBLE')) { if (eligibility.enforce) throw new ConflictException('راجع أهلية المشاركين الحاضرين قبل الإنهاء.'); if (eligibility.review) reviewIssues.push('PARTICIPANT_ELIGIBILITY'); }
        // Deliberately no certification/verification: dive logs remain pending their separate review workflow.
        for (const participant of attending) {
          if (await tx.diveLog.findFirst({ where: { sourceTripId: tripId, sourceParticipantId: participant.id } })) throw new ConflictException('يوجد سجل غوص سابق لهذا المشارك؛ يلزم مراجعة السجل قبل الإنهاء.');
          await tx.diveLog.create({ data: { accountId: participant.accountId, sourceTripId: tripId, sourceParticipantId: participant.id, siteName: (input.siteName as string).trim(), regionCode: (input.regionCode as string | undefined)?.trim() || null, diveDate: trip.startsAt, maxDepthM: input.maxDepthM as number, durationMin: input.durationMin as number, instructorName: (input.instructorName as string | undefined)?.trim() || null, notes: (input.notes as string | undefined)?.trim() || null, status: 'DRAFT' } });
          createdDiveLogs++;
        }
      }
      const cancelled = state.bookings.filter(b => command.action === 'CANCEL' ? b.status !== 'CANCELLED' : command.action === 'COMPLETE' && b.status === 'PENDING');
      if (cancelled.length) await tx.booking.updateMany({ where: { id: { in: cancelled.map(b => b.id) } }, data: { status: 'CANCELLED' } });
      let releasedCalendarResources = 0;
      if (['CANCEL', 'COMPLETE'].includes(command.action)) {
        releasedCalendarResources = await tx.$executeRaw`UPDATE "CalendarAllocation" a SET "status"='INACTIVE',"updatedAt"=NOW() FROM "CalendarEvent" e WHERE e."id"=a."eventId" AND e."referenceType"='TRIP' AND e."referenceId"=${tripId} AND a."status"='ACTIVE'`;
        await tx.calendarEvent.updateMany({ where: { referenceType: 'TRIP', referenceId: tripId, status: 'ACTIVE' }, data: { status: 'INACTIVE' } });
      }
      const updatedAt = new Date(Math.max(Date.now(), trip.updatedAt.getTime() + 1));
      const changed = await tx.trip.updateMany({ where: { id: tripId, updatedAt: trip.updatedAt, status: trip.status }, data: { status: nextStatus, updatedAt } });
      if (changed.count !== 1) throw stale();
      // In-app notices, attendance, audit, booking changes and resource release all commit together.
      if (['CANCEL', 'COMPLETE'].includes(command.action)) {
        const crew = await tx.crewAssignment.findMany({ where: { tripId }, select: { accountId: true } });
        const recipients = new Set([...state.bookings.filter(b => b.status !== 'CANCELLED').map(b => b.accountId), ...state.participants.flatMap(p => p.accountId ? [p.accountId] : []), ...crew.map(c => c.accountId)]);
        for (const recipient of recipients) await tx.notification.create({ data: { accountId: recipient, type: command.action === 'CANCEL' ? 'TRIP_CANCELLED' : 'TRIP_COMPLETED', status: 'SENT', sentAt: updatedAt, payload: { tripId, title: trip.title, status: nextStatus, financialActionExecuted: false, message: command.action === 'CANCEL' ? 'أُلغيت الرحلة. تُراجع أي مبالغ مدفوعة عبر الإجراءات المالية؛ لم يُنفّذ استرداد تلقائي.' : 'اكتمل تسجيل الرحلة. أُلغيت الحجوزات غير المؤكدة، وأُرسلت سجلات الغوص للحاضرين للمراجعة. لم يُنفّذ استرداد تلقائي.' } } });
      }
      const result = { trip: { id: tripId, status: nextStatus, updatedAt: updatedAt.toISOString() }, cancelledBookings: cancelled.length, createdDiveLogs, attendedParticipants: attendedIds.length, absentParticipants: command.action === 'COMPLETE' ? state.participants.length - attendedIds.length : 0, releasedCalendarResources, financialActionExecuted: false, alreadyApplied: false };
      await this.audit.record({ actorId: accountId, action: command.action === 'COMPLETE' ? 'TRIP_COMPLETED' : 'TRIP_STATUS_CHANGED', resource: 'Trip', resourceId: tripId, metadata: { actorAccountId: accountId, source: mode, requestId: command.requestId, fingerprint, previousStatus: trip.status, status: nextStatus, reason: command.reason, attendedParticipantIds: attendedIds, absentParticipantIds: command.action === 'COMPLETE' ? state.participants.filter(p => !attendedIds.includes(p.id)).map(p => p.id) : [], ...result, cancelledBookingIds: cancelled.map(b => b.id), financial: state.financial, operationalClearanceEventId: operational?.clearance.id ?? null, policyReview: { required: reviewIssues.length > 0, issues: reviewIssues }, result } }, tx);
      return result;
    });
  }
}
