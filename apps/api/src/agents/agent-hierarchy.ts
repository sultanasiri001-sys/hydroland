import { DEPARTMENT_DIRECTORS, directorDepartment } from './department-directors';
import { isGovernanceAgent } from './governance-review.domain';
import { sectionHeadFor } from './department-sections';

export function agentHierarchy(key:string){
  const section=sectionHeadFor(key);
  const reportingRole=directorDepartment(key)?'DEPARTMENT_DIRECTOR':key==='EXECUTIVE'?'EXECUTIVE_SECRETARY':isGovernanceAgent(key)?'GOVERNANCE_REVIEWER':section?'SECTION_HEAD':'SPECIALIST';
  return{reportingRole,reportingRoles:section&&key==='EXECUTIVE'?['EXECUTIVE_SECRETARY','SECTION_HEAD']:[reportingRole],
    section:section?{code:section.code,nameAr:section.nameAr,departmentCode:section.departmentCode,directorKey:DEPARTMENT_DIRECTORS[section.departmentCode]}:null,
    reportsToAgentKey:section?DEPARTMENT_DIRECTORS[section.departmentCode]:null};
}
