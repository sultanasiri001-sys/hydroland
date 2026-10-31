import { ForbiddenException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { requireVerifiedAdmin } from '../admin/admin-authorization';
import { DepartmentCode } from '../governance/department-ownership.domain';
import { platformOrganization, STAFFING_DEPARTMENTS } from '../hr/staffing-catalog';
import { ADMINISTRATIVE_CATALOG_REVISION, reviewedAdministrativeTemplates } from '../document-forms/administrative-form-catalog';
import { DEPARTMENT_DIRECTORS } from './department-directors';
import { GOVERNANCE_REVIEW_ORDER } from './governance-review.domain';
import { DepartmentSourceValues, DepartmentSourceVersion, DOCUMENT_COUNT_KEYS, departmentSourceSpec, departmentSourceValues } from './department-source.domain';

async function operationalCounts(tx:Prisma.TransactionClient,code:DepartmentCode,id:string,ownerId:string,version:DepartmentSourceVersion){
  const spec=departmentSourceSpec(version)[code];let values:number[]=[];
  switch(code){
    case 'HR':values=await Promise.all([tx.hrCandidate.count({where:{organizationId:id}}),tx.employment.count({where:{organizationId:id}}),tx.employment.count({where:{organizationId:id,status:'ACTIVE'}}),tx.leaveRequest.count({where:{employment:{organizationId:id},status:{in:['SUBMITTED','HR_REVIEW','APPROVAL_REQUIRED']}}})]);break;
    case 'TRAINING':values=await Promise.all([tx.storeCourseOffer.count({where:{organizationId:id}}),tx.trainingEnrollment.count({where:{centerOrganizationId:id,status:'ACTIVE'}}),tx.trainingRecord.count({where:{enrollment:{centerOrganizationId:id},status:'COMPLETED'}}),tx.trainingCertificate.count({where:{trainingRecord:{enrollment:{centerOrganizationId:id}},status:'RECOMMENDED'}})]);break;
    case 'MARINE_OPERATIONS':values=await Promise.all([tx.trip.count({where:{organizationId:id}}),tx.trip.count({where:{organizationId:id,status:'OPEN'}}),tx.booking.count({where:{trip:{organizationId:id}}}),tx.crewAssignment.count({where:{trip:{organizationId:id}}})]);break;
    case 'INVENTORY_LOGISTICS':if(version>=3){
      // Existing deployments have both UUID and TEXT organization keys. Read
      // only aggregate counts and normalize the scope comparison, not ownership.
      const [row]=await tx.$queryRaw<Array<Record<string,bigint>>>`SELECT COUNT(*) AS "storeGoodsProducts",COUNT(*) FILTER (WHERE "status"::text='ACTIVE') AS "activeStoreGoodsProducts",COUNT(*) FILTER (WHERE "status"::text='DRAFT') AS "draftStoreGoodsProducts",COUNT(*) FILTER (WHERE "status"::text='ACTIVE' AND "stockQuantity"<=0) AS "unavailableActiveStoreGoodsProducts",COUNT(*) FILTER (WHERE "stockQuantity"<0) AS "negativeStockStoreGoodsProducts" FROM "StoreProduct" WHERE "organizationId"::text=${id} AND "kind"::text='GOODS'`;
      values=spec.metrics.map(key=>Number(row[key]));
    }break;
    case 'FACILITIES_ASSETS_MAINTENANCE':if(version>=3){
      const [row]=await tx.$queryRaw<Array<Record<string,bigint>>>`SELECT COUNT(DISTINCT a."id") AS "marineAssets",COUNT(DISTINCT a."id") FILTER (WHERE a."status"::text='ACTIVE') AS "activeMarineAssets",COUNT(m."id") AS "marineMaintenanceRecords",COUNT(m."id") FILTER (WHERE m."status"::text='OPEN') AS "openMarineMaintenanceRecords",COUNT(m."id") FILTER (WHERE m."status"::text='COMPLETED' AND m."completedAt" IS NOT NULL) AS "recordedCompletedMarineMaintenanceRecords" FROM "MarineAsset" a LEFT JOIN "MarineMaintenanceRecord" m ON m."marineAssetId"::text=a."id"::text WHERE a."organizationId"::text=${id}`;
      values=spec.metrics.map(key=>Number(row[key]));
    }break;
    case 'FINANCE':values=await Promise.all([tx.financeAccount.count({where:{organizationId:id,active:true}}),tx.financeEntry.count({where:{organizationId:id,financeAccount:{organizationId:id},status:'PENDING_APPROVAL'}}),tx.financeEntry.count({where:{organizationId:id,financeAccount:{organizationId:id},status:'POSTED'}})]);break;
    case 'SAFETY_COMPLIANCE_RISK':values=await Promise.all([tx.safetyChecklist.count({where:{trip:{organizationId:id}}}),tx.safetyChecklist.count({where:{trip:{organizationId:id},decision:'REVIEW_REQUIRED'}}),tx.safetyIncident.count({where:{trip:{organizationId:id},status:{in:['OPEN','UNDER_REVIEW']}}})]);break;
    case 'CUSTOMER_EXPERIENCE':values=await Promise.all([tx.customerCase.count({where:{organizationId:id}}),tx.customerCase.count({where:{organizationId:id,status:{in:['OPEN','ASSIGNED']}}}),tx.customerCase.count({where:{organizationId:id,status:'WAITING_CUSTOMER'}}),tx.customerCase.count({where:{organizationId:id,status:'CLOSED'}})]);break;
    case 'TECHNOLOGY_CYBERSECURITY':values=await Promise.all([tx.aiAgentTask.count({where:{requestedByAccountId:ownerId,state:'QUEUED'}}),tx.aiAgentTask.count({where:{requestedByAccountId:ownerId,state:'RUNNING'}}),tx.aiAgentTask.count({where:{requestedByAccountId:ownerId,state:'FAILED'}}),tx.aiAgentRuntime.count({where:{state:'ENABLED'}})]);break;
    case 'ADMIN_AFFAIRS_RECORDS':values=await Promise.all([tx.administrativeRecord.count({where:{organizationId:id,unit:{organizationId:id}}}),tx.administrativeRouting.count({where:{organizationId:id,record:{organizationId:id},fromUnit:{organizationId:id},toUnit:{organizationId:id},decidedAt:null}}),tx.administrativeMeeting.count({where:{organizationId:id,unit:{organizationId:id}}})]);break;
    case 'EXECUTIVE_GOVERNANCE':values=await Promise.all([tx.orgUnit.count({where:{organizationId:id,type:'DEPARTMENT',active:true,code:{in:STAFFING_DEPARTMENTS.map(d=>d.code)}}}),tx.departmentClosureAssessment.count({where:{organizationId:id}}),tx.aiAgentTask.count({where:{requestedByAccountId:ownerId,agentKey:{in:[...GOVERNANCE_REVIEW_ORDER]},state:{in:['QUEUED','RUNNING']}}})]);break;
    case 'RND_MARKET_INTELLIGENCE':values=await Promise.all([tx.internalResearchInitiative.count({where:{organizationId:id}}),tx.internalResearchReview.count({where:{organizationId:id,initiative:{organizationId:id}}})]);break;
    case 'LEGAL_CONTRACTS_INSURANCE':values=await Promise.all([tx.employmentContract.count({where:{employment:{organizationId:id}}}),tx.employmentContract.count({where:{employment:{organizationId:id},status:'DRAFT'}})]);break;
    case 'MARKETING_GROWTH':if(version===4){
      const [row]=await tx.$queryRaw<Array<Record<string,bigint>>>`SELECT COUNT(*) AS "marketingCampaignDrafts",COUNT(*) FILTER (WHERE "status"='DRAFT') AS "openMarketingCampaignDrafts",COUNT(*) FILTER (WHERE "status"='ARCHIVED') AS "archivedMarketingCampaignDrafts" FROM "MarketingCampaignDraft" WHERE "organizationId"::text=${id}`;
      values=spec.metrics.map(key=>Number(row[key]));
    }break;
    // Draft planning is not campaign publication or measured analytics.
    // Legacy v2 keeps its original empty inventory and facilities adapters.
    default:break;
  }
  return Object.fromEntries(spec.metrics.map((key,index)=>[key,values[index]]));
}

// A fresh verified platform owner is required. All relational counts constrain
// the provider's organization, not a booking customer's unrelated organization.
// The complete read uses one caller-owned serializable database snapshot.
export async function requireDepartmentSourceOwner(tx:Prisma.TransactionClient,actorId:string){
  await requireVerifiedAdmin(tx,actorId);const organization=await platformOrganization(tx);
  if(!organization||organization.ownerId!==actorId)throw new ForbiddenException('مصادر الإدارات الداخلية متاحة لمالك هيدرولاند فقط.');
  return organization;
}

export async function readDepartmentSources(tx:Prisma.TransactionClient,actorId:string,selected:readonly DepartmentCode[]=STAFFING_DEPARTMENTS.map(d=>d.code),version:DepartmentSourceVersion=4){
  const organization=await requireDepartmentSourceOwner(tx,actorId);
  const definitions=STAFFING_DEPARTMENTS.filter(d=>selected.includes(d.code)),sourceTemplates=reviewedAdministrativeTemplates('source-catalog').filter(t=>selected.includes(t.department));
  const [units,templates,groups]=await Promise.all([
    tx.orgUnit.findMany({where:{organizationId:organization.id,type:'DEPARTMENT',code:{in:definitions.map(d=>d.code)}},select:{code:true,active:true}}),
    tx.documentTemplate.findMany({where:{organizationId:organization.id,code:{in:sourceTemplates.map(t=>t.code)}},select:{id:true,code:true,department:true,status:true}}),
    tx.managedDocument.groupBy({by:['templateId','department','status'],where:{organizationId:organization.id,template:{organizationId:organization.id,code:{in:sourceTemplates.map(t=>t.code)}}},_count:{_all:true}}),
  ]);
  const departments=[];
  for(const d of definitions){
    const unit=units.find(u=>u.code===d.code),unitState=!unit?'NOT_CONFIGURED':unit.active?'ACTIVE':'INACTIVE';
    const spec=departmentSourceSpec(version)[d.code];let evidence:DepartmentSourceValues|null=null;
    if(unitState==='ACTIVE'){
      const codes=sourceTemplates.filter(t=>t.department===d.code).map(t=>t.code),ownTemplates=templates.filter(t=>t.department===d.code&&codes.includes(t.code));
      const documents=Object.fromEntries(DOCUMENT_COUNT_KEYS.map(key=>[key,0])) as DepartmentSourceValues['documents'];
      documents.templateTypes=new Set(ownTemplates.map(t=>t.code)).size;
      documents.activeTemplateTypes=new Set(ownTemplates.filter(t=>t.status==='ACTIVE').map(t=>t.code)).size;
      documents.templateConflicts=codes.filter(code=>templates.some(t=>t.code===code&&t.department!==d.code)||ownTemplates.filter(t=>t.code===code&&t.status==='ACTIVE').length>1).length;
      for(const g of groups){
        const template=templates.find(t=>t.id===g.templateId);if(!template||!codes.includes(template.code))continue;
        if(g.department!==d.code||template.department!==d.code){documents.inconsistentLinks+=g._count._all;continue;}
        const key=({DRAFT:'drafts',PENDING_APPROVAL:'pendingApproval',APPROVED:'approved',SIGNED:'signed',ARCHIVED:'archived'} as const)[g.status];documents[key]+=g._count._all;documents.documents+=g._count._all;
      }
      evidence=departmentSourceValues({version,department:d.code,scope:'INTERNAL_PLATFORM_ORGANIZATION',coverage:'PARTIAL',catalog:{revision:ADMINISTRATIVE_CATALOG_REVISION,codesDigest:createHash('sha256').update(JSON.stringify([...codes].sort())).digest('hex')},documents,metrics:await operationalCounts(tx,d.code,organization.id,organization.ownerId,version),missingSources:[spec.gap]},DEPARTMENT_DIRECTORS[d.code]);
      if(!evidence)throw new Error('DEPARTMENT_SOURCE_INVALID');
    }
    departments.push({department:d.code,nameAr:d.nameAr,agentKey:DEPARTMENT_DIRECTORS[d.code],unitState,operationalCountsConnected:spec.metrics.length>0,sourceTables:['DocumentTemplate','ManagedDocument',...spec.tables],evidence});
  }
  const observedAt=(await tx.$queryRaw<Array<{now:Date}>>`SELECT clock_timestamp() AS now`)[0].now.toISOString();
  return{scope:'DEPARTMENT_SOURCE_PREVIEW',sourceVersion:version,readOnly:true,generationTested:false,observedAt,coverage:'PARTIAL',operationalAcceptance:'NOT_ASSESSED',departments};
}
