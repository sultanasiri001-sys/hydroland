import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { DocumentAuthorizationService } from './document-authorization.service';
import { COOPERATION_CODE } from './cooperation-contract.domain';
import { LIBRARY_PREFIX } from './contract-library.domain';
import { buildDepartmentTemplateCatalog } from './document-template-catalog';
import { buildOperationalDocumentCatalog } from './operational-document-catalog';
import { buildHrDocumentCatalog } from './hr-document-catalog';
import { PLATFORM_STAFFING_KEY, PLATFORM_STAFFING_KIND, STAFFING_DEPARTMENTS, record } from '../hr/staffing-catalog';

@Injectable()
export class DocumentListService {
  constructor(private readonly db:DatabaseService,private readonly authz:DocumentAuthorizationService){}
  workspaces(accountId:string){return this.authz.workspaces(accountId);}

  async list(accountId:string,organizationId:string){
    await this.authz.assert(accountId,organizationId,'DOCUMENT_LIST');
    return this.db.managedDocument.findMany({
      where:{organizationId,template:{NOT:[{code:COOPERATION_CODE},{code:{startsWith:LIBRARY_PREFIX}}]}},
      include:{template:true},
      orderBy:[{updatedAt:'desc'},{createdAt:'desc'}],
    });
  }

  async inventory(accountId:string,organizationId:string){
    return this.db.serializable(async tx=>{
      // Recheck membership in the same snapshot as all inventory reads. No
      // platform-admin or department selector grants access to another tenant.
      const member=await this.authz.assert(accountId,organizationId,'DOCUMENT_LIST',tx);
      const organization=await tx.organization.findUnique({where:{id:organizationId},select:{kind:true,status:true}});
      const setting=await tx.operationalSetting.findUnique({where:{key:PLATFORM_STAFFING_KEY},select:{value:true}});
      const internal=record(setting?.value).organizationId===organizationId
        && organization?.kind===PLATFORM_STAFFING_KIND && organization.status==='ACTIVE';
      // The 42 existing source templates apply to the internal platform only.
      // They are a known baseline, not a certified complete/mandatory inventory.
      const baseline=internal?[...buildDepartmentTemplateCatalog(organizationId),...buildOperationalDocumentCatalog(organizationId)]:[];
      const extensions=internal?buildHrDocumentCatalog(organizationId):[];
      const sourceTemplates=[...baseline,...extensions];
      const templates=await tx.documentTemplate.findMany({
        where:{organizationId,NOT:[{code:COOPERATION_CODE},{code:{startsWith:LIBRARY_PREFIX}}]},
        select:{id:true,code:true,titleAr:true,titleEn:true,department:true,version:true,status:true},
        orderBy:[{code:'asc'},{version:'desc'}],
      });
      const groups=await tx.managedDocument.groupBy({
        by:['templateId','department','status'],
        where:{organizationId,template:{organizationId,NOT:[{code:COOPERATION_CODE},{code:{startsWith:LIBRARY_PREFIX}}]}},
        _count:{_all:true},
      });
      const codes=new Map(STAFFING_DEPARTMENTS.map(d=>[d.code as string,d.nameAr]));
      for(const t of templates)if(!codes.has(t.department))codes.set(t.department,t.department);
      const departments=[...codes].map(([code,nameAr])=>{
        const definitions=new Map<string,{code:string;titleAr:string;titleEn:string}>();
        for(const t of sourceTemplates.filter(t=>t.department===code))definitions.set(t.code,{code:t.code,titleAr:t.titleAr,titleEn:t.titleEn});
        for(const t of templates.filter(t=>t.department===code))if(!definitions.has(t.code))definitions.set(t.code,{code:t.code,titleAr:t.titleAr,titleEn:t.titleEn});
        const items=[...definitions.values()].map(definition=>{
          const versions=templates.filter(t=>t.code===definition.code&&t.department===code);
          const active=versions.filter(t=>t.status==='ACTIVE');
          const source=sourceTemplates.find(t=>t.code===definition.code&&t.department===code);
          const otherDepartment=templates.some(t=>t.code===definition.code&&t.department!==code)
            || sourceTemplates.some(t=>t.code===definition.code&&t.department!==code);
          const status=otherDepartment?'DEPARTMENT_CONFLICT':active.length>1?'ACTIVE_VERSION_CONFLICT':active.length===1?'READY':versions.length?'INACTIVE':'NOT_CONFIGURED';
          const counts={DRAFT:0,PENDING_APPROVAL:0,APPROVED:0,SIGNED:0,ARCHIVED:0};
          for(const g of groups)if(g.department===code&&versions.some(t=>t.id===g.templateId))counts[g.status]+=g._count._all;
          const total=Object.values(counts).reduce((sum,n)=>sum+n,0);
          const present=counts.DRAFT+counts.PENDING_APPROVAL+counts.APPROVED+counts.SIGNED;
          return {
            ...definition,department:code,baseline:Boolean(source),templateStatus:status,
            activeTemplateId:status==='READY'?active[0].id:null,
            versions:versions.map(t=>({id:t.id,version:t.version,status:t.status})),counts,total,
            recordStatus:present?'RECORDED':total?'ARCHIVE_ONLY':'NO_RECORD',
            // Existing template-create permission and endpoint still own setup.
            setup:status==='NOT_CONFIGURED'&&source&&['OWNER','ADMIN'].includes(member.role)?{
              organizationId,code:source.code,department:source.department,titleAr:source.titleAr,
              titleEn:source.titleEn,fields:source.fields,printable:source.printable,
            }:null,
          };
        });
        return {code,nameAr,items,summary:{
          types:items.length,notConfigured:items.filter(t=>t.templateStatus==='NOT_CONFIGURED').length,
          conflicts:items.filter(t=>t.templateStatus.endsWith('CONFLICT')).length,
          noRecord:items.filter(t=>t.recordStatus==='NO_RECORD').length,
          archiveOnly:items.filter(t=>t.recordStatus==='ARCHIVE_ONLY').length,
          pendingApproval:items.reduce((n,t)=>n+t.counts.PENDING_APPROVAL,0),
          drafts:items.reduce((n,t)=>n+t.counts.DRAFT,0),
          approved:items.reduce((n,t)=>n+t.counts.APPROVED+t.counts.SIGNED,0),
          total:items.reduce((n,t)=>n+t.total,0),
        }};
      });
      const inconsistentRecordCount=groups.filter(g=>!templates.some(t=>t.id===g.templateId&&t.department===g.department)).reduce((n,g)=>n+g._count._all,0);
      return {organizationId,observedAt:new Date().toISOString(),internalPlatform:internal,
        baselineTemplateCount:baseline.length,extensionTemplateCount:extensions.length,sourceTemplateCount:sourceTemplates.length,completeDocumentInventoryVerified:false,
        countScope:'GENERIC_DOCUMENTS_ALL_RECORDED_VERSIONS',
        specializedContractsIncluded:false,inconsistentRecordCount,departments};
    });
  }
}
