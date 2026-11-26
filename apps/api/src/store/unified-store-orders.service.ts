import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UnifiedStoreOrderLine } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { requireCourseContract } from '../commerce/course-contract';
import { tripBookingPaymentRequirement } from '../commerce/trip-booking-contract';
import { rentalStatus } from '../trips/equipment-rental-hold';
import { EquipmentRentalService } from '../trips/equipment-rental.service';
import { TripsService } from '../trips/trips.service';
import { priceActivity } from './activity-promotions';
import { StoreOfferingsService } from './store-offerings.service';
import { StoreService } from './store.service';
import { requireStoreCheckoutContract, storeContractHash, storeObject } from './store-checkout-contract';
import { unifiedLineFinance } from './unified-store-order-finance';

type Tx = Prisma.TransactionClient;
type Price = { expectedUnitPriceMinor?: number };
type Goods = Price & { kind: 'GOODS'; productId: string; quantity: number };
type Trip = Price & { kind: 'TRIP'; tripId: string; seats: number };
type Course = Price & { kind: 'COURSE'; courseId: string };
type Rental = Price & { kind: 'RENTAL'; resourceId: string; scheduledHandoverAt: string; dueAt: string };
type Item = Goods | Trip | Course | Rental;
type CreateInput = { requestId: string; items: Item[] };
type Order = Prisma.UnifiedStoreOrderGetPayload<{ include: { lines: true } }>;
type LineInput = Omit<Prisma.UnifiedStoreOrderLineCreateWithoutOrderInput, 'id'>;
type RentalOffer = { resourceId: string; organizationId: string; profile: unknown };
const maxMinor = 2_147_483_647;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const identifier = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 128 && value.trim() === value;
const json = (value: unknown) => value as Prisma.InputJsonObject;

function fields(value: unknown, allowed: string[]) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !allowed.includes(key))) {
    throw new BadRequestException('حقول الطلب الموحّد غير صالحة.');
  }
}

function timestamp(value: unknown) {
  const match = typeof value === 'string' && /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match) throw new BadRequestException('أدخل موعد التسليم والإرجاع مع المنطقة الزمنية.');
  const [, year, month, day, hour, minute, second, zone] = match;
  const calendar = new Date(`${year}-${month}-${day}T00:00:00Z`);
  if (calendar.getUTCFullYear() !== Number(year) || calendar.getUTCMonth() + 1 !== Number(month) || calendar.getUTCDate() !== Number(day)
    || Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59
    || zone !== 'Z' && (Number(zone.slice(1, 3)) > 14 || Number(zone.slice(4)) > 59 || Number(zone.slice(1, 3)) === 14 && Number(zone.slice(4)) !== 0)) {
    throw new BadRequestException('موعد التأجير غير صالح.');
  }
  return new Date(value as string).toISOString();
}

