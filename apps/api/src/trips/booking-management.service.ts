import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { CrewAssignmentService } from './crew-assignment.service';
import { PolicyControlService } from './policy-control.service';
import { TripWeatherReview, TripWeatherReviewService } from './trip-weather-review.service';
import { WeatherGateService } from './weather-gate.service';

type Mode = 'center' | 'marine' | 'admin' | 'owner' | 'organization';
type Action = 'CONFIRM' | 'CANCEL';
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const stale = () => new ConflictException('تغيرت بيانات الحجز أو شروط التأكيد. حدّث التفاصيل قبل المحاولة.');
const names = { select: { person: { select: { firstName: true, lastName: true } } } } as const;
const tripFields = { id: true, title: true, status: true, type: true, startsAt: true, endsAt: true, capacity: true, updatedAt: true } as const;

@Injectable()
export class BookingManagementService {
  constructor(private readonly db: DatabaseService, private readonly audit: AuditService, private readonly policies: PolicyControlService, private readonly weather: WeatherGateService, private readonly weatherReviews: TripWeatherReviewService, private readonly crew: CrewAssignmentService) {}

  private async scope(tx: Prisma.TransactionClient, accountId: string, mode: Mode, organizationId?: string): Promise<Prisma.BookingWhereInput> {
    if (mode === 'marine') {
      if (!await tx.roleAssignment.findFirst({ where: { accountId, role: 'BOAT_OWNER', status: 'ACTIVE', account: { status: 'ACTIVE' } }, select: { id: true } })) throw new ForbiddenException('يتطلب الإجراء حساب وساطة بحرية نشطًا.');
      const memberships = await tx.organizationMember.findMany({ where: { accountId, status: 'ACTIVE', role: { in: ['OWNER', 'ADMIN', 'OPERATOR', 'STAFF'] }, organization: { kind: 'MARINE_OPERATOR', status: 'ACTIVE' } }, select: { organizationId: true } });
      const organizationIds = [...new Set(memberships.map(row => row.organizationId))];
      if (!organizationIds.length) throw new ForbiddenException('يتطلب الإجراء عضوية تشغيل نشطة في جهة بحرية.');
      return { trip: { organizationId: { in: organizationIds } } };
    }
    if (mode === 'owner') {
      if (!await tx.account.findFirst({ where: { id: accountId, status: 'ACTIVE' } })) throw new ForbiddenException('الحساب غير نشط.');
      return { accountId, organizationId: null };
    }
    if (mode === 'organization') {
      if (!organizationId) throw new BadRequestException('معرّف الجهة غير صالح.');
      const member = await tx.organizationMember.findFirst({ where: { organizationId, accountId, status: 'ACTIVE', organization: { status: 'ACTIVE' } }, select: { id: true } });
      if (!member) throw new ForbiddenException('تتطلب العملية عضوية نشطة في الجهة.');
      return { organizationId };
    }
    if (!await tx.roleAssignment.findFirst({ where: { accountId, role: mode === 'center' ? 'DIVE_CENTER' : 'ADMIN', status: 'ACTIVE', account: { status: 'ACTIVE' } } })) throw new ForbiddenException('لا تملك صلاحية إدارة الحجوزات.');
    if (mode === 'admin') return {};
    const member = await tx.organizationMember.findFirst({ where: { accountId, status: 'ACTIVE', role: { in: ['OWNER', 'ADMIN'] }, organization: { kind: 'DIVE_CENTER', status: 'ACTIVE' } }, orderBy: { createdAt: 'asc' }, select: { organizationId: true } });
    if (!member) throw new ForbiddenException('يتطلب الإجراء إدارة مركز غوص نشط.');
    return { trip: { organizationId: member.organizationId } };
  }

  private async booking(tx: Prisma.TransactionClient, accountId: string, id: string, mode: Mode, tripId?: string, organizationId?: string) {
    const scope = await this.scope(tx, accountId, mode, organizationId);
    const row = await tx.booking.findFirst({ where: { ...scope, id, ...(tripId ? { tripId } : {}) }, include: { trip: { select: tripFields }, account: names } });
    if (!row) throw new NotFoundException('الحجز غير موجود ضمن نطاق حسابك.');
    return row;
  }

  private row(row: { id: string; tripId: string; status: string; seats: number; createdAt: Date; updatedAt: Date; trip: unknown; account: { person: { firstName: string; lastName: string } } }) {
    return { id: row.id, tripId: row.tripId, status: row.status, seats: row.seats, createdAt: row.createdAt, updatedAt: row.updatedAt, trip: row.trip, customerName: [row.account.person.firstName, row.account.person.lastName].filter(Boolean).join(' ').trim() || 'عميل' };
  }

