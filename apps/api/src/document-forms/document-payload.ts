import { BadRequestException } from '@nestjs/common';
import { templateFields } from './document-template-input';
import { PLATFORM_SOURCE_KEY, sourceSnapshot } from './platform-document-source.domain';

const unsafeKeys = new Set(['__proto__', 'prototype', 'constructor']);
const controlCharacters = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u;
const numberText = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
function plain(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value)
    && [Object.prototype, null].includes(Object.getPrototypeOf(value)));
}
function validDate(value: unknown): boolean {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Validate against the actual pinned template, never a client field list.
 * Values are retained as supplied so historical/client content hashes are not
 * silently rewritten. This does not confer approval or execute domain work.
 */
export function validateDocumentPayload(definition: unknown, value: unknown): asserts value is Record<string, unknown> {
  const fields = templateFields(definition);
  if (!plain(value)) throw new BadRequestException('Document data must be an object.');
  let bytes: number;
  try { bytes = Buffer.byteLength(JSON.stringify(value)); }
  catch { throw new BadRequestException('Document data is not valid JSON.'); }
  if (bytes > 128_000) throw new BadRequestException('Document data exceeds 128000 bytes.');
  const allowed = new Set(fields.map(field => field.key));
  if (Object.hasOwn(value,PLATFORM_SOURCE_KEY)) {
    let snapshot;
    try { snapshot=sourceSnapshot(value); } catch { throw new BadRequestException('Invalid server-owned document source evidence.'); }
    for (const [key,bound] of Object.entries(snapshot!.bindings)) {
      if (!allowed.has(key) || value[key]!==bound) throw new BadRequestException('Document data does not match its pinned source evidence.');
    }
  }
  for (const key of Object.keys(value)) {
    if (key===PLATFORM_SOURCE_KEY) continue;
    if (unsafeKeys.has(key) || !allowed.has(key)) throw new BadRequestException(`Unknown document field: ${key}`);
  }
  for (const field of fields) {
    const item = value[field.key];
    const empty = item === undefined || item === null || typeof item === 'string' && !item.trim();
    if (empty) {
      if (field.required) throw new BadRequestException(`Required document field missing: ${field.key}`);
      continue;
    }
    const invalid = () => { throw new BadRequestException(`Invalid ${field.type} document field: ${field.key}`); };
    if (typeof item === 'string' && (item.length > 8000 || controlCharacters.test(item))) invalid();
    switch (field.type) {
      case 'TEXT': case 'TEXTAREA': case 'LONG_TEXT': case 'SIGNATURE':
        if (typeof item !== 'string') invalid();
        break;
      case 'NUMBER':
        if (!(typeof item === 'number' && Number.isFinite(item)
          || typeof item === 'string' && numberText.test(item) && Number.isFinite(Number(item)))) invalid();
        break;
      case 'DATE':
        if (!validDate(item)) invalid();
        break;
      case 'SELECT':
        if (typeof item !== 'string' || !field.options?.includes(item)) invalid();
        break;
      case 'BOOLEAN':
        if (typeof item !== 'boolean' && item !== 'true' && item !== 'false') invalid();
        break;
      case 'TABLE': {
        if (!Array.isArray(item) || item.length > 100 || field.required && item.length === 0) invalid();
        for (const row of item as unknown[]) {
          if (!plain(row) || Object.keys(row).length > 30) invalid();
          for (const [key, cell] of Object.entries(row as Record<string, unknown>)) {
            if (unsafeKeys.has(key) || key.length > 128 || !(cell === null || typeof cell === 'boolean'
              || typeof cell === 'number' && Number.isFinite(cell)
              || typeof cell === 'string' && cell.length <= 8000 && !controlCharacters.test(cell))) invalid();
          }
        }
        break;
      }
      default: invalid();
    }
  }
}

