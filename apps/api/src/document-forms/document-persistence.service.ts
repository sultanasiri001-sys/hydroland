import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ManagedDocumentStatus, Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { DocumentAuthorizationService } from './document-authorization.service';
import { COOPERATION_CODE } from './cooperation-contract.domain';
import { isLibraryCode, LIBRARY_PREFIX } from './contract-library.domain';
import { DOCUMENT_DEPARTMENTS } from './document-form.domain';
import { templateObject, templateText, templateFields, assertCompatibleTemplateFields } from './document-template-input';

type Field={key:string;labelAr:string;labelEn:string;type:string;required:boolean;options?:string[]};
@Injectable()
export class DocumentPersistenceService {
  constructor(private readonly db: DatabaseService, private readonly authz: DocumentAuthorizationService) {}

  async createTemplate(accountId:string,input:{organizationId:string;code:string;titleAr:string;titleEn:string;department:string;fields:Field[];printable?:boolean}){
    templateObject(input,['organizationId','code','titleAr','titleEn','department','fields','printable']);
    if(typeof input.organizationId!=='string'||!input.organizationId.trim())throw new BadRequestException('Organization scope is required.');
    await this.authz.assert(accountId,input.organizationId,'TEMPLATE_CREATE');
    if(input.code===COOPERATION_CODE||isLibraryCode(String(input.code??'').trim().toUpperCase())) throw new ForbiddenException('نموذج العقد محكوم بمكتبة العقود ومسار التوقيع.');
    const code=templateText(input.code,'Template code');
    if(code===COOPERATION_CODE||isLibraryCode(code))throw new ForbiddenException('استخدم مسار العقود المتخصص.');
    if(!/^[A-Z][A-Z0-9-]{0,99}$/.test(code)||!DOCUMENT_DEPARTMENTS.includes(input.department as never))throw new BadRequestException('Invalid template code or department.');
    const titleAr=templateText(input.titleAr,'Arabic title'),titleEn=templateText(input.titleEn,'English title'),fields=templateFields(input.fields);
    return this.db.serializable(async tx=>{await this.authz.assert(accountId,input.organizationId,'TEMPLATE_CREATE',tx);return tx.documentTemplate.create({data:{organizationId:input.organizationId,code,titleAr,titleEn,department:input.department,fields:fields as never,printable:input.printable!==false}});});
  }

  async updateTemplate(accountId:string,id:string,input:{titleAr?:string;titleEn?:string;fields?:Field[];printable?:boolean}){
    templateObject(input,['titleAr','titleEn','fields','printable']);
    const current=await this.db.documentTemplate.findUnique({where:{id}});
    if(!current) throw new NotFoundException('Document template not found.');
    if(current.code===COOPERATION_CODE||isLibraryCode(current.code)) throw new ForbiddenException('نموذج العقد محدد الإصدار ولا يعدل من مسار المستندات.');
    await this.authz.assert(accountId,current.organizationId,'TEMPLATE_UPDATE');
    if(current.status!=='ACTIVE') throw new BadRequestException('Only ACTIVE templates can be revised.');
    const titleAr=templateText(input.titleAr??current.titleAr,'Arabic title');
    const titleEn=templateText(input.titleEn??current.titleEn,'English title');
    const fields=templateFields(input.fields??current.fields);
    assertCompatibleTemplateFields(current.fields,fields);
    return this.db.serializable(async tx=>{
      await this.authz.assert(accountId,current.organizationId,'TEMPLATE_UPDATE',tx);
      const latest=await tx.documentTemplate.findUnique({where:{id}});
      if(!latest||latest.status!=='ACTIVE'||latest.version!==current.version) throw new BadRequestException('Template changed concurrently; reload before revising.');
      await tx.documentTemplate.update({where:{id},data:{status:'INACTIVE'}});
      return tx.documentTemplate.create({data:{organizationId:current.organizationId,code:current.code,titleAr,titleEn,department:current.department,version:current.version+1,status:'ACTIVE',printable:input.printable??current.printable,fields:fields as never}});
    });
  }

  async listTemplates(accountId:string,organizationId:string,department?:string){
    await this.authz.assert(accountId,organizationId,'TEMPLATE_LIST');
    return this.db.documentTemplate.findMany({where:{organizationId,status:'ACTIVE',NOT:[{code:COOPERATION_CODE},{code:{startsWith:LIBRARY_PREFIX}}],...(department?{department}:{})},orderBy:[{department:'asc'},{code:'asc'}]});
  }

