import { DepartmentCode, HYDROLAND_DEPARTMENTS } from '../governance/department-ownership.domain';
import { directorDepartment } from './department-directors';

export const DEPARTMENT_SOURCE_SCOPE_V2='DEPARTMENT_AGGREGATE_V2';
export const DEPARTMENT_SOURCE_SCOPE_V3='DEPARTMENT_AGGREGATE_V3';
export const DEPARTMENT_SOURCE_SCOPE='DEPARTMENT_AGGREGATE_V4';
export const DIRECTOR_SOURCE_FINGERPRINT_V2='department-source:v2:';
export const DIRECTOR_SOURCE_FINGERPRINT_V3='department-source:v3:';
export const DIRECTOR_SOURCE_FINGERPRINT='department-source:v4:';
export type DepartmentSourceVersion=2|3|4;
export type DepartmentSourceScope=typeof DEPARTMENT_SOURCE_SCOPE|typeof DEPARTMENT_SOURCE_SCOPE_V2|typeof DEPARTMENT_SOURCE_SCOPE_V3;
export const DOCUMENT_COUNT_KEYS=['templateTypes','activeTemplateTypes','templateConflicts','documents','drafts','pendingApproval','approved','signed','archived','inconsistentLinks'] as const;
export const DEPARTMENT_SOURCE_SPEC_V2:Record<DepartmentCode,{metrics:readonly string[];tables:readonly string[];gap:string}>={
  HR:{metrics:['candidates','employments','activeEmployments','pendingLeaves'],tables:['HrCandidate','Employment','LeaveRequest'],gap:'OFFICIAL_WORKFORCE_VALIDATION'},
  TRAINING:{metrics:['courseOffers','activeEnrollments','completedTrainingRecords','certificateRecommendations'],tables:['StoreCourseOffer','TrainingEnrollment','TrainingRecord','TrainingCertificate'],gap:'TRAINING_AUTHORITY_VERIFICATION'},
  MARINE_OPERATIONS:{metrics:['trips','openTrips','tripBookings','crewAssignments'],tables:['Trip','Booking','CrewAssignment'],gap:'TRIP_RELEASE_RETURN_EVIDENCE'},
  INVENTORY_LOGISTICS:{metrics:[],tables:[],gap:'WAREHOUSE_PROCUREMENT_REGISTRY'},
  FINANCE:{metrics:['activeFinanceAccounts','pendingFinanceEntries','postedFinanceEntries'],tables:['FinanceAccount','FinanceEntry'],gap:'FINANCIAL_RECONCILIATION_CLOSE'},
  SAFETY_COMPLIANCE_RISK:{metrics:['safetyChecklists','pendingSafetyDecisions','unresolvedTripIncidents'],tables:['SafetyChecklist','SafetyIncident','Trip'],gap:'RISK_CAPA_EFFECTIVENESS'},
  CUSTOMER_EXPERIENCE:{metrics:['customerCases','openCustomerCases','waitingCustomerCases','closedCustomerCases'],tables:['CustomerCase'],gap:'CUSTOMER_OUTCOME_CONFIRMATION'},
  MARKETING_GROWTH:{metrics:[],tables:[],gap:'CAMPAIGN_PUBLICATION_ANALYTICS'},
  TECHNOLOGY_CYBERSECURITY:{metrics:['queuedOwnerTasks','runningOwnerTasks','failedOwnerTasks','enabledAgents'],tables:['AiAgentTask','AiAgentRuntime'],gap:'SECURITY_INCIDENT_RECOVERY_EVIDENCE'},
  FACILITIES_ASSETS_MAINTENANCE:{metrics:[],tables:[],gap:'UNIFIED_ASSET_WORK_ORDERS'},
  ADMIN_AFFAIRS_RECORDS:{metrics:['administrativeRecords','pendingRoutings','meetings'],tables:['AdministrativeRecord','AdministrativeRouting','AdministrativeMeeting'],gap:'DELIVERY_RETENTION_DISPOSAL_EVIDENCE'},
  EXECUTIVE_GOVERNANCE:{metrics:['activeDepartments','assessmentRevisions','pendingOfficeTasks'],tables:['OrgUnit','DepartmentClosureAssessment','AiAgentTask'],gap:'EXECUTIVE_DECISION_EXECUTION_EVIDENCE'},
  RND_MARKET_INTELLIGENCE:{metrics:['researchInitiatives','researchReviews'],tables:['InternalResearchInitiative','InternalResearchReview'],gap:'EXPERIMENT_MARKET_EVIDENCE'},
  LEGAL_CONTRACTS_INSURANCE:{metrics:['employmentContractVersions','draftEmploymentContractVersions'],tables:['EmploymentContract','Employment'],gap:'COMMERCIAL_INSURANCE_CLAIMS_REGISTRY'},
};
// Store goods are a partial inventory source. Marine assets are a partial
// facilities source. Neither substitutes for the missing unified registries.
export const DEPARTMENT_SOURCE_SPEC_V3:typeof DEPARTMENT_SOURCE_SPEC_V2={...DEPARTMENT_SOURCE_SPEC_V2,
  INVENTORY_LOGISTICS:{metrics:['storeGoodsProducts','activeStoreGoodsProducts','draftStoreGoodsProducts','unavailableActiveStoreGoodsProducts','negativeStockStoreGoodsProducts'],tables:['StoreProduct'],gap:'WAREHOUSE_PROCUREMENT_REGISTRY'},
  FACILITIES_ASSETS_MAINTENANCE:{metrics:['marineAssets','activeMarineAssets','marineMaintenanceRecords','openMarineMaintenanceRecords','recordedCompletedMarineMaintenanceRecords'],tables:['MarineAsset','MarineMaintenanceRecord'],gap:'UNIFIED_ASSET_WORK_ORDERS'},
};
export const DEPARTMENT_SOURCE_SPEC:typeof DEPARTMENT_SOURCE_SPEC_V2={...DEPARTMENT_SOURCE_SPEC_V3,
  MARKETING_GROWTH:{metrics:['marketingCampaignDrafts','openMarketingCampaignDrafts','archivedMarketingCampaignDrafts'],tables:['MarketingCampaignDraft'],gap:'CAMPAIGN_PUBLICATION_ANALYTICS'},
};
export const departmentSourceSpec=(version:DepartmentSourceVersion)=>version===2?DEPARTMENT_SOURCE_SPEC_V2:version===3?DEPARTMENT_SOURCE_SPEC_V3:DEPARTMENT_SOURCE_SPEC;
export const departmentSourceScope=(version:DepartmentSourceVersion):DepartmentSourceScope=>version===2?DEPARTMENT_SOURCE_SCOPE_V2:version===3?DEPARTMENT_SOURCE_SCOPE_V3:DEPARTMENT_SOURCE_SCOPE;
export function departmentSourceVersion(fingerprint?:string):DepartmentSourceVersion|null{
  return fingerprint?.startsWith(DIRECTOR_SOURCE_FINGERPRINT)?4:fingerprint?.startsWith(DIRECTOR_SOURCE_FINGERPRINT_V3)?3:fingerprint?.startsWith(DIRECTOR_SOURCE_FINGERPRINT_V2)?2:null;
}
export const isDepartmentSourceScope=(scope:unknown):scope is DepartmentSourceScope=>scope===DEPARTMENT_SOURCE_SCOPE||scope===DEPARTMENT_SOURCE_SCOPE_V2||scope===DEPARTMENT_SOURCE_SCOPE_V3;
export type DepartmentSourceValues={version:DepartmentSourceVersion;department:DepartmentCode;scope:'INTERNAL_PLATFORM_ORGANIZATION';coverage:'PARTIAL';catalog:{revision:string;codesDigest:string};documents:Record<typeof DOCUMENT_COUNT_KEYS[number],number>;metrics:Record<string,number>;missingSources:string[]};
const record=(v:unknown):Record<string,unknown>|null=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:null;
const counts=(v:unknown,keys:readonly string[])=>{const x=record(v);return x&&Object.keys(x).length===keys.length&&keys.every(k=>Number.isSafeInteger(x[k])&&Number(x[k])>=0);};

