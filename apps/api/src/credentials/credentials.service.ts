import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PolicyControlService } from '../trips/policy-control.service';
import { CredentialObjectStorageService } from './credential-object-storage.service';

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
  documents:any[];
};

type ExternalCertificationVerificationInput={
  source:'PADI'|'SSI';
  method:'ECARD'|'QR';
  reference:string;
  verificationUrl?:string;
  checkedAt?:string;
};

type ExternalCertificationVerification={
  source:'PADI'|'SSI';
  method:'ECARD'|'QR';
  reference:string;
  verificationUrl:string|null;
  checkedAt:string;
};

@Injectable()
export class CredentialsService {
  constructor(private readonly db:DatabaseService,private readonly policies:PolicyControlService,private readonly audit:AuditService,private readonly notifications:NotificationsService,private readonly storage:CredentialObjectStorageService){}
  private async notifyQuietly(accountId:string,type:string,payload:Record<string,unknown>){try{await this.notifications.notify(accountId,type,payload);}catch{return;}}
  private publicDocument<T extends Record<string,unknown>>(document:T){const{storageKey:_storageKey,...safe}=document;return safe;}
  private publicCredential<T extends Record<string,any>>(credential:T){return{...credential,documents:Array.isArray(credential.documents)?credential.documents.map((document:Record<string,unknown>)=>this.publicDocument(document)):credential.documents};}

