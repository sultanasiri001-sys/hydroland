export type FacilityType = 'DIVE_CENTER' | 'WAREHOUSE' | 'OFFICE' | 'WORKSHOP' | 'MARINA_SUPPORT' | 'TRAINING_FACILITY';
export type MaintainableAssetStatus = 'ACTIVE' | 'OUT_OF_SERVICE' | 'RETIRED';
export type MaintenanceCriticality = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Facility {
  id: string;
  organizationId: string;
  name: string;
  type: FacilityType;
  active: boolean;
}

export interface MaintainableAsset {
  id: string;
  organizationId: string;
  facilityId: string;
  name: string;
  category: string;
  status: MaintainableAssetStatus;
  criticality: MaintenanceCriticality;
  ownerAccountId: string;
}

export interface MaintenancePlan {
  id: string;
  organizationId: string;
  assetId: string;
  name: string;
  intervalDays: number;
  active: boolean;
}