  async createDocument(accountId:string,input:{organizationId:string;templateId:string;department:string;contentHash:string;payload:Record<string,unknown>}){
    await this.authz.assert(accountId,input.organizationId,'DOCUMENT_CREATE');
    const t=await this.db.documentTemplate.findFirst({where:{id:input.templateId,organizationId:input.organizationId,status:'ACTIVE'}});
    if(!t) throw new NotFoundException('Active document template not found in organization scope.');
    if(t.code===COOPERATION_CODE||isLibraryCode(t.code)) throw new ForbiddenException('أنشئ العقد من مساحة العقود لضبط الأطراف والتوقيعات.');
    if(t.department!==input.department) throw new BadRequestException('Document department does not match template.');
    if(!input.contentHash?.trim()) throw new BadRequestException('Content hash is required.');
    return this.db.serializable(async tx=>{
      await this.authz.assert(accountId,input.organizationId,'DOCUMENT_CREATE',tx);
      const live=await tx.documentTemplate.findFirst({where:{id:t.id,organizationId:input.organizationId,status:'ACTIVE'}});
      if(!live||live.version!==t.version)throw new BadRequestException('Template changed concurrently; reload before creating a document.');
      const year=new Date().getUTCFullYear();
      const counter=await tx.documentReferenceCounter.upsert({
        where:{organizationId_department_year:{organizationId:input.organizationId,department:t.department,year}},
        create:{organizationId:input.organizationId,department:t.department,year,lastNumber:1},
        update:{lastNumber:{increment:1}},
      });
      const sequence=String(counter.lastNumber).padStart(6,'0');
      const referenceNumber=`HYD-${t.department}-${year}-${sequence}`;
      const org=await tx.organization.findUnique({where:{id:input.organizationId},select:{documentBrandVersion:true,documentLogoAssetId:true,documentBrandNameAr:true,documentBrandNameEn:true,documentFooterAr:true,documentFooterEn:true,displayName:true}});
      if(!org) throw new NotFoundException('Organization not found.');
      const snapshot=await tx.documentBrandSnapshot.findUnique({where:{organizationId_brandVersion:{organizationId:input.organizationId,brandVersion:org.documentBrandVersion}}});
      if(!snapshot){
        if(org.documentBrandVersion!==1) throw new BadRequestException('Organization branding snapshot invariant is broken.');
        await tx.documentBrandSnapshot.create({data:{organizationId:input.organizationId,brandVersion:1,logoAssetId:org.documentLogoAssetId,brandNameAr:org.documentBrandNameAr??org.displayName,brandNameEn:org.documentBrandNameEn??org.displayName,footerAr:org.documentFooterAr,footerEn:org.documentFooterEn}});
      }
      const d=await tx.managedDocument.create({data:{organizationId:input.organizationId,templateId:t.id,referenceNumber,department:t.department,contentHash:input.contentHash,documentBrandVersion:org.documentBrandVersion,payload:input.payload as Prisma.InputJsonValue,createdByAccountId:accountId}});
      await tx.documentRevision.create({data:{documentId:d.id,version:d.version,contentHash:d.contentHash,payload:d.payload as Prisma.InputJsonValue,createdByAccountId:accountId}});
      // Server-owned presentation evidence is pinned only for newly created
      // administrative documents. Do not backfill or revise existing records.
      await tx.documentLifecycleEvent.create({data:{documentId:d.id,actorAccountId:accountId,action:'CREATE',toStatus:ManagedDocumentStatus.DRAFT,version:d.version,metadata:{pdfProfile:'ADMINISTRATIVE_FORM_V1'} as Prisma.InputJsonValue}});
      return d;
    });
  }

  async revise(accountId:string,id:string,input:{contentHash:string;payload:Record<string,unknown>}){
    const d=await this.db.managedDocument.findUnique({where:{id},include:{template:true}});
    if(!d) throw new NotFoundException('Document not found.');
    this.assertGeneric(d.template.code);
    await this.authz.assert(accountId,d.organizationId,'REVISE');
    if(d.status!=='DRAFT') throw new BadRequestException('Only DRAFT documents can be revised. Approved, signed and archived records are immutable.');
    if(!input.contentHash?.trim()) throw new BadRequestException('Content hash is required.');
    return this.db.serializable(async tx=>{
      await this.authz.assert(accountId,d.organizationId,'REVISE',tx);
      const current=await tx.managedDocument.findUnique({where:{id}});
      if(!current) throw new NotFoundException('Document not found.');
      if(current.status!=='DRAFT'||current.version!==d.version) throw new BadRequestException('Document changed concurrently; reload before revising.');
      const nextVersion=current.version+1;
      const claimed=await tx.managedDocument.updateMany({where:{id,status:'DRAFT',version:current.version},data:{contentHash:input.contentHash,payload:input.payload as Prisma.InputJsonValue,version:{increment:1}}});
      if(claimed.count!==1) throw new BadRequestException('Document changed concurrently; reload before revising.');
      const updated=await tx.managedDocument.findUniqueOrThrow({where:{id}});
      await tx.documentRevision.create({data:{documentId:id,version:nextVersion,contentHash:updated.contentHash,payload:updated.payload as Prisma.InputJsonValue,createdByAccountId:accountId}});
      await tx.documentLifecycleEvent.create({data:{documentId:id,actorAccountId:accountId,action:'REVISE',fromStatus:ManagedDocumentStatus.DRAFT,toStatus:ManagedDocumentStatus.DRAFT,version:nextVersion,metadata:{previousVersion:current.version} as Prisma.InputJsonValue}});
      return updated;
    });
  }

