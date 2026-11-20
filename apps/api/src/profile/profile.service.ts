import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { exportRetentionPolicy } from './export-retention-policy';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';

export type ProfileUpdate = { firstName?: string; lastName?: string; phone?: string; headline?: string; bio?: string; regionCode?: string; nationalLicenseCredentialId?: string | null; qualificationCredentialId?: string | null; eligibilityEvidenceReference?: string | null };
const profileFields = {firstName:80,lastName:80,phone:40,headline:120,bio:5000,regionCode:80,nationalLicenseCredentialId:80,qualificationCredentialId:80,eligibilityEvidenceReference:500} as const;
const nullableFields = new Set(['nationalLicenseCredentialId','qualificationCredentialId','eligibilityEvidenceReference']);

function profileUpdate(input: unknown): ProfileUpdate {
  if(!input || typeof input!=='object' || Array.isArray(input))throw new BadRequestException('بيانات الحساب غير صالحة.');
  const patch:Record<string,string|null>={};
  for(const [key,value] of Object.entries(input)){
    if(!Object.hasOwn(profileFields,key))throw new BadRequestException('حقل غير مسموح في تعديل الحساب.');
    if(value===undefined)continue;
    if(value===null&&nullableFields.has(key)){patch[key]=null;continue;}
    if(typeof value!=='string'||value.length>profileFields[key as keyof typeof profileFields]||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(value))throw new BadRequestException('قيمة غير صالحة في بيانات الحساب.');
    patch[key]=nullableFields.has(key)?value.trim()||null:value.trim();
  }
  if(!Object.keys(patch).length || patch.firstName==='')throw new BadRequestException('أدخل تعديلًا صحيحًا على بيانات الحساب.');
  return patch as ProfileUpdate;
}

type RecordDomain = 'BOOKINGS' | 'PAYMENTS' | 'SENT_MESSAGES';
type BookingRecord = { id: string; tripId: string; seats: number; status: string; createdAt: Date; updatedAt: Date };
type PaymentRecord = { id: string; bookingId: string; amountMinor: number; currency: string; status: string; createdAt: Date; updatedAt: Date };
type SentMessageRecord = { id: string; conversationId: string; kind: string; body: string | null; durationSec: number | null; createdAt: Date };

function exportCursor(value: unknown): string {
  if (value === undefined) return '';
  if (typeof value !== 'string' || value.length > 200 || /[\u0000-\u001f\u007f]/u.test(value)) {
    throw new BadRequestException('مؤشر الصفحة غير صالح.');
  }
  return value;
}

