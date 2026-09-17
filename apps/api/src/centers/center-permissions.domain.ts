export const CENTER_DEPARTMENTS = [
  'HR',
  'TRAINING',
  'MARINE_OPERATIONS',
  'INVENTORY_LOGISTICS_PROCUREMENT',
  'FINANCE',
  'SAFETY_COMPLIANCE_RISK',
  'CUSTOMER_EXPERIENCE',
  'MARKETING_GROWTH',
  'TECHNOLOGY_CYBERSECURITY',
  'FACILITIES_ASSETS_MAINTENANCE',
  'ADMIN_DOCUMENTS_REPORTING',
  'EXECUTIVE_GOVERNANCE',
  'RESEARCH_DEVELOPMENT_MARKET',
  'LEGAL_CONTRACTS_INSURANCE',
] as const;

export type CenterDepartment = (typeof CENTER_DEPARTMENTS)[number];
export type CenterPermissionLevel = 'L1' | 'L2' | 'L3' | 'L4';

export interface CenterDepartmentGrant {
  department: CenterDepartment;
  enabled: boolean;
  maxLevel: CenterPermissionLevel;
}

export interface CenterPermissionSnapshot {
  centerId: string;
  grants: CenterDepartmentGrant[];
}

const LEVEL_WEIGHT: Record<CenterPermissionLevel, number> = {
  L1: 1,
  L2: 2,
  L3: 3,
  L4: 4,
};

export function validateCenterDepartmentGrants(grants: CenterDepartmentGrant[]): void {
  const seen = new Set<CenterDepartment>();
  for (const grant of grants) {
    if (!CENTER_DEPARTMENTS.includes(grant.department)) {
      throw new Error(`Unknown center department: ${grant.department}`);
    }
    if (seen.has(grant.department)) {
      throw new Error(`Duplicate center department grant: ${grant.department}`);
    }
    seen.add(grant.department);
  }
}

export function canCenterAccess(
  snapshot: CenterPermissionSnapshot,
  department: CenterDepartment,
  requiredLevel: CenterPermissionLevel,
): boolean {
  const grant = snapshot.grants.find((item) => item.department === department);
  if (!grant?.enabled) return false;
  return LEVEL_WEIGHT[grant.maxLevel] >= LEVEL_WEIGHT[requiredLevel];
}

export function createDisabledCenterPermissions(centerId: string): CenterPermissionSnapshot {
  return {
    centerId,
    grants: CENTER_DEPARTMENTS.map((department) => ({
      department,
      enabled: false,
      maxLevel: 'L1',
    })),
  };
}
