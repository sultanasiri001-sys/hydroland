import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { DocumentAuthorizationService } from './document-authorization.service';
import { CooperationContractService } from './cooperation-contract.service';
import { COOPERATION_CODE, CONTRACT_FIELDS } from './cooperation-contract.domain';
import { isLibraryCode } from './contract-library.domain';

export interface DocumentPrintContract {
  documentId:string;
  organizationId:string;
  referenceNumber:string;
  department:string;
  status:string;
  documentVersion:number;
  contentHash:string;
  branding:{brandVersion:number;logoUrl:string|null;logoAssetId:string|null;brandNameAr:string|null;brandNameEn:string|null;footerAr:string|null;footerEn:string|null};
  template:{id:string;code:string;titleAr:string;titleEn:string;version:number;printable:boolean};
  fields:Array<{key:string;labelAr:string;labelEn:string;type:string;required:boolean;value:unknown}>;
  approvals:{createdByAccountId:string;approvedByAccountId:string|null;signedByAccountId:string|null;archivedByAccountId:string|null;approvedAt:Date|null;signedAt:Date|null;archivedAt:Date|null};
  createdAt:Date;
  updatedAt:Date;
  renderProfile?:'ADMINISTRATIVE_FORM_V1';
  cooperation?:Awaited<ReturnType<CooperationContractService['get']>>;
}

@Injectable()
export class DocumentPrintService {
  constructor(private readonly db:DatabaseService,private readonly authz:DocumentAuthorizationService,private readonly cooperation:CooperationContractService){}

  async contract(accountId:string,id:string):Promise<DocumentPrintContract>{
    const d=await this.db.managedDocument.findUnique({where:{id},include:{template:true,lifecycleEvents:{where:{action:'CREATE'},orderBy:{occurredAt:'asc'},take:2}}});
    if(!d) throw new NotFoundException('Document not found.');
    if(isLibraryCode(d.template.code)) throw new BadRequestException('القالب ليس عقداً منفذاً؛ افتحه من مكتبة العقود.');
    const cooperation=d.template.code===COOPERATION_CODE?await this.cooperation.get(accountId,id):undefined;
    if(cooperation&&(cooperation.version!==d.version||cooperation.contentHash!==d.contentHash||(cooperation.status==='APPROVED')!==(d.status==='SIGNED'))) throw new BadRequestException('تغير العقد أثناء إعداد النسخة؛ أعد المحاولة.');
    if(!cooperation) await this.authz.assert(accountId,d.organizationId,'DOCUMENT_READ');
    if(!d.template.printable) throw new BadRequestException('Document template is not printable.');
    // Only server-written creation evidence can select a new PDF composition.
    // Old records without a profile retain the legacy renderer, including signed
    // and archived records. Neither payload nor current organization branding can
    // retroactively select a different renderer.
    let renderProfile:DocumentPrintContract['renderProfile'];
    if(!cooperation){
      const created=d.lifecycleEvents??[];
      if(created.length>1)throw new BadRequestException('Document has conflicting creation evidence.');
      const metadata=created[0]?.metadata;
      const profile=metadata&&typeof metadata==='object'&&!Array.isArray(metadata)?(metadata as Record<string,unknown>).pdfProfile:undefined;
      if(profile!==undefined){
        if(profile!=='ADMINISTRATIVE_FORM_V1')throw new BadRequestException('Unsupported pinned document PDF profile.');
        renderProfile=profile;
      }
    }
    const brandVersion=d.documentBrandVersion;
    if(!brandVersion) throw new BadRequestException('Document branding version is not pinned.');
    const branding=await this.db.documentBrandSnapshot.findUnique({where:{organizationId_brandVersion:{organizationId:d.organizationId,brandVersion}}});
    if(!branding) throw new BadRequestException('Pinned document branding snapshot was not found.');
    const definitions=Array.isArray(d.template.fields)?d.template.fields as Array<Record<string,unknown>>:[];
    const payload=d.payload&&typeof d.payload==='object'&&!Array.isArray(d.payload)?d.payload as Record<string,unknown>:{};
    const fields=cooperation?[
      ...CONTRACT_FIELDS.map(([section,key,labelAr])=>({key:section+'.'+key,labelAr,labelEn:key,type:'TEXT',required:true,value:cooperation.values[section][key]})),
      ...cooperation.clauses.map((value,i)=>({key:'clause-'+i,labelAr:`البند ${i+1}`,labelEn:`Clause ${i+1}`,type:'TEXT',required:true,value})),
    ]:definitions.map(f=>({
      key:String(f.key??''),
      labelAr:String(f.labelAr??''),
      labelEn:String(f.labelEn??''),
      type:String(f.type??'TEXT'),
      required:Boolean(f.required),
      value:payload[String(f.key??'')]??null,
    }));
    return {
      documentId:d.id,organizationId:d.organizationId,referenceNumber:d.referenceNumber,department:d.department,status:d.status,
      documentVersion:d.version,contentHash:d.contentHash,
      branding:{brandVersion:branding.brandVersion,logoUrl:branding.logoUrl,logoAssetId:branding.logoAssetId,brandNameAr:branding.brandNameAr,brandNameEn:branding.brandNameEn,footerAr:branding.footerAr,footerEn:branding.footerEn},
      template:{id:d.template.id,code:d.template.code,titleAr:d.template.titleAr,titleEn:d.template.titleEn,version:d.template.version,printable:d.template.printable},
      fields,
      approvals:{createdByAccountId:d.createdByAccountId,approvedByAccountId:d.approvedByAccountId,signedByAccountId:d.signedByAccountId,archivedByAccountId:d.archivedByAccountId,approvedAt:d.approvedAt,signedAt:d.signedAt,archivedAt:d.archivedAt},
      createdAt:d.createdAt,updatedAt:d.updatedAt,
      ...(renderProfile?{renderProfile}:{}),
      ...(cooperation?{cooperation}:{}),
    };
  }
}
