import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { protectSecret } from '../auth/mfa-crypto';
import { DatabaseService } from '../database/database.service';

const fields = ['phone', 'contactEmail', 'emergencyPhone', 'emergencyName', 'holder', 'iban', 'revision'];

function textField(value: unknown, limit: number) {
  if (typeof value !== 'string' || value.length > limit || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new BadRequestException('تحقق من الحقول المدخلة.');
  }
  return value.trim();
}

function latinDigits(value: string) {
  return value.replace(/[٠-٩۰-۹]/g, digit => String(digit.charCodeAt(0) % 16));
}

function phoneField(value: unknown) {
  const phone = latinDigits(textField(value, 40)).replace(/[ ()-]/g, '');
  if (phone && !/^\+?\d{7,15}$/.test(phone)) throw new BadRequestException('تحقق من رقم الهاتف.');
  return phone;
}

export function payoutIban(value: unknown) {
  const iban = latinDigits(textField(value, 50)).replace(/\s/g, '').toUpperCase();
  if (!/^SA\d{4}[A-Z0-9]{18}$/.test(iban)) throw new BadRequestException('أدخل آيبانًا سعوديًا صحيحًا.');
  const digits = (iban.slice(4) + iban.slice(0, 4)).replace(/[A-Z]/g, letter => String(letter.charCodeAt(0) - 55));
  let remainder = 0;
  for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97;
  if (remainder !== 1) throw new BadRequestException('تحقق من أرقام الآيبان.');
  return iban;
}

@Injectable()
export class ProviderContactService {
  constructor(private readonly db: DatabaseService) {}

  private async current(tx: Prisma.TransactionClient, accountId: string) {
    type Record = { personId: string; phone: string; contactEmail: string; emergencyPhone: string;
      emergencyName: string; holder: string; lastFour: string | null; revision: number };
    const [row] = await tx.$queryRaw<Record[]>`SELECT a."personId", COALESCE(d."primaryPhone", p.phone, '') AS phone,
      COALESCE(b."contactEmail", a.email) AS "contactEmail", COALESCE(d."emergencyPhone", '') AS "emergencyPhone",
      COALESCE(d."emergencyName", '') AS "emergencyName", COALESCE(b.holder, '') AS holder, b."lastFour", COALESCE(b.revision,0) AS revision
      FROM "Account" a JOIN "Person" p ON p.id=a."personId"
      LEFT JOIN "DiverProfile" d ON d."accountId"=a.id LEFT JOIN "ProviderPayoutProfile" b ON b."accountId"=a.id
      WHERE a.id::text=${accountId} AND a.status='ACTIVE' AND EXISTS (SELECT 1 FROM "RoleAssignment" r
        WHERE r."accountId"=a.id AND r.status='ACTIVE' AND r.role IN ('INSTRUCTOR','BOAT_OWNER'))`;
    if (!row) throw new ForbiddenException();
    const {personId, revision, ...contact} = row;
    const token = createHash('sha256').update(JSON.stringify([accountId,contact,revision])).digest('hex');
    return {personId, contact: {...contact, revision: token}};
  }

  read(accountId: string) {
    return this.db.$transaction(async tx => (await this.current(tx, accountId)).contact);
  }

  async save(accountId: string, input: Record<string, unknown>) {
    if (!input || Array.isArray(input) || Object.keys(input).some(key => !fields.includes(key))) throw new BadRequestException();
    const iban = input.iban === undefined ? null : payoutIban(input.iban);
    const holder = iban ? textField(input.holder, 160) : null;
    if (iban && !holder) throw new BadRequestException('أدخل اسم المستفيد كما هو في الحساب البنكي.');
    if (!iban && input.holder !== undefined) throw new BadRequestException('لتغيير المستفيد أدخل الآيبان مجددًا.');

    return this.db.serializable(async tx => {
      const {personId, contact} = await this.current(tx, accountId);
      if (input.revision !== contact.revision) throw new ConflictException('تغيّرت البيانات. افتح الملف مجددًا.');
      const mobile = input.phone === undefined ? contact.phone : phoneField(input.phone);
      const emergencyPhone = input.emergencyPhone === undefined ? contact.emergencyPhone : phoneField(input.emergencyPhone);
      const emergencyName = input.emergencyName === undefined ? contact.emergencyName : textField(input.emergencyName, 120);
      const email = input.contactEmail === undefined ? contact.contactEmail : textField(input.contactEmail, 254);
      if (input.contactEmail !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException('تحقق من بريد التواصل.');
      if (mobile !== contact.phone || emergencyPhone !== contact.emergencyPhone || emergencyName !== contact.emergencyName) {
        await tx.$executeRaw`INSERT INTO "DiverProfile" (id,"accountId","primaryPhone","emergencyPhone","emergencyName","createdAt","updatedAt")
          SELECT gen_random_uuid()::text, a.id, ${mobile}, ${emergencyPhone || null}, ${emergencyName || null}, NOW(), NOW()
          FROM "Account" a WHERE a.id::text=${accountId}
          ON CONFLICT ("accountId") DO UPDATE SET "primaryPhone"=EXCLUDED."primaryPhone","emergencyPhone"=EXCLUDED."emergencyPhone",
            "emergencyName"=EXCLUDED."emergencyName","updatedAt"=NOW()`;
      }
      const encrypted = iban ? protectSecret(iban, 'provider-payout:' + accountId) : null;
      await tx.$executeRaw`INSERT INTO "ProviderPayoutProfile" ("accountId","contactEmail",holder,"encryptedIban","lastFour",revision)
        SELECT a.id, ${input.contactEmail === undefined ? null : email}, ${holder}, ${encrypted}, ${iban?.slice(-4) ?? null}, 1 FROM "Account" a WHERE a.id::text=${accountId}
        ON CONFLICT ("accountId") DO UPDATE SET "contactEmail"=COALESCE(EXCLUDED."contactEmail","ProviderPayoutProfile"."contactEmail"),
        holder=COALESCE(EXCLUDED.holder,"ProviderPayoutProfile".holder),"encryptedIban"=COALESCE(EXCLUDED."encryptedIban","ProviderPayoutProfile"."encryptedIban"),
        "lastFour"=COALESCE(EXCLUDED."lastFour","ProviderPayoutProfile"."lastFour"),revision="ProviderPayoutProfile".revision+1`;
      await tx.auditEvent.create({data:{actorId:personId,action:'PROVIDER_CONTACT_UPDATED',resource:'ProviderPayoutProfile',
        resourceId:accountId,metadata:{bankDetailsUpdated:Boolean(iban)}}});
      return (await this.current(tx, accountId)).contact;
    });
  }
}
