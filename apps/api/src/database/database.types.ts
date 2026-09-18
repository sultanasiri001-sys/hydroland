export type AccountStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DISABLED';
export type GrantStatus = 'ACTIVE' | 'SUSPENDED' | 'REVOKED';

export interface SessionRecord {
  id: string;
  accountId: string;
  tokenHash: string;
  expiresAt: string;
  revokedAt: string | null;
}
