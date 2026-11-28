import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';

export const RETURN_STATES = ['RETURNED', 'NOT_BOARDED', 'ASSISTANCE_REQUIRED', 'TRANSFERRED'] as const;
export type ReturnState = typeof RETURN_STATES[number];
export type ReturnEntry = { kind: 'PARTICIPANT' | 'CREW'; id: string; status: ReturnState; incidentId?: string; handoverReference?: string };
export function evidenceDigest(value: unknown): string {
  const canonical = (v: any): any => v instanceof Date ? v.toISOString() : Array.isArray(v) ? v.map(canonical)
    : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => [k, canonical(v[k])])) : v;
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}
export function evidenceId(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value)) throw new BadRequestException('معرّف السجل غير صالح.');
}
export function evidenceObject(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !keys.includes(k))) throw new BadRequestException('حقول الطلب غير صالحة.');
  return value as Record<string, unknown>;
}
export function evidenceNote(value: unknown, min = 10, max = 2000): string {
  if (typeof value !== 'string' || value.trim().length < min || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value)) throw new BadRequestException('أدخل سببًا واضحًا ضمن الطول المسموح.');
  return value.trim();
}
export function returnCommand(body: unknown) {
  const b = evidenceObject(body, ['requestId', 'expectedRevision', 'expectedState', 'observedAt', 'reason', 'entries']);
  evidenceId(b.requestId);
  if (!Number.isSafeInteger(b.expectedRevision) || Number(b.expectedRevision) < 0 || typeof b.expectedState !== 'string' || !/^[a-f0-9]{64}$/.test(b.expectedState)) throw new BadRequestException('حدّث حصر الرحلة قبل الحفظ.');
  if (typeof b.observedAt !== 'string' || !Number.isFinite(Date.parse(b.observedAt)) || new Date(b.observedAt).toISOString() !== b.observedAt) throw new BadRequestException('وقت الحصر غير صالح.');
  if (!Array.isArray(b.entries) || !b.entries.length || b.entries.length > 2000) throw new BadRequestException('حدد حالة جميع المشاركين والطاقم.');
  const entries: ReturnEntry[] = b.entries.map(value => {
    const e = evidenceObject(value, ['kind', 'id', 'status', 'incidentId', 'handoverReference']); evidenceId(e.id);
    if (typeof e.kind !== 'string' || !['PARTICIPANT', 'CREW'].includes(e.kind) || !RETURN_STATES.includes(e.status as ReturnState)) throw new BadRequestException('حالة الشخص في الحصر غير صالحة.');
    if (e.incidentId !== undefined) evidenceId(e.incidentId);
    if (e.handoverReference !== undefined) evidenceNote(e.handoverReference, 3, 240);
    if (e.status === 'TRANSFERRED' && (!e.incidentId || !e.handoverReference)) throw new BadRequestException('وثّق البلاغ ومرجع التسليم لمن نُقلت مسؤوليته.');
    if (!['TRANSFERRED', 'ASSISTANCE_REQUIRED'].includes(String(e.status)) && (e.incidentId !== undefined || e.handoverReference !== undefined)) throw new BadRequestException('مرجع المساعدة أو التسليم لا ينطبق على هذه الحالة.');
    return { kind: e.kind as ReturnEntry['kind'], id: e.id, status: e.status as ReturnState,
      ...(e.incidentId ? { incidentId: e.incidentId as string } : {}), ...(e.handoverReference ? { handoverReference: (e.handoverReference as string).trim() } : {}) };
  }).sort((a, z) => (a.kind + a.id).localeCompare(z.kind + z.id));
  if (new Set(entries.map(e => e.kind + ':' + e.id)).size !== entries.length) throw new BadRequestException('لا تكرر شخصًا في الحصر.');
  return { requestId: b.requestId, expectedRevision: Number(b.expectedRevision), expectedState: b.expectedState,
    observedAt: b.observedAt, reason: evidenceNote(b.reason), entries };
}