// Only allowlisted scalar counts leave the adapter. No raw rows, identities,
// amounts, document payloads, free text or client-selected metric names.
export function departmentSourceValues(value:unknown,agentKey?:string):DepartmentSourceValues|null{
  const x=record(value);if(!x||Object.keys(x).length!==8||(x.version!==2&&x.version!==3&&x.version!==4)||x.scope!=='INTERNAL_PLATFORM_ORGANIZATION'||x.coverage!=='PARTIAL'||!HYDROLAND_DEPARTMENTS.some(d=>d.code===x.department))return null;
  const catalog=record(x.catalog);if(!catalog||Object.keys(catalog).length!==2||typeof catalog.revision!=='string'||!/^\d{4}-\d{2}-\d{2}\.\d{1,3}$/.test(catalog.revision)||typeof catalog.codesDigest!=='string'||! /^[a-f0-9]{64}$/.test(catalog.codesDigest))return null;
  const code=x.department as DepartmentCode,version=x.version as DepartmentSourceVersion,spec=departmentSourceSpec(version)[code];
  if(agentKey&&directorDepartment(agentKey)?.code!==code)return null;
  if(!counts(x.documents,DOCUMENT_COUNT_KEYS)||!counts(x.metrics,spec.metrics)||!Array.isArray(x.missingSources)||x.missingSources.length!==1||x.missingSources[0]!==spec.gap)return null;
  // PostgreSQL JSONB does not preserve object key order. Rebuild the exact
  // canonical order before hashing or comparing an immutable source receipt.
  const documents=x.documents as Record<string,number>,metrics=x.metrics as Record<string,number>;
  return{version,department:code,scope:'INTERNAL_PLATFORM_ORGANIZATION',coverage:'PARTIAL',catalog:{revision:catalog.revision,codesDigest:catalog.codesDigest},documents:Object.fromEntries(DOCUMENT_COUNT_KEYS.map(k=>[k,documents[k]])) as DepartmentSourceValues['documents'],metrics:Object.fromEntries(spec.metrics.map(k=>[k,metrics[k]])),missingSources:[spec.gap]};
}
