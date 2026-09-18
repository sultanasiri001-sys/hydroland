export enum ExecutiveDecisionStatus {
  DRAFT = 'DRAFT',
  ISSUED = 'ISSUED',
  SUPERSEDED = 'SUPERSEDED',
  CLOSED = 'CLOSED',
}

export enum GovernanceBodyType {
  EXECUTIVE_MANAGEMENT = 'EXECUTIVE_MANAGEMENT',
  GOVERNANCE_COMMITTEE = 'GOVERNANCE_COMMITTEE',
  RISK_COMMITTEE = 'RISK_COMMITTEE',
  AUDIT_COMMITTEE = 'AUDIT_COMMITTEE',
}

export interface GovernanceBody {
  id: string;
  organizationId: string;
  name: string;
  type: GovernanceBodyType;
  chairAccountId: string;
  memberAccountIds: string[];
  active: boolean;
}

export interface ExecutiveMandate {
  id: string;
  organizationId: string;
  title: string;
  ownerAccountId: string;
  authorityScope: string[];
  active: boolean;
}

export interface ExecutiveDecision {
  id: string;
  organizationId: string;
  governanceBodyId: string;
  referenceNumber: string;
  title: string;
  status: ExecutiveDecisionStatus;
  issuedByAccountId: string;
  issuedAt?: Date;
}
