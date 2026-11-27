import { BadRequestException } from '@nestjs/common';

// Registration and hull identifiers are separate identities. Do not infer one
// from the other, or manufacture a value for an existing asset.
export function marineHullNumber(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > 160 || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new BadRequestException('رقم الهيكل غير صالح أو يتجاوز 80 حرفًا.');
  }
  const normalized = value.normalize('NFKC').trim()
    .replace(/[٠-٩۰-۹]/g, character => String('٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹'.indexOf(character) % 10))
    .replace(/ +/g, ' ').toUpperCase();
  if (!normalized) return null;
  if (!/^[A-Z0-9\u0621-\u064A][A-Z0-9\u0621-\u064A /-]{0,79}$/.test(normalized)) {
    throw new BadRequestException('رقم الهيكل غير صالح أو يتجاوز 80 حرفًا.');
  }
  return normalized;
}