function parseInput(raw: unknown): CreateInput {
  fields(raw, ['requestId', 'items']);
  const body = raw as Record<string, unknown>;
  if (typeof body.requestId !== 'string' || !uuid.test(body.requestId) || !Array.isArray(body.items) || body.items.length < 1 || body.items.length > 50) {
    throw new BadRequestException('أرسل معرّف طلب ثابتًا وسلة تحتوي على عنصر واحد إلى ٥٠ عنصرًا.');
  }
  const seen = new Set<string>();
  const items = body.items.map(value => {
    const rawItem = storeObject(value), kind = rawItem.kind;
    const keys = kind === 'GOODS' ? ['productId', 'quantity'] : kind === 'TRIP' ? ['tripId', 'seats']
      : kind === 'COURSE' ? ['courseId'] : kind === 'RENTAL' ? ['resourceId', 'scheduledHandoverAt', 'dueAt'] : null;
    if (!keys) throw new BadRequestException('اختر نوع العرض الأصلي للسلعة أو الرحلة أو الدورة أو التأجير.');
    fields(value, ['kind', 'expectedUnitPriceMinor', ...keys]);
    if (!identifier(rawItem[keys[0]])) throw new BadRequestException('معرّف العرض غير صالح.');
    const price = rawItem.expectedUnitPriceMinor;
    if (price !== undefined && (!Number.isSafeInteger(price) || price < 0 || price > maxMinor)) throw new BadRequestException('السعر المعروض غير صالح.');
    const identity = `${kind}:${rawItem[keys[0]]}`;
    if (seen.has(identity)) throw new BadRequestException('ادمج الكمية أو المقاعد قبل إرسال العرض نفسه مرتين.');
    seen.add(identity);
    if (kind === 'GOODS' && (!Number.isSafeInteger(rawItem.quantity) || rawItem.quantity < 1 || rawItem.quantity > maxMinor)
      || kind === 'TRIP' && (!Number.isSafeInteger(rawItem.seats) || rawItem.seats < 1 || rawItem.seats > maxMinor)) {
      throw new BadRequestException('الكمية أو المقاعد يجب أن تكون عددًا صحيحًا موجبًا.');
    }
    return { ...rawItem, ...(kind === 'RENTAL' ? { scheduledHandoverAt: timestamp(rawItem.scheduledHandoverAt), dueAt: timestamp(rawItem.dueAt) } : {}) } as Item;
  });
  items.sort((a, b) => storeContractHash(a).localeCompare(storeContractHash(b)));
  return { requestId: body.requestId.toLowerCase(), items };
}

/** One customer order groups native sources; it never owns a payment or money balance. */
@Injectable()
export class UnifiedStoreOrdersService {
  constructor(private readonly db: DatabaseService, private readonly store: StoreService,
    private readonly offers: StoreOfferingsService, private readonly trips: TripsService, private readonly rentals: EquipmentRentalService) {}

  private async actor(tx: Tx, accountId: string) {
    const actor = await tx.account.findFirst({ where: { id: accountId, status: 'ACTIVE' }, select: { id: true, personId: true } });
    if (!actor) throw new ForbiddenException('يتطلب الطلب حسابًا نشطًا.');
    return actor;
  }

  private price(expected: number | undefined, actual: unknown) {
    if (!Number.isSafeInteger(actual) || Number(actual) < 0 || Number(actual) > maxMinor) {
      throw new ConflictException('السعر الأصلي غير جاهز للطلب.');
    }
    if (expected !== undefined && expected !== actual) throw new ConflictException('تغير سعر العرض. حدّث المتجر وراجع السعر قبل إنشاء الطلب.');
  }

  private line(kind: Item['kind'], sourceType: string, sourceId: string, snapshot: Record<string, any>, title: string): LineInput {
    const organizationId = snapshot.organizationId ?? storeObject(snapshot.issuer).organizationId;
    this.price(undefined, snapshot.amountMinor);
    if (!identifier(organizationId) || snapshot.currency !== 'SAR') throw new ConflictException('المركز المورّد أو العملة الأصلية غير جاهزين.');
    return { kind, sourceType, sourceId, organizationId, title, amountMinor: snapshot.amountMinor, currency: 'SAR',
      contractSnapshot: json(snapshot), contractHash: storeContractHash(snapshot) };
  }

