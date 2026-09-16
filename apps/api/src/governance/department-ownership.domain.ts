export type DepartmentCode =
  | 'HR'
  | 'TRAINING'
  | 'MARINE_OPERATIONS'
  | 'INVENTORY_LOGISTICS'
  | 'FINANCE'
  | 'SAFETY_COMPLIANCE_RISK'
  | 'CUSTOMER_EXPERIENCE'
  | 'MARKETING_GROWTH'
  | 'TECHNOLOGY_CYBERSECURITY'
  | 'FACILITIES_ASSETS_MAINTENANCE'
  | 'ADMIN_AFFAIRS_RECORDS'
  | 'EXECUTIVE_GOVERNANCE'
  | 'RND_MARKET_INTELLIGENCE'
  | 'LEGAL_CONTRACTS_INSURANCE';

export type DomainOwnership = 'OWNER' | 'PROCESSOR' | 'REVIEWER' | 'CONSUMER';

export interface DepartmentDefinition {
  code: DepartmentCode;
  name: string;
  canonicalDomains: readonly string[];
  controlBoundaries: readonly string[];
}

export interface DomainOwnershipRule {
  domain: string;
  owner: DepartmentCode;
  supportingDepartments: readonly DepartmentCode[];
  sourceOfTruth: string;
  notes?: string;
}

export const HYDROLAND_DEPARTMENTS: readonly DepartmentDefinition[] = [
  { code: 'HR', name: 'Human Resources', canonicalDomains: ['workforce', 'recruitment', 'employment', 'performance', 'attendance'], controlBoundaries: ['Hiring must pass central HR verification', 'Employment does not imply authorization'] },
  { code: 'TRAINING', name: 'Training', canonicalDomains: ['courses', 'enrollments', 'instructor-operations', 'training-schedules'], controlBoundaries: ['Field training remains subject to safety and operational gates'] },
  { code: 'MARINE_OPERATIONS', name: 'Trips & Marine Operations', canonicalDomains: ['trips', 'bookings', 'crew', 'dive-logs', 'fleet-operations'], controlBoundaries: ['Cannot bypass mandatory safety/compliance gates'] },
  { code: 'INVENTORY_LOGISTICS', name: 'Inventory, Warehouses, Logistics & Procurement', canonicalDomains: ['inventory', 'warehouses', 'procurement', 'suppliers', 'inter-center-transfers', 'rentals'], controlBoundaries: ['Finance owns budget/payment control', 'Legal owns contract terms/review'] },
  { code: 'FINANCE', name: 'Finance', canonicalDomains: ['accounting', 'payments', 'budget', 'cost-centers', 'payables', 'receivables'], controlBoundaries: ['Customer payments remain distinct from workforce compensation'] },
  { code: 'SAFETY_COMPLIANCE_RISK', name: 'Safety, Compliance & Risk', canonicalDomains: ['safety', 'operational-compliance', 'risk', 'incidents', 'capa', 'operational-clearance'], controlBoundaries: ['Legal owns legal interpretation', 'Non-overridable safety rules remain non-overridable'] },
  { code: 'CUSTOMER_EXPERIENCE', name: 'Customer Service & Customer Experience', canonicalDomains: ['customer-support', 'tickets', 'complaints', 'customer-experience'], controlBoundaries: ['Customer 360 access is field-scoped'] },
  { code: 'MARKETING_GROWTH', name: 'Marketing, Brand & Growth', canonicalDomains: ['campaigns', 'content', 'brand', 'growth'], controlBoundaries: ['R&D owns market intelligence and experiments'] },
  { code: 'TECHNOLOGY_CYBERSECURITY', name: 'Technology, Systems & Cybersecurity', canonicalDomains: ['platform', 'integrations', 'ai-operations', 'cybersecurity', 'technical-identity'], controlBoundaries: ['Technical operation does not grant executive approval authority', 'Production, development, security and secrets duties are separable'] },
  { code: 'FACILITIES_ASSETS_MAINTENANCE', name: 'Facilities, Operational Assets & Maintenance', canonicalDomains: ['asset-registry', 'maintenance', 'facilities', 'work-orders'], controlBoundaries: ['Asset identity is canonical and shared with inventory'] },
  { code: 'ADMIN_AFFAIRS_RECORDS', name: 'Administrative Affairs & Documents', canonicalDomains: ['records', 'correspondence', 'meetings', 'decisions', 'document-administration'], controlBoundaries: ['Legal owns legal review and terms of contracts'] },
  { code: 'EXECUTIVE_GOVERNANCE', name: 'Executive Management & Enterprise Governance', canonicalDomains: ['enterprise-approvals', 'delegation', 'enterprise-policy', 'capacity-governance', 'executive-decisions'], controlBoundaries: ['Legal governance implementation does not replace enterprise executive authority'] },
  { code: 'RND_MARKET_INTELLIGENCE', name: 'Research, Development & Market Analysis', canonicalDomains: ['research', 'market-intelligence', 'opportunities', 'experiments', 'feasibility'], controlBoundaries: ['Produces evidence and recommendations; does not independently launch major services or budgets'] },
  { code: 'LEGAL_CONTRACTS_INSURANCE', name: 'Legal Affairs, Contracts & Insurance', canonicalDomains: ['legal-review', 'contracts', 'contract-obligations', 'insurance', 'claims', 'legal-compliance'], controlBoundaries: ['Acts as a control function; commercial/executive authority remains with authorized business governance'] },
];

