import { PrivacyGrievanceService } from '../customer-service/privacy-grievance.service';
import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';

type RequestInput = {
  requestKey: string; kind: 'CORRECTION' | 'ERASURE'; domain: 'ACCOUNT' | 'BOOKINGS' | 'PAYMENTS' | 'SENT_MESSAGES';
  recordRef: string | null; routingCenterId: string | null; details: string;
};
type Receipt = Omit<RequestInput, 'requestKey'> & { id: string; status: string; createdAt: Date };
const receiptFields = Prisma.sql`"id","kind","domain","recordRef","routingCenterId","details","status","createdAt","decisionDisposition","initialDisposition","executionAuditId"`;

function parse(input: unknown): RequestInput {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new BadRequestException('راجع بيانات الطلب.');
  const x = input as Record<string, unknown>;
  if (Object.keys(x).some(k => !['requestKey','kind','domain','recordRef','details','centerId'].includes(k)) ||
      typeof x.requestKey !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x.requestKey) ||
      (x.kind !== 'CORRECTION' && x.kind !== 'ERASURE') ||
      (x.domain !== 'ACCOUNT' && x.domain !== 'BOOKINGS' && x.domain !== 'PAYMENTS' && x.domain !== 'SENT_MESSAGES'))
    throw new BadRequestException('نوع الطلب أو نطاقه غير صالح.');
  if (typeof x.details !== 'string' || x.details.trim().length > 1000 || (x.kind === 'CORRECTION' && !x.details.trim()) ||
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(x.details))
    throw new BadRequestException('راجع وصف الطلب، بحد أقصى ١٠٠٠ حرف.');
  const center = x.centerId ?? null;
  if (center !== null && (typeof center !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(center))) throw new BadRequestException('المركز غير صالح.');
  const ref = x.recordRef ?? null;
  if (ref !== null && (x.domain === 'ACCOUNT' || typeof ref !== 'string' || !ref.trim() || ref.length > 200 || /[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(ref)))
    throw new BadRequestException('مرجع السجل غير صالح.');
  return { routingCenterId: typeof center === 'string' ? center : null, requestKey:x.requestKey.toLowerCase(), kind:x.kind, domain:x.domain, recordRef:typeof ref === 'string' ? ref.trim() : null, details:x.details.trim() };
}

async function verifyRecord(tx: Prisma.TransactionClient, actor: string, input: RequestInput) {
  if (!input.recordRef) return;
  const ref = input.recordRef;
  const query = input.domain === 'BOOKINGS' ? Prisma.sql`
    SELECT 1 FROM "Booking" WHERE id::text=${ref} AND "accountId"::text=${actor} AND "organizationId" IS NULL`
    : input.domain === 'PAYMENTS' ? Prisma.sql`
    SELECT 1 FROM "Payment" p JOIN "Booking" b ON b.id=p."bookingId"
    WHERE p.id::text=${ref} AND p."accountId"::text=${actor} AND b."accountId"::text=${actor} AND b."organizationId" IS NULL`
    : Prisma.sql`
    SELECT 1 FROM "Message" m JOIN "ConversationParticipant" cp
      ON cp."conversationId"=m."conversationId" AND cp."accountId"=m."senderAccountId"
    WHERE m.id::text=${ref} AND m."senderAccountId"::text=${actor}`;
  if (!(await tx.$queryRaw<unknown[]>(query)).length) throw new NotFoundException('السجل غير متاح في بيانات حسابك.');
}

@Injectable()
export class PersonalDataRequestsService {
  constructor(private readonly db: DatabaseService, private readonly audit: AuditService, private readonly grievances: PrivacyGrievanceService) {}

  centers(actor: string) { return this.grievances.availableCenters(actor); }

  private async requireActive(tx: Prisma.TransactionClient, actor: string) {
    const row = await tx.account.findUnique({where:{id:actor},select:{status:true}});
    if (row?.status !== 'ACTIVE') throw new UnauthorizedException();
  }

  list(actor: string, page: number) {
    if (!Number.isInteger(page) || page < 1 || page > 100000) throw new BadRequestException('رقم الصفحة غير صالح.');
    return this.db.serializable(async tx => {
      await this.requireActive(tx, actor);
      const rows = await tx.$queryRaw<Receipt[]>`SELECT ${receiptFields} FROM "PersonalDataRequest"
        WHERE "accountId"::text=${actor} ORDER BY "createdAt" DESC,id DESC LIMIT 21 OFFSET ${(page-1)*20}`;
      return {items: rows.slice(0,20), more: rows.length > 20};
    });
  }

  submit(actor: string, raw: unknown) {
    const input = parse(raw);
    return this.db.serializable(async tx => {
      await this.requireActive(tx, actor);
      const existing = () => tx.$queryRaw<Receipt[]>`SELECT ${receiptFields} FROM "PersonalDataRequest"
        WHERE "accountId"::text=${actor} AND "requestKey"=${input.requestKey}`;
      const replay = (row: Receipt) => {
        if (row.kind !== input.kind || row.domain !== input.domain || row.recordRef !== input.recordRef || row.details !== input.details || (input.routingCenterId !== null && row.routingCenterId !== input.routingCenterId))
          throw new ConflictException('استُخدم رقم المحاولة لطلب مختلف.');
        return row;
      };
      const [previous] = await existing();
      if (previous) return replay(previous);
      await verifyRecord(tx, actor, input);
      const routingCenter = await this.grievances.resolveRoutingCenter(tx,actor,input.routingCenterId);
      const [receipt] = await tx.$queryRaw<Receipt[]>`INSERT INTO "PersonalDataRequest"
        ("id","accountId","requestKey","kind","domain","recordRef","details","routingCenterId")
        SELECT ${randomUUID()},id,${input.requestKey},${input.kind},${input.domain},${input.recordRef},${input.details},${routingCenter}
        FROM "Account" WHERE id::text=${actor} AND status='ACTIVE'
        ON CONFLICT ("accountId","requestKey") DO NOTHING RETURNING ${receiptFields}`;
      if (!receipt) {
        const [duplicate] = await existing();
        if (!duplicate) throw new ConflictException('تعذر تثبيت الطلب. أعد المحاولة بالرقم نفسه.');
        return replay(duplicate);
      }
      if (routingCenter) await this.grievances.routePersonalRequest(tx,actor,routingCenter,receipt);
      await this.audit.record({actorId:actor,action:'PERSONAL_DATA_REQUEST_RECEIVED',resource:'PersonalDataRequest',
        resourceId:receipt.id,metadata:{kind:input.kind,domain:input.domain}},tx);
      return receipt;
    });
  }
}