  async create(accountId: string, raw: unknown) {
    const input = parseInput(raw), fingerprint = storeContractHash({ version: 'UNIFIED_STORE_ORDER_V1', accountId, items: input.items });
    const goods = input.items.filter((item): item is Goods => item.kind === 'GOODS');
    const trips = input.items.filter((item): item is Trip => item.kind === 'TRIP');
    const courses = input.items.filter((item): item is Course => item.kind === 'COURSE');
    const rentals = input.items.filter((item): item is Rental => item.kind === 'RENTAL');
    // Only occurrence identity/time survives retries. Supplier grouping, catalog,
    // prices, policies and all availability/authority guards are read in each attempt.
    const goodsOccurrences = new Map(goods.map(item => [item.productId, this.store.createOrderOccurrence([item])]));
    const tripOccurrences = new Map(trips.map(item => [item.tripId, this.trips.createBookingOccurrence()]));
    const courseOccurrences = new Map(courses.map(item => [item.courseId, this.offers.createEnrollmentOccurrence()]));
    const rentalOccurrences = new Map(rentals.map(item => [item.resourceId, this.rentals.createOccurrence([item])]));
    const orderId = randomUUID(), createdAt = new Date();
    const lineIds = new Map([
      ...[...goodsOccurrences.values()].map(value => value.orderId),
      ...[...tripOccurrences.values()].map(value => value.id),
      ...[...courseOccurrences.values()].map(value => value.enrollmentId),
      ...[...rentalOccurrences.values()].map(value => value.rentalId),
    ].map(sourceId => [sourceId, randomUUID()]));
    const work = (replayOnly = false) => this.db.serializable(async tx => {
      const actor = await this.actor(tx, accountId);
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${`unified-store:${accountId}:${input.requestId}`},0))`;
      const previous = await tx.unifiedStoreOrder.findUnique({ where: { accountId_requestId: { accountId, requestId: input.requestId } }, include: { lines: true } });
      if (previous) {
        if (previous.requestFingerprint !== fingerprint) throw new ConflictException('استُخدم معرّف الطلب لسلة مختلفة.');
        return this.present(tx, previous, true);
      }
      if (replayOnly) throw new ConflictException('تغير أحد الحجوزات بالتزامن. حدّث الطلب قبل المحاولة.');
      const lines: LineInput[] = [];
      if (goods.length) {
        const products = await tx.storeProduct.findMany({ where: { id: { in: goods.map(item => item.productId) }, kind: 'GOODS', status: 'ACTIVE',
          organization: { kind: 'DIVE_CENTER', status: 'ACTIVE' } }, select: { id: true, organizationId: true } });
        if (products.length !== goods.length) throw new NotFoundException('إحدى السلع غير متاحة لدى مركز نشط.');
        const grouped = new Map<string, Goods[]>();
        for (const item of goods) {
          const supplier = products.find(product => product.id === item.productId)!.organizationId!;
          grouped.set(supplier, [...(grouped.get(supplier) ?? []), item]);
        }
        for (const [supplier, items] of [...grouped].sort(([a], [b]) => a.localeCompare(b))) {
          items.sort((a, b) => a.productId.localeCompare(b.productId));
          const occurrence = { ...goodsOccurrences.get(items[0].productId)!,
            itemIds: new Map(items.flatMap(item => [...goodsOccurrences.get(item.productId)!.itemIds])) };
          const order = await this.store.createOrderInTransaction(tx, accountId, items, occurrence);
          const snapshot = requireStoreCheckoutContract({ ...order, payment: null });
          if (snapshot.organizationId !== supplier) throw new ConflictException('تغير المركز المورّد للسلع.');
          lines.push(this.line('GOODS', 'STORE_ORDER', order.id, snapshot, snapshot.lines.map(item => item.title).join(' · ')));
        }
      }

      for (const item of [...trips].sort((a, b) => a.tripId.localeCompare(b.tripId))) {
        await tx.$queryRaw`SELECT "id" FROM "Trip" WHERE "id"::text=${item.tripId} FOR UPDATE`;
        const booking = await this.trips.bookInTransaction(tx, accountId, item.tripId, item.seats, tripOccurrences.get(item.tripId)!);
        const requirement = tripBookingPaymentRequirement(booking), snapshot = storeObject(booking.contractSnapshot);
        if (requirement.source !== 'SNAPSHOT' || requirement.requiredAmountMinor === null) throw new ConflictException('راجع السعر والسياسة الأصليين للرحلة.');
        this.price(item.expectedUnitPriceMinor, snapshot.unitPriceMinor);
        lines.push(this.line('TRIP', 'TRIP_BOOKING', booking.id, snapshot, snapshot.title));
      }

      for (const item of [...courses].sort((a, b) => a.courseId.localeCompare(b.courseId))) {
        await tx.$queryRaw`SELECT "id" FROM "StoreCourseOffer" WHERE "id"::text=${item.courseId} FOR UPDATE`;
        const existing = await tx.trainingEnrollment.findFirst({ where: { storeCourseOfferId: item.courseId, studentAccountId: accountId, status: { not: 'CANCELLED' } }, select: { id: true } });
        if (existing) throw new ConflictException('لديك تسجيل قائم في هذه الدورة. تابع تسجيلك الأصلي.');
        const enrollment = await this.offers.enrollInTransaction(tx, accountId, item.courseId, courseOccurrences.get(item.courseId)!), snapshot = requireCourseContract(enrollment, true);
        this.price(item.expectedUnitPriceMinor, snapshot.unitPriceMinor);
        lines.push(this.line('COURSE', 'TRAINING_ENROLLMENT', enrollment.id, snapshot, snapshot.title));
      }

      if (rentals.length) {
        const ids = rentals.map(item => item.resourceId).sort();
        const assets = await tx.$queryRaw<RentalOffer[]>`SELECT b."resourceId", b."organizationId"::text AS "organizationId", s.value AS profile
          FROM "EquipmentBarcode" b JOIN "CalendarResource" r ON r.id=b."resourceId"
          JOIN "Organization" o ON o.id::text=b."organizationId"::text
          JOIN "OperationalSetting" s ON s.key=('store-rental-rate:'||b."resourceId"::text)
          WHERE b."resourceId"=ANY(${ids}::text[]) AND r.active=true AND b."stockStatus"='AVAILABLE'
            AND o.status='ACTIVE' AND o.kind='DIVE_CENTER'
          ORDER BY b."resourceId" FOR UPDATE OF b`;
        if (assets.length !== rentals.length) throw new NotFoundException('إحدى معدات التأجير غير متاحة.');
        const groups = new Map<string, Array<Rental & { priceMinor: number }>>();
        for (const item of rentals) {
          const asset = assets.find(row => row.resourceId === item.resourceId)!, profile = storeObject(asset.profile);
          if (profile.published !== true || profile.organizationId !== asset.organizationId) throw new ConflictException('عرض التأجير غير منشور.');
          this.price(undefined, profile.baseMinor);
          const priceMinor = priceActivity(profile.baseMinor, profile.sale).priceMinor;
          this.price(item.expectedUnitPriceMinor, priceMinor);
          const key = `${asset.organizationId}:${item.scheduledHandoverAt}:${item.dueAt}`;
          groups.set(key, [...(groups.get(key) ?? []), { ...item, priceMinor }]);
        }
        for (const [, items] of [...groups].sort(([a], [b]) => a.localeCompare(b))) {
          items.sort((a, b) => a.resourceId.localeCompare(b.resourceId));
          const occurrence = { ...rentalOccurrences.get(items[0].resourceId)!,
            itemIds: new Map(items.flatMap(item => [...rentalOccurrences.get(item.resourceId)!.itemIds])) };
          const rental = await this.rentals.createInTransaction(tx, accountId, { renterAccountId: accountId,
            scheduledHandoverAt: items[0].scheduledHandoverAt, dueAt: items[0].dueAt,
            items: items.map(item => ({ resourceId: item.resourceId, unitPriceSar: item.priceMinor / 100 })) }, occurrence, { publishedOnly: true });
          const snapshot = storeObject(rental.contractSnapshot);
          // The native helper re-prices inside the same transaction; a promotion boundary requires renewed consent.
          for (const item of items) {
            const original = snapshot.lines.find((row: Record<string, unknown>) => row.resourceId === item.resourceId);
            this.price(item.priceMinor, original?.amountMinor);
          }
          lines.push(this.line('RENTAL', 'EQUIPMENT_RENTAL', rental.id, snapshot, snapshot.lines.map((row: Record<string, unknown>) => row.equipmentName).join(' · ')));
        }
      }
      const totalMinor = lines.reduce((sum, line) => sum + line.amountMinor, 0);
      if (!Number.isSafeInteger(totalMinor) || totalMinor > maxMinor) throw new BadRequestException('إجمالي الطلب يتجاوز الحد المسموح.');
      const order = await tx.unifiedStoreOrder.create({ data: { id: orderId, createdAt, accountId, requestId: input.requestId,
        requestFingerprint: fingerprint, totalMinor, currency: 'SAR', lines: { create: lines.map(line => ({ id: lineIds.get(line.sourceId)!, ...line })) } }, include: { lines: true } });
      await tx.auditEvent.create({ data: { actorId: actor.personId, action: 'UNIFIED_STORE_ORDER_CREATED', resource: 'UnifiedStoreOrder', resourceId: order.id,
        metadata: { accountId, requestId: input.requestId, requestFingerprint: fingerprint, totalMinor, currency: 'SAR',
          sources: lines.map(({ sourceType, sourceId, amountMinor }) => ({ sourceType, sourceId, amountMinor })), financialActionExecuted: false } } });
      return this.present(tx, order, false);
    });
    try { return await work(); }
    catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return work(true);
      throw error;
    }
  }

  async list(accountId: string) {
    return this.db.serializable(async tx => {
      await this.actor(tx, accountId);
      const rows = await tx.unifiedStoreOrder.findMany({ where: { accountId }, include: { lines: true }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 50 });
      return { items: await Promise.all(rows.map(row => this.present(tx, row))) };
    });
  }

  async get(accountId: string, id: string) {
    if (!identifier(id)) throw new BadRequestException('معرّف الطلب غير صالح.');
    return this.db.serializable(async tx => {
      await this.actor(tx, accountId);
      const order = await tx.unifiedStoreOrder.findFirst({ where: { id, accountId }, include: { lines: true } });
      if (!order) throw new NotFoundException('الطلب غير متاح لهذا الحساب.');
      return this.present(tx, order);
    });
  }

  private async present(tx: Tx, order: Order, alreadyCreated = false) {
    const lines = await Promise.all(order.lines.map(line => this.presentLine(tx, order.accountId, line)));
    const sum = (key: 'capturedMinor' | 'remainingMinor' | 'refundedMinor' | 'netCollectedMinor') =>
      lines.some(line => line[key] === null) ? null : lines.reduce((total, line) => total + line[key]!, 0);
    return { id: order.id, requestId: order.requestId, createdAt: order.createdAt, currency: order.currency, totalMinor: order.totalMinor,
      paymentMode: 'PER_SOURCE', financialActionExecuted: false, alreadyCreated,
      paidMinor: sum('capturedMinor'), remainingMinor: sum('remainingMinor'), refundedMinor: sum('refundedMinor'), netCollectedMinor: sum('netCollectedMinor'),
      financialReviewRequired: lines.some(line => line.financialReviewRequired), refundPending: lines.some(line => line.refundPending), lines };
  }

  private async presentLine(tx: Tx, accountId: string, line: UnifiedStoreOrderLine) {
    const base = { id: line.id, kind: line.kind, sourceType: line.sourceType, sourceId: line.sourceId, organizationId: line.organizationId,
      title: line.title, amountMinor: line.amountMinor, currency: line.currency, contractSnapshot: line.contractSnapshot, contractHash: line.contractHash };
    let status: string, paymentStatus = 'NOT_STARTED', paymentId: string | null = null, sourcePaymentStatus: string | null = null, currentContract: unknown;
    const id = encodeURIComponent(line.sourceId), actions: Record<string, string | null> = {};
    if (line.sourceType === 'STORE_ORDER') {
      const row = await tx.storeOrder.findFirst({ where: { id: line.sourceId, accountId }, include: { items: true, payment: true } });
      if (!row) throw new ConflictException('مصدر السلع الأصلي يحتاج مراجعة.');
      status = row.status; paymentStatus = row.payment?.status ?? 'NOT_STARTED'; paymentId = row.payment?.id ?? null;
      currentContract = requireStoreCheckoutContract(row);
      Object.assign(actions, { quote: `/store/orders/${id}/quote`, checkout: `/store/orders/${id}/checkout`, refresh: `/store/orders/${id}/refresh` });
    } else if (line.sourceType === 'TRIP_BOOKING') {
      const row = await tx.booking.findFirst({ where: { id: line.sourceId, accountId, organizationId: null }, include: { payments: { orderBy: { createdAt: 'desc' } } } });
      if (!row) throw new ConflictException('حجز الرحلة الأصلي يحتاج مراجعة.');
      const collected = row.payments.filter(payment => ['CAPTURED', 'REFUNDED'].includes(payment.status));
      const payment = collected.length === 1 ? collected[0] : row.payments[0];
      status = row.status; paymentStatus = payment?.status ?? (line.amountMinor === 0 ? 'NOT_REQUIRED' : 'NOT_STARTED');
      paymentId = payment?.id ?? null; currentContract = row.contractSnapshot;
      Object.assign(actions, { quote: `/payments/bookings/${id}/quote`, checkout: '/payments',
        refresh: paymentId ? `/payments/${encodeURIComponent(paymentId)}/refresh` : null, cancel: `/trips/bookings/${id}/cancel` });
    } else if (line.sourceType === 'TRAINING_ENROLLMENT') {
      const row = await tx.trainingEnrollment.findFirst({ where: { id: line.sourceId, studentAccountId: accountId } });
      if (!row) throw new ConflictException('تسجيل الدورة الأصلي يحتاج مراجعة.');
      status = row.status; currentContract = requireCourseContract(row, true);
      const checkout = await tx.commerceCheckout.findUnique({ where: { sourceType_sourceId: { sourceType: line.sourceType, sourceId: line.sourceId } } });
      paymentStatus = checkout?.status ?? (line.amountMinor === 0 ? 'NOT_REQUIRED' : 'NOT_STARTED'); paymentId = checkout?.id ?? null;
      Object.assign(actions, { quote: `/payments/courses/${id}/quote`, checkout: `/payments/courses/${id}/checkout`,
        refresh: `/payments/courses/${id}/refresh`, cancel: `/payments/courses/${id}/cancellation` });
    } else if (line.sourceType === 'EQUIPMENT_RENTAL') {
      const [row] = await tx.$queryRaw<Array<{ status: string; paymentStatus: string; holdExpiresAt: Date | null; contractSnapshot: unknown }>>`
        SELECT "status","paymentStatus","holdExpiresAt","contractSnapshot" FROM "EquipmentRental" WHERE "id"=${line.sourceId} AND "renterAccountId"=${accountId}`;
      if (!row) throw new ConflictException('طلب التأجير الأصلي يحتاج مراجعة.');
      status = rentalStatus(row); sourcePaymentStatus = row.paymentStatus; currentContract = row.contractSnapshot;
      const checkout = await tx.commerceCheckout.findUnique({ where: { sourceType_sourceId: { sourceType: line.sourceType, sourceId: line.sourceId } } });
      paymentStatus = checkout?.status ?? row.paymentStatus; paymentId = checkout?.id ?? null;
      Object.assign(actions, { quote: `/payments/rentals/${id}/quote`, checkout: `/payments/rentals/${id}/checkout`,
        refresh: `/payments/rentals/${id}/refresh`, cancel: `/trips/equipment-rentals/${id}/mine/cancel` });
    } else throw new ConflictException('نوع مصدر الطلب غير صالح.');
    const unchanged = storeContractHash(line.contractSnapshot) === line.contractHash && storeContractHash(currentContract) === line.contractHash;
    const finances = await unifiedLineFinance(tx, accountId, line, paymentStatus, paymentId, unchanged);
    return { ...base, status, paymentStatus, paymentId, sourcePaymentStatus, ...finances,
      sourceReviewRequired: !unchanged, actions: unchanged ? actions : {} };
  }
}