export const DOMAIN_OWNERSHIP_REGISTRY: readonly DomainOwnershipRule[] = [
  { domain: 'organization-membership', owner: 'EXECUTIVE_GOVERNANCE', supportingDepartments: ['HR', 'TECHNOLOGY_CYBERSECURITY'], sourceOfTruth: 'organizations' },
  { domain: 'credentials', owner: 'HR', supportingDepartments: ['TRAINING', 'MARINE_OPERATIONS', 'SAFETY_COMPLIANCE_RISK'], sourceOfTruth: 'credentials' },
  { domain: 'trips-bookings-dive-logs', owner: 'MARINE_OPERATIONS', supportingDepartments: ['SAFETY_COMPLIANCE_RISK', 'FINANCE', 'CUSTOMER_EXPERIENCE'], sourceOfTruth: 'trips/bookings/dive-logs' },
  { domain: 'operational-safety', owner: 'SAFETY_COMPLIANCE_RISK', supportingDepartments: ['MARINE_OPERATIONS', 'LEGAL_CONTRACTS_INSURANCE'], sourceOfTruth: 'trips/policy-control + safety domain' },
  { domain: 'customer-payments', owner: 'FINANCE', supportingDepartments: ['MARINE_OPERATIONS', 'TRAINING', 'CUSTOMER_EXPERIENCE'], sourceOfTruth: 'payments' },
  { domain: 'workforce-recruitment', owner: 'HR', supportingDepartments: ['EXECUTIVE_GOVERNANCE', 'FINANCE', 'LEGAL_CONTRACTS_INSURANCE', 'TECHNOLOGY_CYBERSECURITY'], sourceOfTruth: 'governance workforce/recruitment semantics; persistence pending' },
  { domain: 'assets', owner: 'FACILITIES_ASSETS_MAINTENANCE', supportingDepartments: ['INVENTORY_LOGISTICS', 'FINANCE', 'MARINE_OPERATIONS'], sourceOfTruth: 'unified asset registry; persistence pending' },
  { domain: 'audit', owner: 'EXECUTIVE_GOVERNANCE', supportingDepartments: ['TECHNOLOGY_CYBERSECURITY'], sourceOfTruth: 'audit' },
  { domain: 'notifications', owner: 'TECHNOLOGY_CYBERSECURITY', supportingDepartments: ['CUSTOMER_EXPERIENCE', 'ADMIN_AFFAIRS_RECORDS'], sourceOfTruth: 'notifications' },
  { domain: 'contracts-insurance', owner: 'LEGAL_CONTRACTS_INSURANCE', supportingDepartments: ['FINANCE', 'ADMIN_AFFAIRS_RECORDS'], sourceOfTruth: 'legal contract registry; persistence pending' },
  { domain: 'market-intelligence', owner: 'RND_MARKET_INTELLIGENCE', supportingDepartments: ['MARKETING_GROWTH', 'FINANCE', 'EXECUTIVE_GOVERNANCE'], sourceOfTruth: 'R&D registry; persistence pending' },
];

export function getDepartment(code: DepartmentCode): DepartmentDefinition | undefined {
  return HYDROLAND_DEPARTMENTS.find((department) => department.code === code);
}

export function getDomainOwner(domain: string): DomainOwnershipRule | undefined {
  return DOMAIN_OWNERSHIP_REGISTRY.find((rule) => rule.domain === domain);
}