  async list(accountId:string){
    const a=await this.db.account.findUniqueOrThrow({where:{id:accountId},select:{personId:true}});
    const [verificationPolicy,expiryPolicy]=await Promise.all([this.policies.decision('DOCUMENT','VERIFICATION'),this.policies.decision('DOCUMENT','EXPIRY')]);
    const rows=await this.db.credential.findMany({where:{personId:a.personId},include:{documents:true},orderBy:{createdAt:'desc'}}) as CredentialWithDocuments[];
    const now=new Date();
    return rows.map((credential:CredentialWithDocuments)=>{
      const verified=['VERIFIED','DOCUMENT_VERIFIED'].includes(credential.verificationStatus),expired=Boolean(credential.expiresAt&&credential.expiresAt<=now),issues:string[]=[];
      if(!verified&&!verificationPolicy.bypass)issues.push('DOCUMENT_VERIFICATION');
      if(expired&&!expiryPolicy.bypass)issues.push('DOCUMENT_EXPIRY');
      return this.publicCredential({...credential,policyReview:{required:(verificationPolicy.review&&!verified)||(expiryPolicy.review&&expired),blocked:(verificationPolicy.enforce&&!verified)||(expiryPolicy.enforce&&expired),issues,states:{verification:verificationPolicy.state,expiry:expiryPolicy.state}}});
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

  async attachDocument(accountId:string,credentialId:string,input:{originalName:string;mimeType:string;base64:string}){
    const originalName=this.cleanName(input.originalName),mimeType=String(input.mimeType||'').trim().toLowerCase(),bytes=this.decode(input.base64);
    this.validateFile(originalName,mimeType,bytes);
    const a=await this.db.account.findUniqueOrThrow({where:{id:accountId},select:{personId:true}}),credential=await this.db.credential.findFirst({where:{id:credentialId,personId:a.personId,verificationStatus:'UNVERIFIED'}});
    if(!credential)throw new NotFoundException('Credential not editable.');
    const sha256=createHash('sha256').update(bytes).digest('hex');
    if(await this.db.document.findUnique({where:{sha256},select:{id:true}}))throw new ConflictException('This document has already been uploaded.');
    const storageKey=this.storage.key(accountId,credentialId,mimeType);
    await this.storage.put(storageKey,bytes,mimeType);
    try{
      const document=await this.db.document.create({data:{credentialId,ownerId:a.personId,storageKey,originalName,mimeType,byteSize:bytes.length,sha256,status:'UPLOADED'}});
      await this.audit.record({action:'CREDENTIAL_DOCUMENT_ATTACHED',resource:'Credential',resourceId:credentialId,metadata:{accountId,documentId:document.id,mimeType,byteSize:bytes.length,sha256}});
      return this.publicDocument(document as unknown as Record<string,unknown>);
    }catch(error){await this.storage.delete(storageKey);throw error;}
  }

  async documentAccess(accountId:string,credentialId:string,documentId:string){
    const a=await this.db.account.findUniqueOrThrow({where:{id:accountId},select:{personId:true}});
    const document=await this.db.document.findFirst({where:{id:documentId,credentialId,ownerId:a.personId,status:{not:'ARCHIVED'}}});
    if(!document)throw new NotFoundException('Document not found.');
    if(!await this.storage.exists(document.storageKey))throw new NotFoundException('Document bytes not found.');
    const access=this.storage.signedGet(document.storageKey,300);
    await this.audit.record({action:'CREDENTIAL_DOCUMENT_ACCESS_ISSUED',resource:'Document',resourceId:document.id,metadata:{accountId,credentialId,mode:'OWNER',expiresAt:access.expiresAt}});
    return access;
  }

  async reviewerDocumentAccess(reviewerAccountId:string,credentialId:string,documentId:string){
    const credential=await this.db.credential.findFirst({where:{id:credentialId,verificationStatus:'PENDING'},select:{id:true}});
    if(!credential)throw new NotFoundException('Credential is not awaiting review.');
    const document=await this.db.document.findFirst({where:{id:documentId,credentialId,status:{not:'ARCHIVED'}}});
    if(!document)throw new NotFoundException('Document not found.');
    if(!await this.storage.exists(document.storageKey))throw new NotFoundException('Document bytes not found.');
    const access=this.storage.signedGet(document.storageKey,300);
    await this.audit.record({action:'CREDENTIAL_DOCUMENT_ACCESS_ISSUED',resource:'Document',resourceId:document.id,metadata:{accountId:reviewerAccountId,credentialId,mode:'REVIEW',expiresAt:access.expiresAt}});
    return access;
  }

  async submit(accountId:string,credentialId:string){
    const verificationPolicy=await this.policies.decision('DOCUMENT','VERIFICATION');
    const a=await this.db.account.findUniqueOrThrow({where:{id:accountId},select:{personId:true}});
    const credential=await this.db.credential.findFirst({where:{id:credentialId,personId:a.personId,verificationStatus:'UNVERIFIED'},include:{documents:true}});
    if(!credential)throw new NotFoundException('Credential cannot be submitted.');
    if(verificationPolicy.enforce&&!credential.documents.length)throw new ConflictException('At least one supporting document is required while document verification is enforced.');
    if(credential.documents.length){let realDocuments=0;for(const document of credential.documents){if(document.status!=='ARCHIVED'&&await this.storage.exists(document.storageKey))realDocuments++;}if(!realDocuments)throw new ConflictException('At least one uploaded document must exist in private storage before verification.');}
    if(verificationPolicy.bypass){
      await this.audit.record({action:'CREDENTIAL_VERIFICATION_BYPASSED',resource:'Credential',resourceId:credentialId,metadata:{accountId,policyState:verificationPolicy.state,documentCount:credential.documents.length}});
      return{id:credentialId,status:credential.verificationStatus,verificationBypassed:true,policyReview:{required:false,issues:[],states:{verification:verificationPolicy.state}}};
    }
    const nextStatus='PENDING';
    await this.db.credential.update({where:{id:credentialId},data:{verificationStatus:nextStatus}});
    await this.audit.record({action:'CREDENTIAL_SUBMITTED',resource:'Credential',resourceId:credentialId,metadata:{accountId,previousStatus:credential.verificationStatus,status:nextStatus,policyState:verificationPolicy.state,documentCount:credential.documents.length}});
    return{id:credentialId,status:nextStatus,verificationBypassed:false,policyReview:{required:verificationPolicy.review,issues:verificationPolicy.review?['DOCUMENT_VERIFICATION']:[],states:{verification:verificationPolicy.state}}};
  }

  async pendingForAdmin(){
    const rows=await this.db.credential.findMany({where:{verificationStatus:'PENDING'},include:{documents:true,person:{select:{id:true,firstName:true,lastName:true,account:{select:{id:true,email:true}}}}},orderBy:{updatedAt:'asc'},take:100});
    return rows.map(row=>this.publicCredential(row as unknown as Record<string,any>));
  }

  async decide(reviewerAccountId:string,credentialId:string,input:{outcome:'VERIFIED'|'REJECTED';reason?:string;externalVerification?:ExternalCertificationVerificationInput}){
    if(!['VERIFIED','REJECTED'].includes(input.outcome))throw new BadRequestException('Invalid credential review outcome.');
    if(input.outcome==='REJECTED'&&(!input.reason?.trim()||input.reason.trim().length<5))throw new BadRequestException('A rejection reason of at least five characters is required.');
    const externalVerification=input.externalVerification?this.externalCertificationVerification(input.externalVerification):null;
    const [verificationPolicy,expiryPolicy,reviewer]=await Promise.all([
      this.policies.decision('DOCUMENT','VERIFICATION'),
      this.policies.decision('DOCUMENT','EXPIRY'),
      this.db.account.findUnique({where:{id:reviewerAccountId},select:{personId:true}}),
    ]);
    const credential=await this.db.credential.findUnique({where:{id:credentialId},include:{documents:true}});
    if(!credential||credential.verificationStatus!=='PENDING')throw new NotFoundException('Credential is not awaiting review.');
    if(!reviewer)throw new NotFoundException('Reviewer account not found.');
    if(reviewer.personId===credential.personId)throw new ForbiddenException('Reviewers cannot verify or reject their own credential.');
    const expired=Boolean(credential.expiresAt&&credential.expiresAt<=new Date());
    if(input.outcome==='VERIFIED'&&expired&&expiryPolicy.enforce)throw new ConflictException('Expired credential cannot be verified while expiry validation is enforced.');
    if(input.outcome==='VERIFIED'&&verificationPolicy.enforce&&!credential.documents.length)throw new ConflictException('Supporting documents are required while document verification is enforced.');
    if(input.outcome==='VERIFIED'){let realDocuments=0;for(const document of credential.documents){if(document.status!=='ARCHIVED'&&await this.storage.exists(document.storageKey))realDocuments++;}if(verificationPolicy.enforce&&!realDocuments)throw new ConflictException('Uploaded credential evidence is unavailable in private storage.');}
    const updated=await this.db.$transaction(async(tx:Prisma.TransactionClient)=>{
      const row=await tx.credential.update({where:{id:credentialId},data:{verificationStatus:input.outcome}});
      if(credential.documents.length)await tx.document.updateMany({where:{credentialId},data:{status:input.outcome==='VERIFIED'?'AVAILABLE':'REJECTED'}});
      return row;
    });
    await this.audit.record({action:'CREDENTIAL_REVIEWED',resource:'Credential',resourceId:credentialId,metadata:{reviewerAccountId,previousStatus:credential.verificationStatus,status:input.outcome,reason:input.reason?.trim()||null,documentCount:credential.documents.length,externalVerification:Boolean(externalVerification),externalVerificationEvidence:externalVerification,policyStates:{verification:verificationPolicy.state,expiry:expiryPolicy.state},expired}});
    const owner=await this.db.account.findUnique({where:{personId:credential.personId},select:{id:true}});
    if(owner)await this.notifyQuietly(owner.id,'CREDENTIAL_REVIEWED',{credentialId,title:credential.title,outcome:input.outcome,reason:input.reason?.trim()||null,externalVerification:Boolean(externalVerification),externalVerificationSource:externalVerification?.source||null});
    return{...updated,externalVerification:Boolean(externalVerification),externalVerificationEvidence:externalVerification,policyReview:{required:expiryPolicy.review&&expired,issues:expiryPolicy.review&&expired?['DOCUMENT_EXPIRY']:[],states:{verification:verificationPolicy.state,expiry:expiryPolicy.state}}};
  }

  private externalCertificationVerification(input:ExternalCertificationVerificationInput):ExternalCertificationVerification{
    const source=String(input.source||'').trim().toUpperCase();
    const method=String(input.method||'').trim().toUpperCase();
    if(source!=='PADI'&&source!=='SSI')throw new BadRequestException('Unsupported external certification source.');
    if(source==='PADI'&&method!=='ECARD')throw new BadRequestException('PADI manual verification must use eCard evidence.');
    if(source==='SSI'&&method!=='QR')throw new BadRequestException('SSI manual verification must use QR evidence.');
    const reference=String(input.reference||'').trim();
    if(reference.length<3||reference.length>200)throw new BadRequestException('External certification verification reference must be between 3 and 200 characters.');
    const checkedAtDate=input.checkedAt?new Date(input.checkedAt):new Date();
    if(Number.isNaN(checkedAtDate.getTime()))throw new BadRequestException('Invalid external certification verification time.');
    if(checkedAtDate.getTime()>Date.now()+5*60_000)throw new BadRequestException('External certification verification time cannot be in the future.');
    let verificationUrl:string|null=null;
    if(input.verificationUrl){
      let url:URL;try{url=new URL(input.verificationUrl.trim());}catch{throw new BadRequestException('Invalid external certification verification URL.');}
      if(url.protocol!=='https:'||url.username||url.password)throw new BadRequestException('External certification verification URL must use HTTPS without embedded credentials.');
      const host=url.hostname.toLowerCase();
      const hostAllowed=source==='PADI'?(host==='padi.com'||host.endsWith('.padi.com')):(host==='divessi.com'||host.endsWith('.divessi.com'));
      if(!hostAllowed)throw new BadRequestException('External certification verification URL does not match the selected issuer.');
      url.hash='';verificationUrl=url.toString();
    }
    return{source:source as 'PADI'|'SSI',method:method as 'ECARD'|'QR',reference,verificationUrl,checkedAt:checkedAtDate.toISOString()};
  }

  private cleanName(value:string){const name=String(value||'').split(/[\\/]/).pop()?.trim()||'';if(!name||name.length>180)throw new BadRequestException('Invalid document file name.');return name;}
  private decode(value:string){const base64=String(value||'').trim();if(!base64||base64.length>13_400_000||base64.length%4!==0||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64))throw new BadRequestException('Invalid document payload.');const bytes=Buffer.from(base64,'base64');if(!bytes.length||bytes.length>10_000_000)throw new BadRequestException('Document must be between 1 byte and 10 MB.');return bytes;}
  private validateFile(originalName:string,mimeType:string,bytes:Buffer){
    if(!['application/pdf','image/jpeg','image/png'].includes(mimeType))throw new BadRequestException('Only PDF, JPEG and PNG documents are supported.');
    const lower=originalName.toLowerCase(),extensionOk=mimeType==='application/pdf'?lower.endsWith('.pdf'):mimeType==='image/png'?lower.endsWith('.png'):lower.endsWith('.jpg')||lower.endsWith('.jpeg');
    if(!extensionOk)throw new BadRequestException('File extension does not match the declared content type.');
    const signatureOk=mimeType==='application/pdf'?bytes.subarray(0,5).toString('ascii')==='%PDF-':mimeType==='image/png'?bytes.length>=8&&bytes.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])):bytes.length>=3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff;
    if(!signatureOk)throw new BadRequestException('Document signature does not match the declared content type.');
  }
}