  async listCenter(accountId: string, query: Record<string, unknown> = {}) {
    return this.listScoped(accountId, 'center', query);
  }

  async listMarineTrip(accountId: string, tripId: string, query: Record<string, unknown> = {}) {
    if (typeof tripId !== 'string' || !tripId.trim()) throw new BadRequestException('معرّف الرحلة غير صالح.');
    return this.listScoped(accountId, 'marine', query, tripId);
  }

  private async listScoped(accountId: string, mode: 'center' | 'marine', query: Record<string, unknown>, routeTripId?: string) {
    if (Object.keys(query).some(k => !['q', 'status', 'tripId', 'page', 'pageSize'].includes(k))) throw new BadRequestException('مرشحات الحجوزات غير صالحة.');
    const string = (key: string, fallback: string, max: number) => { const v = query[key] ?? fallback; if (typeof v !== 'string' || v.length > max) throw new BadRequestException('مرشحات الحجوزات غير صالحة.'); return v.trim(); };
    const q = string('q', '', 120), status = string('status', 'ALL', 20), tripId = string('tripId', '', 120);
    if (routeTripId && tripId && tripId !== routeTripId) throw new BadRequestException('معرّف الرحلة لا يطابق المسار.');
    if (!['ALL', 'PENDING', 'CONFIRMED', 'CANCELLED'].includes(status)) throw new BadRequestException('حالة الحجز غير صالحة.');
    const number = (key: string, fallback: number, max: number) => { const v = query[key]; if (v === undefined) return fallback; if (typeof v !== 'string' || !/^\d+$/.test(v) || Number(v) < 1 || Number(v) > max) throw new BadRequestException('رقم الصفحة غير صالح.'); return Number(v); };
    const requestedPage = number('page', 1, 100000), pageSize = number('pageSize', 20, 50);
    return this.db.serializable(async tx => {
      const scope = await this.scope(tx, accountId, mode);
      const selectedTripId = routeTripId || tripId;
      if (selectedTripId && !await tx.trip.findFirst({ where: { id: selectedTripId, ...(scope.trip as Prisma.TripWhereInput) } })) throw new NotFoundException(mode === 'center' ? 'الرحلة غير موجودة في المركز.' : 'الرحلة غير موجودة ضمن جهاتك البحرية.');
      const needle = q.replace(/[\\%_]/g, '\\$&');
      const where: Prisma.BookingWhereInput = { AND: [scope, ...(selectedTripId ? [{ tripId: selectedTripId }] : []), ...(q ? [{ OR: [{ id: { contains: needle, mode: 'insensitive' as const } }, { trip: { title: { contains: needle, mode: 'insensitive' as const } } }, { AND: needle.split(/\s+/).map(part => ({ account: { person: { OR: [{ firstName: { contains: part, mode: 'insensitive' as const } }, { lastName: { contains: part, mode: 'insensitive' as const } }] } } })) }] }] : [])] };
      const counts = await tx.booking.groupBy({ by: ['status'], where, _count: { _all: true }, _sum: { seats: true } });
      const filtered = { AND: [where, ...(status === 'ALL' ? [] : [{ status: status as BookingStatus }])] };
      const total = await tx.booking.count({ where: filtered }), totalPages = Math.max(1, Math.ceil(total / pageSize)), page = Math.min(requestedPage, totalPages);
      const rows = await tx.booking.findMany({ where: filtered, include: { trip: { select: tripFields }, account: names }, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], take: pageSize, skip: (page - 1) * pageSize });
      return { items: rows.map(row => this.row(row)), total, totalPages, page, pageSize, counts: counts.map(row => ({ status: row.status, count: row._count._all, seats: row._sum.seats ?? 0 })) };
    });
  }

  private async state(tx: Prisma.TransactionClient, booking: Awaited<ReturnType<BookingManagementService['booking']>>) {
    const { trip } = booking;
    const participants = await tx.bookingParticipant.findMany({ where: { bookingId: booking.id }, orderBy: { id: 'asc' }, select: { id: true, fullName: true, eligibilityStatus: true, certificationTitle: true, updatedAt: true } });
    const payments = await tx.payment.findMany({ where: { bookingId: booking.id }, orderBy: { id: 'asc' }, select: { id: true, status: true, currency: true, amountMinor: true, updatedAt: true } });
    const price = await tx.operationalSetting.findUnique({ where: { key: 'trip-price:' + trip.id }, select: { value: true, updatedAt: true } });
    const value = price?.value as Record<string, unknown> | null;
    const priceValid = Boolean(value && Number.isSafeInteger(value.pricePerSeatMinor) && Number(value.pricePerSeatMinor) >= 0 && String(value.currency).trim().toUpperCase() === 'SAR');
    const requiredAmountMinor = priceValid ? Number(value!.pricePerSeatMinor) * booking.seats : null;
    const amountValid = requiredAmountMinor !== null && Number.isSafeInteger(requiredAmountMinor) && requiredAmountMinor >= 0;
    const captured = amountValid && (requiredAmountMinor === 0 || payments.some(p => p.status === 'CAPTURED' && p.currency === 'SAR' && p.amountMinor === requiredAmountMinor));
    const safety = await tx.safetyChecklist.findFirst({ where: { tripId: trip.id }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { id: true, decision: true, updatedAt: true } });
    const confirmedSeats = (await tx.booking.aggregate({ where: { tripId: trip.id, status: 'CONFIRMED' }, _sum: { seats: true } }))._sum.seats ?? 0;
    const settings = await this.weather.settings(tx);
    const weatherRows = await tx.$queryRaw<TripWeatherReview[]>`SELECT * FROM "TripWeatherReview" WHERE "tripId"::text=${trip.id} ORDER BY "fetchedAt" DESC,"createdAt" DESC LIMIT 1`;
    const review = weatherRows[0], evaluation = this.weather.evaluateReview(review?.snapshot, review?.status, settings);
    const rules = { participant: await this.policies.decision('BOOKING', 'PARTICIPANT_ELIGIBILITY', tx), safety: await this.policies.decision('BOOKING', 'SAFETY_APPROVAL', tx), capacity: await this.policies.decision('BOOKING', 'CAPACITY_LIMIT', tx), payment: await this.policies.decision('PAYMENT', 'PAYMENT_REQUIRED', tx), weather: await this.policies.decision('WEATHER', 'WEATHER_GATE', tx) };
    const blockers: string[] = [], issues: string[] = [];
    const require = (valid: boolean, key: keyof typeof rules, code: string) => { if (!valid) { if (rules[key].enforce) blockers.push(code); else if (rules[key].review) issues.push(code); } };
    require(participants.length === booking.seats, 'participant', 'PARTICIPANT_COUNT_MISMATCH');
    require(participants.every(p => p.eligibilityStatus === 'ELIGIBLE'), 'participant', 'PARTICIPANT_ELIGIBILITY_PENDING');
    require(safety?.decision === 'ALLOWED', 'safety', 'SAFETY_APPROVAL');
    require(confirmedSeats + (booking.status === 'CONFIRMED' ? 0 : booking.seats) <= trip.capacity, 'capacity', 'CAPACITY_LIMIT');
    if (!amountValid && !rules.payment.bypass) blockers.push('PRICE_NOT_CONFIGURED');
    else require(Boolean(captured), 'payment', 'PAYMENT_REQUIRED');
    require(!evaluation.blocking, 'weather', 'WEATHER_GATE');
    const mutable = !['CANCELLED', 'COMPLETED'].includes(trip.status) && trip.startsAt > new Date() && booking.status !== 'CANCELLED';
    if (!mutable || !['OPEN', 'CLOSED'].includes(trip.status) || booking.status !== 'PENDING') blockers.push('BOOKING_NOT_PENDING_OR_TRIP_CLOSED');
    const financial: Record<string, { currency: string; status: string; count: number; amountMinor: number }> = {};
    for (const p of payments) { const key = p.currency + ':' + p.status; financial[key] ??= { currency: p.currency, status: p.status, count: 0, amountMinor: 0 }; financial[key].count++; financial[key].amountMinor += p.amountMinor; }
    const policyReview = { required: issues.length > 0, issues, states: Object.fromEntries(Object.entries(rules).map(([k, v]) => [k, v.state])), weatherGate: { ...settings, decision: evaluation.decision, reviewStatus: review?.status ?? null, forecastAt: review?.forecastAt ?? null } };
    return { stateToken: hash([booking.id, booking.status, booking.seats, booking.updatedAt, trip, participants, payments, price, safety, confirmedSeats, settings, rules, review ? [review.id, review.snapshotHash, review.status, review.reviewedAt] : null]), participants, financial: Object.values(financial), requiredAmountMinor: amountValid ? requiredAmountMinor : null, paymentSatisfied: Boolean(captured), confirmedSeats, remainingSeats: Math.max(0, trip.capacity - confirmedSeats), safetyDecision: safety?.decision ?? null, blockers, policyReview, actions: [...(!blockers.length ? ['CONFIRM'] : []), ...(mutable ? ['CANCEL'] : [])], settings };
  }

  async detail(accountId: string, id: string, mode: Mode = 'center', tripId?: string, organizationId?: string) {
    return this.db.serializable(async tx => {
      const booking = await this.booking(tx, accountId, id, mode, tripId, organizationId), { settings, ...state } = await this.state(tx, booking);
      const latest = await tx.auditEvent.findFirst({ where: { resource: 'Booking', resourceId: id, action: { in: ['BOOKING_CONFIRMED', 'BOOKING_CANCELLED', 'BOOKING_SELF_CANCELLED'] } }, orderBy: { occurredAt: 'desc' }, select: { action: true, occurredAt: true, metadata: true } });
      return { booking: this.row(booking), ...state, financialActionExecuted: false, lastAction: latest ? { action: latest.action, occurredAt: latest.occurredAt, reason: (latest.metadata as Record<string, unknown> | null)?.reason ?? null } : null };
    });
  }

  async detailForOrganization(accountId: string, organizationId: string, bookingId: string) {
    return this.db.serializable(async tx => {
      const booking = await this.booking(tx, accountId, bookingId, 'organization', undefined, organizationId), { settings: _settings, ...state } = await this.state(tx, booking);
      return { booking: this.row(booking), stateToken: state.stateToken, canCancel: state.actions.includes('CANCEL'), cancellationRequiresNoRefund: true };
    });
  }

  async detailMarineTrip(accountId: string, tripId: string, bookingId: string) {
    const detail = await this.detail(accountId, bookingId, 'marine', tripId);
    const { stateToken: _stateToken, actions: _actions, ...readOnly } = detail;
    return readOnly;
  }

  private validate(input: Record<string, unknown>) {
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k => !['action', 'requestId', 'expectedState', 'reason', 'financialAcknowledged', 'policyReviewAcknowledged'].includes(k))) throw new BadRequestException('حقول إجراء الحجز غير صالحة.');
    if (!['CONFIRM', 'CANCEL'].includes(String(input.action)) || typeof input.requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.requestId) || typeof input.expectedState !== 'string' || !/^[a-f0-9]{64}$/.test(input.expectedState)) throw new BadRequestException('حمّل تفاصيل الحجز قبل تنفيذ الإجراء.');
    if (input.reason !== undefined && (typeof input.reason !== 'string' || input.reason.trim().length > 1000)) throw new BadRequestException('سبب الإجراء غير صالح.');
    if (input.action === 'CANCEL' && (typeof input.reason !== 'string' || input.reason.trim().length < 10 || input.financialAcknowledged !== true)) throw new BadRequestException('اكتب سبب الإلغاء وأكد أن أي استرداد مالي يحتاج إجراءً منفصلًا.');
    for (const key of ['financialAcknowledged', 'policyReviewAcknowledged']) if (input[key] !== undefined && typeof input[key] !== 'boolean') throw new BadRequestException('تأكيد الإجراء غير صالح.');
    return { action: input.action as Action, requestId: input.requestId, reason: (input.reason as string | undefined)?.trim() || 'تأكيد الحجز بعد مراجعة شروطه' };
  }

  async apply(accountId: string, id: string, input: Record<string, unknown>, mode: Mode = 'center', tripId?: string, organizationId?: string) {
    const command = this.validate(input);
    if (mode === 'owner' && command.action !== 'CANCEL') throw new ForbiddenException('تأكيد الحجز متاح لإدارة المركز فقط.');
    const fingerprint = hash([accountId, mode, organizationId ?? null, id, Object.keys(input).sort().map(k => [k, input[k]])]);
    const check = async (tx: Prisma.TransactionClient) => {
      const booking = await this.booking(tx, accountId, id, mode, tripId, organizationId);
      if (mode === 'organization' && !await tx.organizationMember.findFirst({ where: { organizationId, accountId, status: 'ACTIVE', role: { in: ['OWNER', 'ADMIN'] }, organization: { status: 'ACTIVE' } }, select: { id: true } })) throw new ForbiddenException('إلغاء الحجوزات متاح لمالك الجهة أو مديرها فقط.');
      const prior = await tx.auditEvent.findFirst({ where: { resource: 'Booking', resourceId: id, action: { in: ['BOOKING_CONFIRMED', 'BOOKING_CANCELLED', 'BOOKING_SELF_CANCELLED'] }, metadata: { path: ['requestId'], equals: command.requestId } }, select: { metadata: true } });
      if (prior) { const data = prior.metadata as Record<string, unknown>; if (data.fingerprint !== fingerprint) throw new ConflictException('استُخدم طلب الحفظ ببيانات مختلفة.'); return { booking, replay: { ...(data.result as object), alreadyApplied: true } }; }
      const state = await this.state(tx, booking);
      if (state.stateToken !== input.expectedState) throw stale();
      if (!state.actions.includes(command.action)) throw new ConflictException({ message: command.action === 'CONFIRM' ? 'لا يمكن تأكيد الحجز قبل استيفاء الشروط الموضحة.' : 'لا يمكن إلغاء حجز ملغى أو رحلة بدأت أو انتهت.', blockers: state.blockers });
      if (command.action === 'CONFIRM' && state.policyReview.required && input.policyReviewAcknowledged !== true) throw new ConflictException('راجع ملاحظات السياسات قبل تأكيد الحجز.');
      return { booking, state };
    };
    const before = await this.db.serializable(check);
    if (before.replay) return before.replay;
    let weatherFailed = false;
    if (command.action === 'CONFIRM' && before.state?.settings.enabled) { try { await this.weatherReviews.refresh(accountId, before.booking.tripId); } catch { weatherFailed = true; } }
    return this.db.serializable(async tx => {
      const checked = await check(tx);
      if (checked.replay) return checked.replay;
      const { booking, state } = checked;
      if (!state) throw stale();
      if (command.action === 'CONFIRM' && weatherFailed && state.settings.enabled && state.settings.mode === 'ENFORCE' && state.policyReview.states.weather === 'ENABLED') throw new ConflictException('تعذر تحديث بيانات الطقس. أعد المحاولة بعد توفرها.');
      const status = command.action === 'CONFIRM' ? 'CONFIRMED' : 'CANCELLED';
      const updatedAt = new Date(Math.max(Date.now(), booking.updatedAt.getTime() + 1));
      if ((await tx.booking.updateMany({ where: { id, status: booking.status, updatedAt: booking.updatedAt }, data: { status, updatedAt } })).count !== 1) throw stale();
      const crewNotification = command.action === 'CONFIRM' ? await this.crew.dispatchForConfirmedBooking(booking.tripId, id, tx) : { tripId: booking.tripId, bookingId: id, notifiedCrew: 0 };
      const type = command.action === 'CONFIRM' ? 'BOOKING_CONFIRMED' : 'BOOKING_CANCELLED';
      await tx.notification.create({ data: { accountId: booking.accountId, type, status: 'SENT', sentAt: updatedAt, payload: { bookingId: id, tripId: booking.tripId, seats: booking.seats, financialActionExecuted: false, message: command.action === 'CONFIRM' ? 'تم تأكيد حجزك.' : 'أُلغي حجزك. تُراجع أي مبالغ مدفوعة عبر الإجراءات المالية؛ لم يُنفّذ استرداد تلقائي.' } } });
      const result = { id, tripId: booking.tripId, status, seats: booking.seats, updatedAt: updatedAt.toISOString(), policyReview: state.policyReview, crewNotification, financialActionExecuted: false, alreadyApplied: false };
      await this.audit.record({ actorId: accountId, action: mode === 'owner' ? 'BOOKING_SELF_CANCELLED' : type, resource: 'Booking', resourceId: id, metadata: JSON.parse(JSON.stringify({ source: mode, requestId: command.requestId, fingerprint, reason: command.reason, tripId: booking.tripId, previousStatus: booking.status, status, financial: state.financial, financialActionExecuted: false, policyReview: state.policyReview, result })) }, tx);
      return result;
    });
  }

  // Existing admin/owner routes use the same transaction and gates; their response shape remains compatible.
  async legacy(accountId: string, id: string, action: Action, mode: 'admin' | 'owner', tripId?: string) {
    const preview = await this.detail(accountId, id, mode, tripId);
    if (preview.booking.status === (action === 'CONFIRM' ? 'CONFIRMED' : 'CANCELLED')) return { ...preview.booking, alreadyApplied: true, policyReview: preview.policyReview };
    return this.apply(accountId, id, { action, requestId: randomUUID(), expectedState: preview.stateToken, reason: mode === 'owner' ? 'إلغاء الحجز بطلب صاحبه' : action === 'CONFIRM' ? 'تأكيد الحجز من الإدارة' : 'إلغاء الحجز من الإدارة', financialAcknowledged: true, policyReviewAcknowledged: true }, mode, tripId);
  }
}
