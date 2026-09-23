import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ManagedDocumentStatus, Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { DocumentAuthorizationService } from './document-authorization.service';

type Field={key:string;labelAr:string;labelEn:string;type:string;required:boolean;options?:string[]};
@Injectable()
export class DocumentPersistenceService {
  constructor(private readonly db: DatabaseService, private readonly authz: DocumentAuthorizationService) {}

  async createTemplate(accountId:string,input:{organizationId:string;code:string;titleAr:string;titleEn:string;department:string;fields:Field[];printable?:boolean}){
    await this.authz.assert(accountId,input.organizationId,'TEMPLATE_CREATE');
    if(!input.code?.trim()||!input.titleAr?.trim()||!input.titleEn?.trim()||!input.department||!input.fields?.length) throw new BadRequestException('Template identity and fields are required.');
    return this.db.documentTemplate.create({data:{organizationId:input.organizationId,code:input.code,titleAr:input.titleAr,titleEn:input.titleEn,department:input.department,fields:input.fields as never,printable:input.printable!==false}});
  }

  async listTemplates(accountId:string,organizationId:string,department?:string){
    await this.authz.assert(accountId,organizationId,'TEMPLATE_LIST');
    return this.db.documentTemplate.findMany({where:{organizationId,status:'ACTIVE',...(department?{department}:{})},orderBy:[{department:'asc'},{code:'asc'}]});
  }

  async createDocument(accountId:string,input:{organizationId:string;templateId:string;department:string;contentHash:string;payload:Record<string,unknown>}){
    await this.authz.assert(accountId,input.organizationId,'DOCUMENT_CREATE');
    const t=await this.db.documentTemplate.findFirst({where:{id:input.templateId,organizationId:input.organizationId,status:'ACTIVE'}});
    if(!t) throw new NotFoundException('Active document template not found in organization scope.');
    if(t.department!==input.department) throw new BadRequestException('Document department does not match template.');
    if(!input.contentHash?.trim()) throw new BadRequestException('Content hash is required.');
    return this.db.serializable(async tx=>{
      const year=new Date().getUTCFullYear();
      const counter=await tx.documentReferenceCounter.upsert({
        where:{organizationId_department_year:{organizationId:input.organizationId,department:t.department,year}},
        create:{organizationId:input.organizationId,department:t.department,year,lastNumber:1},
        update:{lastNumber:{increment:1}},
      });
      const sequence=String(counter.lastNumber).padStart(6,'0');
      const referenceNumber=`HYD-${t.department}-${year}-${sequence}`;
      const d=await tx.managedDocument.create({data:{organizationId:input.organizationId,templateId:t.id,referenceNumber,department:t.department,contentHash:input.contentHash,payload:input.payload as Prisma.InputJsonValue,createdByAccountId:accountId}});
      await tx.documentLifecycleEvent.create({data:{documentId:d.id,actorAccountId:accountId,action:'CREATE',toStatus:ManagedDocumentStatus.DRAFT,version:d.version}});
      return d;
    });
  }

  async transition(accountId:string,id:string,to:ManagedDocumentStatus){
    const d=await this.db.managedDocument.findUnique({where:{id}});
    if(!d) throw new NotFoundException('Document not found.');
    await this.authz.assert(accountId,d.organizationId,to==='PENDING_APPROVAL'?'SUBMIT':to==='APPROVED'?'APPROVE':to==='SIGNED'?'SIGN':'ARCHIVE');
    const allowed:Record<string,string[]>={DRAFT:['PENDING_APPROVAL'],PENDING_APPROVAL:['APPROVED'],APPROVED:['SIGNED'],SIGNED:['ARCHIVED'],ARCHIVED:[]};
    if(!allowed[d.status]?.includes(to)) throw new BadRequestException(`Invalid document transition ${d.status} -> ${to}`);
    if(to==='APPROVED' && accountId===d.createdByAccountId) throw new BadRequestException('Creator cannot approve own document.');
    if(to==='SIGNED' && (accountId===d.createdByAccountId||accountId===d.approvedByAccountId)) throw new BadRequestException('Signer must be independent from creator and approver.');
    return this.db.serializable(async tx=>{
      const data:any={status:to};
      if(to==='APPROVED'){data.approvedByAccountId=accountId;data.approvedAt=new Date();}
      if(to==='SIGNED'){data.signedByAccountId=accountId;data.signedAt=new Date();}
      if(to==='ARCHIVED'){data.archivedByAccountId=accountId;data.archivedAt=new Date();}
      const updated=await tx.managedDocument.update({where:{id},data});
      await tx.documentLifecycleEvent.create({data:{documentId:id,actorAccountId:accountId,action:to,fromStatus:d.status,toStatus:to,version:updated.version}});
      return updated;
    });
  }

  async get(accountId:string,id:string){
    const d=await this.db.managedDocument.findUnique({where:{id},include:{lifecycleEvents:{orderBy:{occurredAt:'asc'}},template:true}});
    if(!d) throw new NotFoundException('Document not found.');
    await this.authz.assert(accountId,d.organizationId,'DOCUMENT_READ');
    return d;
  }
}
