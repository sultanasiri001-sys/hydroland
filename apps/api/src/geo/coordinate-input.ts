// HTTP inputs and provider responses may contain numeric strings, but absent
// values, booleans and containers must never be interpreted as position zero.
export function finiteNumericInput(value: unknown): number | null {
  if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
