import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { approvedWhatsAppTemplates } from '../integrations/whatsapp-template-policy';

export const CUSTOMER_CHANNEL_POLICY = 'BOOKING_INVOICE_V1';
export const CHANNELS = ['SMS', 'WHATSAPP', 'PUSH'] as const;
export type CustomerChannel = typeof CHANNELS[number];
export type CustomerEvent = 'BOOKING_CONFIRMED' | 'INVOICE_ISSUED';
export type NoticePreference = {
  accountId: string; revision: number; email: boolean; sms: boolean; whatsapp: boolean; push: boolean;
  bookings: boolean; invoices: boolean; quietStart: number | null; quietEnd: number | null; timeZone: string;
  phoneCiphertext: string | null; phoneHash: string | null; phoneProofId: string | null; phoneVerifiedAt: Date | null;
  createdAt: Date; updatedAt: Date;
};
export type ChannelDispatch = {
  id: string; notificationId: string; accountId: string; event: CustomerEvent; sourceType: string; sourceId: string;
  channel: CustomerChannel; preferenceRevision: number; bindingId: string; state: string; reason: string | null;
  recipientHash: string | null; providerId: string | null; providerScope: string | null; submittedAt: Date | null;
  nextAttemptAt: Date; receiptChecks: number; createdAt: Date; updatedAt: Date;
};
export const identifier = (x: unknown) => {
  if (typeof x !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(x)) throw new BadRequestException('مرجع غير صالح.');
  return x;
};
export function objectInput(input: unknown, allowed: string[]): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k => !allowed.includes(k))) throw new BadRequestException('بيانات الإجراء غير صالحة.');
  return input as Record<string, unknown>;
}
export function phoneNumber(value: unknown): string {
  if (typeof value !== 'string' || !/^\+[1-9]\d{7,14}$/.test(value)) throw new BadRequestException('أدخل رقم الهاتف بصيغته الدولية، مثل +966…');
  return value;
}
export function privateDigest(purpose: string, value: string): string {
  const key = (process.env.MFA_ENCRYPTION_KEY || process.env.JWT_SECRET || '').trim();
  if (key.length < 32) throw new ServiceUnavailableException('حماية الإشعارات غير جاهزة.');
  return createHmac('sha256', key).update(JSON.stringify(['customer-channel-v1', purpose, value])).digest('hex');
}
export function preferenceInput(body: unknown) {
  const x = objectInput(body, ['expectedRevision','email','sms','whatsapp','push','bookings','invoices','quietStart','quietEnd','timeZone','confirmed']);
  if (x.confirmed !== true || !Number.isSafeInteger(x.expectedRevision) || Number(x.expectedRevision) < 0) throw new BadRequestException('راجع خياراتك وأكّد حفظها.');
  for (const k of ['email','sms','whatsapp','push','bookings','invoices']) if (typeof x[k] !== 'boolean') throw new BadRequestException('اختر قنوات وأحداث الإشعارات.');
  const validMinute = (n: unknown) => Number.isInteger(n) && Number(n) >= 0 && Number(n) < 1440;
  if (!((x.quietStart === null && x.quietEnd === null) || (validMinute(x.quietStart) && validMinute(x.quietEnd) && x.quietStart !== x.quietEnd))) throw new BadRequestException('حدّد بداية ونهاية مختلفتين لساعات الهدوء.');
  if (typeof x.timeZone !== 'string' || x.timeZone.length > 80) throw new BadRequestException('المنطقة الزمنية غير صالحة.');
  try { new Intl.DateTimeFormat('en', {timeZone:x.timeZone}).format(); } catch { throw new BadRequestException('المنطقة الزمنية غير صالحة.'); }
  return x as unknown as Pick<NoticePreference,'email'|'sms'|'whatsapp'|'push'|'bookings'|'invoices'|'quietStart'|'quietEnd'|'timeZone'> & {expectedRevision:number};
}
export function isQuiet(p: Pick<NoticePreference,'quietStart'|'quietEnd'|'timeZone'>, now = new Date()): boolean {
  if (p.quietStart === null || p.quietEnd === null) return false;
  const parts = new Intl.DateTimeFormat('en-GB', {timeZone:p.timeZone, hour:'2-digit', minute:'2-digit', hourCycle:'h23'}).formatToParts(now);
  const minute = Number(parts.find(x=>x.type==='hour')?.value) * 60 + Number(parts.find(x=>x.type==='minute')?.value);
  return p.quietStart < p.quietEnd ? minute >= p.quietStart && minute < p.quietEnd : minute >= p.quietStart || minute < p.quietEnd;
}
export const eventAllowed = (p: Pick<NoticePreference,'bookings'|'invoices'>, event: CustomerEvent) => event === 'BOOKING_CONFIRMED' ? p.bookings : p.invoices;

