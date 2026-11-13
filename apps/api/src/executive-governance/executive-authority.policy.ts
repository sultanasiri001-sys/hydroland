export interface AuthorityPeriod { validFrom: Date; expiresAt: Date; }

export function validAuthorityPeriod(value: AuthorityPeriod): boolean {
  return value.validFrom instanceof Date && value.expiresAt instanceof Date &&
    Number.isFinite(value.validFrom.getTime()) && Number.isFinite(value.expiresAt.getTime()) &&
    value.validFrom.getTime() < value.expiresAt.getTime();
}

export function authorityCurrent(value: AuthorityPeriod, now = new Date()): boolean {
  return validAuthorityPeriod(value) && Number.isFinite(now.getTime()) &&
    value.validFrom.getTime() <= now.getTime() && now.getTime() < value.expiresAt.getTime();
}
