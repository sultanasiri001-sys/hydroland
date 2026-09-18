export type TechnologyAssetType = 'APPLICATION' | 'API' | 'DATABASE' | 'INFRASTRUCTURE' | 'INTEGRATION' | 'DEVICE';
export type TechnologyAssetCriticality = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type CybersecurityFindingSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type CybersecurityFindingStatus = 'OPEN' | 'MITIGATING' | 'RESOLVED' | 'ACCEPTED';

export interface TechnologyAsset {
  id: string;
  organizationId: string;
  name: string;
  type: TechnologyAssetType;
  criticality: TechnologyAssetCriticality;
  ownerAccountId: string;
  active: boolean;
}

export interface CybersecurityFinding {
  id: string;
  organizationId: string;
  assetId: string;
  title: string;
  severity: CybersecurityFindingSeverity;
  status: CybersecurityFindingStatus;
  discoveredAt: Date;
  evidenceReferences: string[];
}

export interface TechnologyService {
  id: string;
  organizationId: string;
  name: string;
  ownerAccountId: string;
  assetIds: string[];
  active: boolean;
}
