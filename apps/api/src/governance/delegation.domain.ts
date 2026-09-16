export interface AuthorityDelegation {
  id: string;
  delegatorAccountId: string;
  delegateAccountId: string;
  role: string;
  centerId?: string;
  departmentId?: string;
  resource?: string;
  startsAt: string;
  endsAt: string;
  reason: string;
  active: boolean;
}

export function isDelegationActive(delegation: AuthorityDelegation, now = new Date()): boolean {
  return delegation.active && now >= new Date(delegation.startsAt) && now <= new Date(delegation.endsAt);
}
