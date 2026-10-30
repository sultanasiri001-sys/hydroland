import { DepartmentCode, HYDROLAND_DEPARTMENTS } from '../governance/department-ownership.domain';
import { AgentKey } from './agent.types';

// Existing specialist identities are retained; one identity owns each department.
// Abdullah coordinates the directors and is separate from the executive department.
export const DEPARTMENT_DIRECTORS:Record<DepartmentCode,AgentKey>={
  HR:'HR_DIRECTOR',TRAINING:'TRAINING_DIRECTOR',MARINE_OPERATIONS:'MARINE_DIRECTOR',
  INVENTORY_LOGISTICS:'INVENTORY',FINANCE:'FINANCE_DIRECTOR',SAFETY_COMPLIANCE_RISK:'SAFETY_DIRECTOR',
  CUSTOMER_EXPERIENCE:'SUPPORT',MARKETING_GROWTH:'MARKETING',TECHNOLOGY_CYBERSECURITY:'CYBER_SECURITY',
  FACILITIES_ASSETS_MAINTENANCE:'FACILITIES_DIRECTOR',ADMIN_AFFAIRS_RECORDS:'ADMIN_DIRECTOR',
  EXECUTIVE_GOVERNANCE:'GOVERNANCE_DIRECTOR',RND_MARKET_INTELLIGENCE:'RESEARCH_DIRECTOR',
  LEGAL_CONTRACTS_INSURANCE:'LEGAL_RISK',
};

export function directorDepartment(key:string){
  return HYDROLAND_DEPARTMENTS.find(d=>DEPARTMENT_DIRECTORS[d.code]===key);
}
