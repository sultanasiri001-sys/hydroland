import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';

export type AssetSourceKind = 'EQUIPMENT' | 'MARINE';
export type PassportAction = 'ISSUE' | 'UPDATE' | 'REVOKE';
export type PassportCommand = { requestId: string; expectedVersion: number; sourceDigest?: string; reason?: string };
export const passportDigest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function passportSource(kind: string, id: string): AssetSourceKind {
  if (!['EQUIPMENT', 'MARINE'].includes(kind) || !/^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,119}$/.test(id)) {
    throw new BadRequestException('Invalid native asset reference.');
  }
  return kind as AssetSourceKind;
}

export function passportCommand(body: unknown, action: PassportAction): PassportCommand {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new BadRequestException('Passport command required.');
  const value = body as Record<string, unknown>;
  const keys = action === 'REVOKE' ? ['requestId', 'expectedVersion', 'reason'] : ['requestId', 'expectedVersion', 'sourceDigest'];
  if (Object.keys(value).some(key => !keys.includes(key))) throw new BadRequestException('Unexpected passport command field.');
  if (typeof value.requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.requestId)) {
    throw new BadRequestException('A new requestId is required.');
  }
  if (!Number.isSafeInteger(value.expectedVersion) || Number(value.expectedVersion) < 0) throw new BadRequestException('Current passport version required.');
  if (action !== 'REVOKE' && (typeof value.sourceDigest !== 'string' || !/^[0-9a-f]{64}$/.test(value.sourceDigest))) {
    throw new BadRequestException('Current source digest required.');
  }
  if (action === 'REVOKE' && (typeof value.reason !== 'string' || !value.reason.trim() || value.reason.trim().length > 1000)) {
    throw new BadRequestException('Enter a revocation reason within 1000 characters.');
  }
  return { requestId: value.requestId.toLowerCase(), expectedVersion: Number(value.expectedVersion),
    ...(action === 'REVOKE' ? { reason: String(value.reason).trim() } : { sourceDigest: String(value.sourceDigest) }) };
}
