import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
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
  constructor(private readonly db:DatabaseService,private readonly policies:PolicyControlService){}

  async list(accountId:string){
    const a=await this.db.account.findUniqueOrThrow({where:{id:accountId},select:{personId:true}});
    const [verificationPolicy,expiryPolicy]=await Promise.all([this.policies.decision('DOCUMENT','VERIFICATION'),this.policies.decision('DOCUMENT','EXPIRY')]);
    const rows=await this.db.credential.findMany({where:{personId:a.personId},include:{documents:true},orderBy:{createdAt:'desc'}}) as CredentialWithDocuments[];
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
    const credential=await this.db.credential.create({data:{personId:a.personId,issuer:input.issuer.trim(),title:input.title.trim(),credentialNumber:input.credentialNumber,issuedAt,expiresAt}});
    return {...credential,policyReview:{required:expired&&expiryPolicy.review,issues:expired?['DOCUMENT_EXPIRY']:[],states:{expiry:expiryPolicy.state}}};
  }

  async attachDocument(accountId:string,credentialId:string,input:{storageKey:string;originalName:string;mimeType:string;byteSize:number;sha256:string}){
    if(!['application/pdf','image/jpeg','image/png'].includes(input.mimeType)||input.byteSize<1||input.byteSize>10_000_000)throw new BadRequestException('Unsupported document.');
    const a=await this.db.account.findUniqueOrThrow({where:{id:accountId},select:{personId:true}}),c=await this.db.credential.findFirst({where:{id:credentialId,personId:a.personId,verificationStatus:'UNVERIFIED'}});
    if(!c)throw new NotFoundException('Credential not editable.');
    return this.db.document.create({data:{credentialId,ownerId:a.personId,...input,status:'UPLOADED'}});
  }

  async submit(accountId:string,credentialId:string){
    const verificationPolicy=await this.policies.decision('DOCUMENT','VERIFICATION');
    const a=await this.db.account.findUniqueOrThrow({where:{id:accountId},select:{personId:true}});
    const credential=await this.db.credential.findFirst({where:{id:credentialId,personId:a.personId,verificationStatus:'UNVERIFIED'},include:{documents:true}});
    if(!credential)throw new NotFoundException('Credential cannot be submitted.');
    if(verificationPolicy.enforce&&!credential.documents.length)throw new ConflictException('At least one supporting document is required while document verification is enforced.');
    const nextStatus=verificationPolicy.bypass?'DOCUMENT_VERIFIED':'PENDING';
    await this.db.credential.update({where:{id:credentialId},data:{verificationStatus:nextStatus}});
    return{id:credentialId,status:nextStatus,policyReview:{required:verificationPolicy.review,issues:verificationPolicy.review?['DOCUMENT_VERIFICATION']:[],states:{verification:verificationPolicy.state}}};
  }
}