  async transition(accountId:string,id:string,to:ManagedDocumentStatus){
    const d=await this.db.managedDocument.findUnique({where:{id},include:{template:true}});
    if(!d) throw new NotFoundException('Document not found.');
    this.assertGeneric(d.template.code);
    await this.authz.assert(accountId,d.organizationId,to==='PENDING_APPROVAL'?'SUBMIT':to==='APPROVED'?'APPROVE':to==='SIGNED'?'SIGN':'ARCHIVE');
    const allowed:Record<string,string[]>={DRAFT:['PENDING_APPROVAL'],PENDING_APPROVAL:['APPROVED'],APPROVED:['SIGNED'],SIGNED:['ARCHIVED'],ARCHIVED:[]};
    if(!allowed[d.status]?.includes(to)) throw new BadRequestException(`Invalid document transition ${d.status} -> ${to}`);
    if(to==='APPROVED' && accountId===d.createdByAccountId) throw new BadRequestException('Creator cannot approve own document.');
    if(to==='SIGNED' && (accountId===d.createdByAccountId||accountId===d.approvedByAccountId)) throw new BadRequestException('Signer must be independent from creator and approver.');
    return this.db.serializable(async tx=>{
      await this.authz.assert(accountId,d.organizationId,to==='PENDING_APPROVAL'?'SUBMIT':to==='APPROVED'?'APPROVE':to==='SIGNED'?'SIGN':'ARCHIVE',tx);
      const current=await tx.managedDocument.findUnique({where:{id}});
      if(!current) throw new NotFoundException('Document not found.');
      if(current.status!==d.status||current.version!==d.version) throw new BadRequestException('Document status or version changed concurrently; reload before transition.');
      const data:any={status:to};
      if(to==='APPROVED'){data.approvedByAccountId=accountId;data.approvedAt=new Date();}
      if(to==='SIGNED'){data.signedByAccountId=accountId;data.signedAt=new Date();}
      if(to==='ARCHIVED'){data.archivedByAccountId=accountId;data.archivedAt=new Date();}
      const claimed=await tx.managedDocument.updateMany({where:{id,status:d.status,version:d.version},data});
      if(claimed.count!==1) throw new BadRequestException('Document status changed concurrently; retry transition.');
      const updated=await tx.managedDocument.findUniqueOrThrow({where:{id}});
      await tx.documentLifecycleEvent.create({data:{documentId:id,actorAccountId:accountId,action:to,fromStatus:d.status,toStatus:to,version:updated.version}});
      return updated;
    });
  }

  async listRevisions(accountId:string,id:string){
    const d=await this.db.managedDocument.findUnique({where:{id},select:{organizationId:true,template:{select:{code:true}}}});
    if(!d) throw new NotFoundException('Document not found.');
    this.assertGeneric(d.template.code);
    await this.authz.assert(accountId,d.organizationId,'DOCUMENT_READ');
    return this.db.documentRevision.findMany({where:{documentId:id},orderBy:{version:'asc'}});
  }

  async getRevision(accountId:string,id:string,version:number){
    if(!Number.isInteger(version)||version<1) throw new BadRequestException('Revision version must be a positive integer.');
    const d=await this.db.managedDocument.findUnique({where:{id},select:{organizationId:true,template:{select:{code:true}}}});
    if(!d) throw new NotFoundException('Document not found.');
    this.assertGeneric(d.template.code);
    await this.authz.assert(accountId,d.organizationId,'DOCUMENT_READ');
    const revision=await this.db.documentRevision.findUnique({where:{documentId_version:{documentId:id,version}}});
    if(!revision) throw new NotFoundException('Document revision not found.');
    return revision;
  }

  async get(accountId:string,id:string){
    const d=await this.db.managedDocument.findUnique({where:{id},include:{lifecycleEvents:{orderBy:{occurredAt:'asc'}},template:true}});
    if(!d) throw new NotFoundException('Document not found.');
    this.assertGeneric(d.template.code);
    await this.authz.assert(accountId,d.organizationId,'DOCUMENT_READ');
    return d;
  }

  private assertGeneric(code:string){
    if(code===COOPERATION_CODE||isLibraryCode(code)) throw new ForbiddenException('استخدم مكتبة العقود أو مساحة أطراف العقد.');
  }
}
