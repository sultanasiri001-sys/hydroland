import { createHash } from 'node:crypto';

type UploadedCredentialFile={originalname:string;mimetype:string;buffer:Buffer;size:number};
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PolicyControlService } from '../trips/policy-control.service';

type CredentialWithDocuments = {
  id:string;
  personId:string;
  issuer:string;
  title:string;
  credentialNumber:string|null;
  issuedAt:Date|null;
  expiresAt:Date|null;
  verificationStatus:string;
  createdAt:Date;
  updatedAt:Date;
  documents:unknown[];
};

@Injectable()
export class CredentialsService {
  constructor(private readonly db:DatabaseService,private readonly policies:PolicyControlService,private readonly audit:AuditService,private readonly notifications:NotificationsService){}
  private async notifyQuietly(accountId:string,type:string,payload:Record<string,unknown>){try{await this.notifications.notify(accountId,type,payload);}catch{return;}}

  async list(accountId:string){
    const a=await this.db.account.findUniqueOrThrow({where:{id:accountId},select:{personId:true}});
    const [verificationPolicy,expiryPolicy]=await Promise.all([this.policies.decision('DOCUMENT','VERIFICATION'),this.policies.decision('DOCUMENT','EXPIRY')]);
    const rows=await this.db.credential.findMany({where:{personId:a.personId},include:{documents:{select:{id:true,credentialId:true,ownerId:true,storageKey:true,originalName:true,mimeType:true,byteSize:true,sha256:true,status:true,createdAt:true,archivedAt:true}}},orderBy:{createdAt:'desc'}}) as CredentialWithDocuments[];
    const now=new Date();
    return rows.map((credential:CredentialWithDocuments)=>{
      const verified=['VERIFIED','DOCUMENT_VERIFIED'].includes(credential.verificationStatus),expired=Boolean(credential.expiresAt&&credential.expiresAt<=now),issues:string[]=[];
      if(!verified&&!verificationPolicy.bypass)issues.push('DOCUMENT_VERIFICATION');
      if(expired&&!expiryPolicy.bypass)issues.push('DOCUMENT_EXPIRY');
      return {...credential,policyReview:{required:(verificationPolicy.review&&!verified)||(expiryPolicy.review&&expired),blocked:(verificationPolicy.enforce&&!verified)||(expiryPolicy.enforce&&expired),issues,states:{verification:verificationPolicy.state,expiry:expiryPolicy.state}}};
    });
  }

  async create(accountId:string,input:{issuer:string;title:string;credentialNumber?:string;issuedAt?:string;expiresAt?:string}){
    if(!input.issuer?.trim()||!input.title?.trim())throw new BadRequestException('Issuer and title are required.');
    const expiryPolicy=await this.policies.decision('DOCUMENT','EXPIRY');
    const issuedAt=input.issuedAt?new Date(input.issuedAt):undefined,expiresAt=input.expiresAt?new Date(input.expiresAt):undefined;
    if(issuedAt&&Number.isNaN(issuedAt.getTime()))throw new BadRequestException('Invalid issuedAt.');
    if(expiresAt&&Number.isNaN(expiresAt.getTime()))throw new BadRequestException('Invalid expiresAt.');
    const expired=Boolean(expiresAt&&expiresAt<=new Date());
    if(expired&&expiryPolicy.enforce)throw new ConflictException('Expired credentials cannot be created while expiry validation is enforced.');
    const a=await this.db.account.findUniqueOrThrow({where:{id:accountId},select:{personId:true}});
    const credential=await this.db.credential.create({data:{personId:a.personId,issuer:input.issuer.trim(),title:input.title.trim(),credentialNumber:input.credentialNumber?.trim()||null,issuedAt,expiresAt}});
    await this.audit.record({action:'CREDENTIAL_CREATED',resource:'Credential',resourceId:credential.id,metadata:{accountId,issuer:credential.issuer,title:credential.title,expiresAt:credential.expiresAt,policyState:expiryPolicy.state}});
    return {...credential,policyReview:{required:expired&&expiryPolicy.review,issues:expired?['DOCUMENT_EXPIRY']:[],states:{expiry:expiryPolicy.state}}};
  }

