// Canonical base64 storage stays portable; the Android native bridge accepts
// Uint8Array for AESSealedData.fromCombined, even where JS types allow a string.
export const MAX_OFFLINE_BYTES = 8 * 1024 * 1024;
const NONCE_BYTES = 12, TAG_BYTES = 16;
const MAX_SEALED_BYTES = MAX_OFFLINE_BYTES + NONCE_BYTES + TAG_BYTES;
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const digits = new Int16Array(128).fill(-1);
for (let index = 0; index < alphabet.length; index++) digits[alphabet.charCodeAt(index)] = index;
const invalid = () => new Error('Invalid encrypted offline bytes.');
function digit(code: number): number {
  const value = digits[code];
  if (value === undefined || value < 0) throw invalid();
  return value;
}

/** Decode bounded, canonical ciphertext without relying on browser globals. */
export function decodeOfflineCiphertext(value: string): Uint8Array {
  if (typeof value !== 'string' || value.length === 0 || value.length % 4 !== 0 ||
      value.length > Math.ceil(MAX_SEALED_BYTES / 3) * 4) throw invalid();
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0;
  const length = value.length / 4 * 3 - padding;
  if (length < NONCE_BYTES + TAG_BYTES || length > MAX_SEALED_BYTES) throw invalid();
  const final = value.length - 4;
  if (padding === 2 && (digit(value.charCodeAt(final + 1)) & 15) !== 0) throw invalid();
  if (padding === 1 && (digit(value.charCodeAt(final + 2)) & 3) !== 0) throw invalid();
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (let index = 0; index < value.length; index += 4) {
    const a = digit(value.charCodeAt(index)), b = digit(value.charCodeAt(index + 1));
    const c = index === final && padding === 2 ? 0 : digit(value.charCodeAt(index + 2));
    const d = index === final && padding > 0 ? 0 : digit(value.charCodeAt(index + 3));
    const combined = (a << 18) | (b << 12) | (c << 6) | d;
    bytes[offset++] = combined >>> 16;
    if (offset < length) bytes[offset++] = combined >>> 8;
    if (offset < length) bytes[offset++] = combined;
  }
  return bytes;
}
