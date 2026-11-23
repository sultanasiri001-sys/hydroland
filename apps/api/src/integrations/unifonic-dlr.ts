import { createHmac } from 'node:crypto';
import { Prisma } from '@prisma/client';

export type SmsBinding = { message: string; binding: string; reference: string };

export function smsBinding(id: unknown, correlation: unknown, recipient: unknown): SmsBinding | undefined {
  const account = process.env.UNIFONIC_SMS_DLR_ACCOUNT_ID?.trim();
  const key = process.env.HYDROLAND_WEBHOOK_SMS_SECRET;
  if (!account || !key || typeof id !== 'string' || !/^[1-9]\d*$/.test(id) ||
      typeof correlation !== 'string' || !correlation || typeof recipient !== 'string' || !/^\d{8,15}$/.test(recipient)) return;
  const hash = (...parts: string[]) => createHmac('sha256', key).update(JSON.stringify([account,...parts])).digest('hex');
  return {message:hash('message',id), binding:hash('receipt',id,correlation,recipient), reference:hash('reference',correlation)};
}

export function deliveredSms(payload: Record<string,unknown>) {
  if (payload?.productName !== 'sms' || payload.eventName !== 'dlr' ||
      payload.accountId !== process.env.UNIFONIC_SMS_DLR_ACCOUNT_ID?.trim()) return;
  const b = payload.body as Record<string,unknown> | undefined;
  if (!b || (b.finalStatus !== 'DELIVRD' && b.finalStatus !== 'DELIVERED')) return;
  const units = (v: unknown) => (typeof v === 'string' && /^\d+$/.test(v) || typeof v === 'number') ? Number(v) : NaN;
  const sent = units(b.submitUnitCount);
  if (!Number.isSafeInteger(sent) || sent < 1 || sent !== units(b.deliveredUnitCount)) return;
  return smsBinding(b.messageId,b.correlationId,b.destinationAddress);
}

// Each side may arrive first. The shared lock also covers parallel replays with different gateway event IDs.
export async function observeSms(tx: Prisma.TransactionClient, binding: SmsBinding, side: 'submission'|'dlr') {
  const resource = 'unifonic.sms';
  const where = {resource,resourceId:binding.message};
  await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${binding.message}, 0))`;
  const matches = {metadata:{path:['binding'],equals:binding.binding}};
  const add = (action:string) => tx.auditEvent.create({data:{...where,action,metadata:{binding:binding.binding,reference:binding.reference}}});
  if (!await tx.auditEvent.findFirst({where:{...where,...matches,action:side},select:{id:true}})) await add(side);
  const originals = await tx.auditEvent.count({where:{...where,action:'submission'}});
  if (originals > 1) {
    if (!await tx.auditEvent.findFirst({where:{...where,action:'ambiguous'}})) await add('ambiguous');
    return;
  }
  if (originals !== 1 || !await tx.auditEvent.findFirst({where:{...where,...matches,action:side === 'dlr'?'submission':'dlr'}})) return;
  if (!await tx.auditEvent.findFirst({where:{...where,...matches,action:'delivered'}})) await add('delivered');
}