  async uploadDocument(accountId:string,credentialId:string,file:UploadedCredentialFile){
    const allowed=['application/pdf','image/jpeg','image/png'];
    if(!allowed.includes(file.mimetype)||!file.buffer?.length||file.buffer.length>10_000_000)throw new BadRequestException('Unsupported document.');
    const signatures:Record<string,(bytes:Buffer)=>boolean>={
      'application/pdf':bytes=>bytes.length>=5&&bytes.subarray(0,5).toString('ascii')==='%PDF-',
      'image/jpeg':bytes=>bytes.length>=3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff,
      'image/png':bytes=>bytes.length>=8&&bytes.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))
    };
    if(!signatures[file.mimetype]?.(file.buffer))throw new BadRequestException('Document content does not match its declared MIME type.');
    const account=await this.db.account.findUniqueOrThrow({where:{id:accountId},select:{personId:true}});
    const credential=await this.db.credential.findFirst({where:{id:credentialId,personId:account.personId,verificationStatus:'UNVERIFIED'}});
    if(!credential)throw new NotFoundException('Credential not editable.');
    const sha256=createHash('sha256').update(file.buffer).digest('hex');
    const existing=await this.db.document.findUnique({where:{sha256}});
    if(existing)throw new ConflictException('Document already uploaded.');
    const storageKey=`credential/${credentialId}/${sha256}`;
    const document=await this.db.document.create({data:{credentialId,ownerId:account.personId,storageKey,originalName:file.originalname,mimeType:file.mimetype,byteSize:file.buffer.length,sha256,content:new Uint8Array(file.buffer),status:'UPLOADED'}});
    await this.audit.record({action:'CREDENTIAL_DOCUMENT_UPLOADED',resource:'Credential',resourceId:credentialId,metadata:{accountId,documentId:document.id,mimeType:document.mimeType,byteSize:document.byteSize,sha256}});
    return {id:document.id,credentialId:document.credentialId,originalName:document.originalName,mimeType:document.mimeType,byteSize:document.byteSize,sha256:document.sha256,status:document.status,createdAt:document.createdAt};
  }

  async getDocumentContent(accountId:string,documentId:string){
    const account=await this.db.account.findUniqueOrThrow({where:{id:accountId},select:{personId:true,roleAssignments:{where:{status:'ACTIVE'},select:{role:true}}}});
    const reviewer=account.roleAssignments.some(item=>['ADMIN','REVIEWER'].includes(item.role));
    const document=await this.db.document.findUnique({where:{id:documentId},select:{id:true,ownerId:true,originalName:true,mimeType:true,content:true,status:true}});
    if(!document||(!reviewer&&document.ownerId!==account.personId))throw new NotFoundException('Document not found.');
    if(!document.content)throw new NotFoundException('Document content not available.');
    return {...document,content:Buffer.from(document.content)};
  }

  async attachDocument(accountId:string,credentialId:string,input:{storageKey:string;originalName:string;mimeType:string;byteSize:number;sha256:string}){
    if(!['application/pdf','image/jpeg','image/png'].includes(input.mimeType)||input.byteSize<1||input.byteSize>10_000_000)throw new BadRequestException('Unsupported document.');
    const a=await this.db.account.findUniqueOrThrow({where:{id:accountId},select:{personId:true}}),c=await this.db.credential.findFirst({where:{id:credentialId,personId:a.personId,verificationStatus:'UNVERIFIED'}});
    if(!c)throw new NotFoundException('Credential not editable.');
    const document=await this.db.document.create({data:{credentialId,ownerId:a.personId,...input,status:'UPLOADED'}});
    await this.audit.record({action:'CREDENTIAL_DOCUMENT_ATTACHED',resource:'Credential',resourceId:credentialId,metadata:{accountId,documentId:document.id,mimeType:document.mimeType,byteSize:document.byteSize,sha256:document.sha256}});
    return document;
  }

  async submit(accountId:string,credentialId:string){
    const verificationPolicy=await this.policies.decision('DOCUMENT','VERIFICATION');
    const a=await this.db.account.findUniqueOrThrow({where:{id:accountId},select:{personId:true}});
    const credential=await this.db.credential.findFirst({where:{id:credentialId,personId:a.personId,verificationStatus:'UNVERIFIED'},include:{documents:{select:{id:true,content:true,status:true}}}});
    if(!credential)throw new NotFoundException('Credential cannot be submitted.');
    const uploadedDocuments=credential.documents.filter(document=>document.status==='UPLOADED'&&document.content!==null);
    if(verificationPolicy.enforce&&!uploadedDocuments.length)throw new ConflictException('At least one uploaded supporting document is required while document verification is enforced.');
    if(verificationPolicy.bypass){
      await this.audit.record({action:'CREDENTIAL_VERIFICATION_BYPASSED',resource:'Credential',resourceId:credentialId,metadata:{accountId,policyState:verificationPolicy.state,documentCount:uploadedDocuments.length}});
      return{id:credentialId,status:credential.verificationStatus,verificationBypassed:true,policyReview:{required:false,issues:[],states:{verification:verificationPolicy.state}}};
    }
    const nextStatus='PENDING';
    await this.db.credential.update({where:{id:credentialId},data:{verificationStatus:nextStatus}});
    await this.audit.record({action:'CREDENTIAL_SUBMITTED',resource:'Credential',resourceId:credentialId,metadata:{accountId,previousStatus:credential.verificationStatus,status:nextStatus,policyState:verificationPolicy.state,documentCount:uploadedDocuments.length}});
    return{id:credentialId,status:nextStatus,verificationBypassed:false,policyReview:{required:verificationPolicy.review,issues:verificationPolicy.review?['DOCUMENT_VERIFICATION']:[],states:{verification:verificationPolicy.state}}};
  }

  pendingForAdmin(){
    return this.db.credential.findMany({where:{verificationStatus:'PENDING'},include:{documents:{select:{id:true,credentialId:true,ownerId:true,storageKey:true,originalName:true,mimeType:true,byteSize:true,sha256:true,status:true,createdAt:true,archivedAt:true}},person:{select:{id:true,firstName:true,lastName:true,account:{select:{id:true,email:true}}}}},orderBy:{updatedAt:'asc'},take:100});
  }

  async decide(reviewerAccountId:string,credentialId:string,input:{outcome:'VERIFIED'|'REJECTED';reason?:string}){
    if(!['VERIFIED','REJECTED'].includes(input.outcome))throw new BadRequestException('Invalid credential review outcome.');
    if(input.outcome==='REJECTED'&&(!input.reason?.trim()||input.reason.trim().length<5))throw new BadRequestException('A rejection reason of at least five characters is required.');
    const [verificationPolicy,expiryPolicy,reviewer]=await Promise.all([
      this.policies.decision('DOCUMENT','VERIFICATION'),
      this.policies.decision('DOCUMENT','EXPIRY'),
      this.db.account.findUnique({where:{id:reviewerAccountId},select:{personId:true}}),
    ]);
    const credential=await this.db.credential.findUnique({where:{id:credentialId},include:{documents:{select:{id:true,content:true,status:true}}}});
    if(!credential||credential.verificationStatus!=='PENDING')throw new NotFoundException('Credential is not awaiting review.');
    if(!reviewer)throw new NotFoundException('Reviewer account not found.');
    if(reviewer.personId===credential.personId)throw new ForbiddenException('Reviewers cannot verify or reject their own credential.');
    const expired=Boolean(credential.expiresAt&&credential.expiresAt<=new Date());
    if(input.outcome==='VERIFIED'&&expired&&expiryPolicy.enforce)throw new ConflictException('Expired credential cannot be verified while expiry validation is enforced.');
    const uploadedDocuments=credential.documents.filter(document=>document.status==='UPLOADED'&&document.content!==null);
    if(input.outcome==='VERIFIED'&&verificationPolicy.enforce&&!uploadedDocuments.length)throw new ConflictException('Uploaded supporting documents are required while document verification is enforced.');
    const updated=await this.db.$transaction(async(tx:Prisma.TransactionClient)=>{
      const row=await tx.credential.update({where:{id:credentialId},data:{verificationStatus:input.outcome}});
      if(uploadedDocuments.length)await tx.document.updateMany({where:{credentialId,id:{in:uploadedDocuments.map(document=>document.id)}},data:{status:input.outcome==='VERIFIED'?'AVAILABLE':'REJECTED'}});
      return row;
    });
    await this.audit.record({action:'CREDENTIAL_REVIEWED',resource:'Credential',resourceId:credentialId,metadata:{reviewerAccountId,previousStatus:credential.verificationStatus,status:input.outcome,reason:input.reason?.trim()||null,documentCount:uploadedDocuments.length,externalVerification:false,policyStates:{verification:verificationPolicy.state,expiry:expiryPolicy.state},expired}});
    const owner=await this.db.account.findUnique({where:{personId:credential.personId},select:{id:true}});
    if(owner)await this.notifyQuietly(owner.id,'CREDENTIAL_REVIEWED',{credentialId,title:credential.title,outcome:input.outcome,reason:input.reason?.trim()||null,externalVerification:false});
    return{...updated,externalVerification:false,policyReview:{required:expiryPolicy.review&&expired,issues:expiryPolicy.review&&expired?['DOCUMENT_EXPIRY']:[],states:{verification:verificationPolicy.state,expiry:expiryPolicy.state}}};
  }
}
