export type SmsSubmissionReceipt = {
  provider: 'UNIFONIC';
  submission: 'PROVIDER_RECEIPT' | 'UNCONFIRMED';
  providerMessageId: string | null;
  status: string | null;
};

function fields(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

// A missing or mismatched response can follow a successful submission. Leave it
// unresolved for reconciliation rather than treating it as a safe retry.
export function smsSubmissionReceipt(
  payload: unknown,
  correlationId: string,
  recipient: string,
): SmsSubmissionReceipt {
  const unresolved: SmsSubmissionReceipt = {
    provider: 'UNIFONIC', submission: 'UNCONFIRMED', providerMessageId: null, status: null,
  };
  const response = fields(payload);
  if (response.success !== true && response.success !== 'true') return unresolved;
  const data = fields(response.data);
  if (data.CorrelationID != null && String(data.CorrelationID) !== correlationId) return unresolved;
  if (data.Recipient != null && String(data.Recipient) !== recipient) return unresolved;

  const id = data.MessageID;
  if (typeof id === 'number' && (!Number.isSafeInteger(id) || id <= 0)) return unresolved;
  if (typeof id !== 'number' && (typeof id !== 'string' || !/^[1-9]\d*$/.test(id))) return unresolved;
  const status = typeof data.Status === 'string' ? data.Status.trim() : '';
  return {
    provider: 'UNIFONIC', submission: 'PROVIDER_RECEIPT',
    providerMessageId: String(id), status: status || null,
  };
}