export function channelPolicy(channel: CustomerChannel, accountId: string, event?: CustomerEvent) {
  const prefix = `HYDROLAND_CUSTOMER_CHANNEL_${channel}_`;
  if (process.env.HYDROLAND_CUSTOMER_CHANNEL_POLICY !== CUSTOMER_CHANNEL_POLICY || process.env[prefix+'ENABLED'] !== 'true' || process.env[prefix+'PROVIDER_VERIFIED'] !== 'true') return null;
  const cap = Number(process.env[prefix+'MONTHLY_CAP_HALALAS']), cost = Number(process.env[prefix+'MAX_ATTEMPT_HALALAS']);
  if (!Number.isSafeInteger(cap) || cap < 1 || cap > 2147483647 || !Number.isSafeInteger(cost) || cost < 1 || cost > cap) return null;
  const mode = channel === 'PUSH' ? process.env[prefix+'MODE'] : process.env[`HYDROLAND_INTEGRATION_${channel}_STATUS`];
  if (!['SANDBOX','PRODUCTION_ENABLED'].includes(mode || '')) return null;
  const allowed = (process.env[prefix+'ALLOWED_ACCOUNT_IDS'] || '').split(',').map(x=>x.trim()).filter(Boolean);
  if ((mode === 'SANDBOX' && !allowed.length) || (allowed.length && !allowed.includes(accountId))) return null;
  let template: string | null = null, language: string | null = null, scope: string;
  if (channel === 'SMS') {
    scope = process.env.UNIFONIC_SMS_DLR_ACCOUNT_ID?.trim() || '';
    if (process.env.HYDROLAND_SMS_PROVIDER !== 'UNIFONIC' || !process.env.UNIFONIC_SMS_APPSID?.trim() || !process.env.UNIFONIC_SMS_SENDER_ID?.trim() || !scope || !process.env.HYDROLAND_WEBHOOK_SMS_SECRET) return null;
    if (process.env[prefix+'DLR_GATEWAY_VERIFIED'] !== 'true' || process.env[prefix+'CONTENT_APPROVED'] !== 'true') return null;
  } else if (channel === 'WHATSAPP') {
    scope = process.env.UNIFONIC_WHATSAPP_APPLICATION_ID?.trim() || '';
    language = process.env[prefix+'LANGUAGE']?.trim() || '';
    template = process.env[prefix+(event === 'INVOICE_ISSUED' ? 'INVOICE_TEMPLATE' : 'BOOKING_TEMPLATE')]?.trim() || '';
    if (process.env.HYDROLAND_WHATSAPP_PROVIDER !== 'UNIFONIC' || !scope || !process.env.UNIFONIC_WHATSAPP_PUBLIC_ID?.trim() || !process.env.UNIFONIC_WHATSAPP_SECRET?.trim() || !approvedWhatsAppTemplates().has(`${template}:${language}`)) return null;
  } else {
    scope = process.env[prefix+'PROJECT_ID']?.trim() || '';
    if (!/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(scope) || !process.env.EXPO_ACCESS_TOKEN?.trim()) return null;
  }
  return {cap,cost,scope,template,language,mode};
}
export function verificationPolicy(accountId: string, phone: string) {
  if (process.env.HYDROLAND_CUSTOMER_PHONE_VERIFICATION_ENABLED !== 'true') return null;
  const policy = channelPolicy('SMS', accountId);
  if (!policy) return null;
  const recipients = (process.env.HYDROLAND_CUSTOMER_CHANNEL_SMS_TEST_RECIPIENTS || '').split(',').map(x=>x.trim()).filter(Boolean);
  if ((policy.mode === 'SANDBOX' && !recipients.length) || (recipients.length && !recipients.includes(phone))) return null;
  return policy;
}
export function recipientAllowed(channel: CustomerChannel, destination: string, policy: NonNullable<ReturnType<typeof channelPolicy>>) {
  if (channel === 'PUSH') return true; // The current session and exact device registration are checked under lock.
  const list = (process.env[`HYDROLAND_CUSTOMER_CHANNEL_${channel}_TEST_RECIPIENTS`] || '').split(',').map(x=>x.trim()).filter(Boolean);
  return !(policy.mode === 'SANDBOX' && !list.length) && (!list.length || list.includes(destination));
}
export async function reserveChannelBudget(tx: Prisma.TransactionClient, channel: CustomerChannel, cap: number, cost: number) {
  const rows = await tx.$queryRaw<Array<{month:string}>>`
    INSERT INTO "CustomerChannelBudget"(month,channel,"reservedHalalas")
      VALUES(to_char(now() AT TIME ZONE 'Asia/Riyadh','YYYY-MM'),${channel},${cost}::int)
      ON CONFLICT (month,channel) DO UPDATE SET "reservedHalalas"="CustomerChannelBudget"."reservedHalalas"+EXCLUDED."reservedHalalas"
      WHERE "CustomerChannelBudget"."reservedHalalas" <= ${cap-cost}::int RETURNING month`;
  return rows.length === 1;
}
export async function emailPreference(tx: Prisma.TransactionClient, accountId: string, event: CustomerEvent): Promise<'ALLOW'|'SUPPRESS'|'QUIET'> {
  const [p] = await tx.$queryRaw<NoticePreference[]>`SELECT * FROM "CustomerNoticePreference" WHERE "accountId"::text=${accountId} FOR UPDATE`;
  if (!p) return 'ALLOW';
  if (!p.email || !eventAllowed(p,event)) return 'SUPPRESS';
  return isQuiet(p) ? 'QUIET' : 'ALLOW';
}