@Injectable()
export class ProfileService {
  constructor(private readonly db: DatabaseService, private readonly audit: AuditService) {}
  async get(accountId: string) {
    return this.db.account.findUniqueOrThrow({
      where: { id: accountId },
      select: {
        id: true,
        email: true,
        status: true,
        roleAssignments: {
          select: { id: true, role: true, status: true, activeAt: true, updatedAt: true },
          orderBy: { createdAt: 'asc' },
        },
        person: { select: { firstName: true, lastName: true, phone: true, professional: true } },
      },
    });
  }
  async exportAccount(accountId:string,input:unknown){
    if(input!==undefined&&(input===null||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length))throw new BadRequestException('تنزيل بيانات الحساب لا يقبل تحديد حساب آخر أو نطاق إضافي.');
    return this.db.serializable(async tx=>{
      const account=await tx.account.findUnique({where:{id:accountId},select:{
        id:true,email:true,status:true,emailVerifiedAt:true,createdAt:true,updatedAt:true,
        person:{select:{firstName:true,lastName:true,phone:true,professional:{select:{headline:true,bio:true,regionCode:true,nationalLicenseCredentialId:true,qualificationCredentialId:true,eligibilityEvidenceReference:true,createdAt:true,updatedAt:true}}}},
        roleAssignments:{select:{role:true,status:true,activeAt:true,endedAt:true,createdAt:true,updatedAt:true},orderBy:{role:'asc'}},
      }});
      if(!account||account.status!=='ACTIVE')throw new UnauthorizedException('الحساب غير متاح.');
      const snapshot={schemaVersion:'ACCOUNT_PROFILE_EXPORT_V1',exportedAt:new Date().toISOString(),scope:['ACCOUNT','PERSON','PROFESSIONAL_PROFILE','ROLE_ASSIGNMENTS'],completePlatformExport:false,retentionPolicy:exportRetentionPolicy('ACCOUNT'),excludedDomains:['BOOKINGS','PAYMENTS','MESSAGES','CREDENTIAL_FILES','DIVER_MEDICAL_AND_EMERGENCY_CONTACTS','ORGANIZATION_RECORDS'],data:account};
      const sha256=createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
      const receipt=await this.audit.record({actorId:accountId,action:'ACCOUNT_PROFILE_EXPORTED',resource:'Account',resourceId:accountId,metadata:{schemaVersion:snapshot.schemaVersion,scope:snapshot.scope,sha256}},tx);
      return {...snapshot,receipt:{auditEventId:receipt.id,sha256}};
    });
  }
  async exportTripRecords(accountId: string, input: unknown) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new BadRequestException('حدد نوع السجلات المطلوبة.');
    }
    const { domain, after } = input as Record<string, unknown>;
    if ((domain !== 'BOOKINGS' && domain !== 'PAYMENTS') ||
        Object.keys(input).some(key => key !== 'domain' && key !== 'after')) {
      throw new BadRequestException('نوع السجلات غير صالح.');
    }
    return this.exportPersonalRecords(accountId, domain, exportCursor(after));
  }

  async exportSentMessages(accountId: string, input: unknown) {
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => key !== 'after')) {
      throw new BadRequestException('طلب تصدير الرسائل غير صالح.');
    }
    return this.exportPersonalRecords(accountId, 'SENT_MESSAGES', exportCursor((input as { after?: unknown }).after));
  }

  private async exportPersonalRecords(accountId: string, domain: RecordDomain, after: string) {
    return this.db.serializable(async tx => {
      const account = await tx.account.findUnique({ where: { id: accountId }, select: { status: true } });
      if (account?.status !== 'ACTIVE') throw new UnauthorizedException('الحساب غير متاح.');
      const pageSize = 100;
      let rows: Array<BookingRecord | PaymentRecord | SentMessageRecord>;
      if (domain === 'BOOKINGS') {
        rows = await tx.$queryRaw<BookingRecord[]>`
            SELECT b."id", b."tripId", b."seats", b."status", b."createdAt", b."updatedAt"
            FROM "Booking" b
            WHERE b."accountId"::text = ${accountId} AND b."organizationId" IS NULL
              AND b."id"::text COLLATE "C" > ${after}
            ORDER BY b."id"::text COLLATE "C" LIMIT ${pageSize + 1}`;
      } else if (domain === 'PAYMENTS') {
        rows = await tx.$queryRaw<PaymentRecord[]>`
            SELECT p."id", p."bookingId", p."amountMinor", p."currency", p."status", p."createdAt", p."updatedAt"
            FROM "Payment" p JOIN "Booking" b ON b."id" = p."bookingId"
            WHERE p."accountId"::text = ${accountId} AND b."accountId"::text = ${accountId}
              AND b."organizationId" IS NULL AND p."id"::text COLLATE "C" > ${after}
            ORDER BY p."id"::text COLLATE "C" LIMIT ${pageSize + 1}`;
      } else {
        rows = await tx.$queryRaw<SentMessageRecord[]>`
          SELECT m."id", m."conversationId", m."kind", m."body", m."durationSec", m."createdAt"
          FROM "Message" m JOIN "ConversationParticipant" cp
            ON cp."conversationId" = m."conversationId" AND cp."accountId" = m."senderAccountId"
          WHERE m."senderAccountId" = (jsonb_populate_record(NULL::"Account", jsonb_build_object('id', ${accountId}::text)))."id"
            AND m."id"::text COLLATE "C" > ${after}
          ORDER BY m."id"::text COLLATE "C" LIMIT ${pageSize + 1}`;
      }
      const records = rows.slice(0, pageSize);
      const snapshot = {
        schemaVersion: domain === 'SENT_MESSAGES' ? 'PERSONAL_SENT_MESSAGES_V1' : 'PERSONAL_TRIP_RECORDS_V1',
        accountId, domain, exportedAt: new Date().toISOString(),
        retentionPolicy: exportRetentionPolicy(domain),
        completePlatformExport: false, records, nextCursor: rows.length > pageSize ? records[pageSize - 1].id : null,
      };
      const sha256 = createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
      const receipt = await this.audit.record({ actorId: accountId, action: domain === 'SENT_MESSAGES' ? 'PERSONAL_SENT_MESSAGES_EXPORTED' : 'PERSONAL_TRIP_RECORDS_EXPORTED',
        resource: 'Account', resourceId: accountId, metadata: { domain, count: records.length, sha256 } }, tx);
      return { ...snapshot, receipt: { auditEventId: receipt.id, sha256 } };
    });
  }
  async update(accountId: string, rawInput: unknown) {
    const input=profileUpdate(rawInput);
    const sourceKeys=['nationalLicenseCredentialId','qualificationCredentialId','eligibilityEvidenceReference'] as const;
    for(const key of sourceKeys){const value=input[key];if(value!==undefined&&value!==null&&(typeof value!=='string'||value.length>(key==='eligibilityEvidenceReference'?500:80)||/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(value)))throw new BadRequestException('بيانات مراجع العضوية غير صالحة.');}
    return this.db.serializable(async tx=>{
    const account=await tx.account.findUnique({where:{id:accountId},select:{personId:true,status:true}});
    if(!account||account.status!=='ACTIVE')throw new UnauthorizedException('الحساب غير متاح.');
    for(const key of ['nationalLicenseCredentialId','qualificationCredentialId'] as const){
      const value=input[key]?.trim();if(value&&!await tx.credential.findFirst({where:{id:value,personId:account.personId},select:{id:true}}))throw new BadRequestException('اختر شهادة مسجلة في حسابك.');
    }
    const sourcePatch=Object.fromEntries(sourceKeys.filter(k=>input[k]!==undefined).map(k=>[k,input[k]?.trim()||null]));
    if (input.firstName !== undefined && !input.firstName.trim()) throw new BadRequestException('First name cannot be empty.');
    const updated=await tx.account.update({
      where: { id: accountId },
      data: {
        person: {
          update: {
            firstName: input.firstName,
            lastName: input.lastName,
            phone: input.phone,
            professional: {
              upsert: {
                create: { ...sourcePatch, headline: input.headline, bio: input.bio, regionCode: input.regionCode },
                update: { ...sourcePatch, headline: input.headline, bio: input.bio, regionCode: input.regionCode }
              }
            }
          }
        }
      },
      select: { id: true, person: { include: { professional: true } } }
    });
    await this.audit.record({actorId:accountId,action:'ACCOUNT_PROFILE_CORRECTED',resource:'Account',resourceId:accountId,metadata:{changedFields:Object.keys(input).sort(),source:'SELF_SERVICE'}},tx);
    return updated;
    });
  }
}
