export const CREDENTIAL_VERIFICATION_STATES = [
  'UNVERIFIED',
  'PENDING',
  'DOCUMENT_VERIFIED',
  'VERIFIED',
  'REJECTED',
  'EXPIRED',
] as const;

export type CredentialVerificationState = (typeof CREDENTIAL_VERIFICATION_STATES)[number];

export const CREDENTIAL_VERIFICATION_LABELS_AR: Record<CredentialVerificationState, string> = {
  UNVERIFIED: 'غير متحقق',
  PENDING: 'بانتظار التحقق',
  DOCUMENT_VERIFIED: 'تم التحقق من الوثيقة',
  VERIFIED: 'متحقق وفق وسيلة معتمدة',
  REJECTED: 'مرفوض',
  EXPIRED: 'منتهي',
};

export function isCredentialExpired(expiresAt?: Date | null, now = new Date()) {
  return Boolean(expiresAt && expiresAt <= now);
}
