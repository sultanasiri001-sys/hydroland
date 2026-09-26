import { BadGatewayException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { IntegrationService } from './integration.service';

type Signer={name:string;email:string};
type CreateRequestInput={title:string;documentUrl:string;signers:Signer[]};
type CreateRequestResult={provider:'SIGNIT';documentId:string;status:string|null};
type StatusResult={provider:'SIGNIT';documentId:string;status:string;completedAt:string|null};

@Injectable()
export class SignitEsignService {
  private readonly baseUrl='https://api.signit.sa';
  constructor(private readonly integrations:IntegrationService){}

  async createSignatureRequest(input:CreateRequestInput):Promise<CreateRequestResult>{
    this.integrations.requireOperational('ESIGN',{allowSandbox:true});
    const apiKey=this.apiKey();
    if(process.env.HYDROLAND_ESIGN_PROVIDER?.trim().toUpperCase()!=='SIGNIT')throw new ServiceUnavailableException('E-sign provider is not configured.');
    const title=input.title?.trim();
    if(!title||title.length>200)throw new ServiceUnavailableException('E-sign document title is invalid.');
    const documentUrl=this.documentUrl(input.documentUrl);
    const signers=this.signers(input.signers);
    let response:Response;
    try{
      response=await fetch(`${this.baseUrl}/documents`,{
        method:'POST',
        headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json',Accept:'application/json'},
        body:JSON.stringify({title,participants:signers.map(signer=>({name:signer.name,email:signer.email,role:'signer'})),document_url:documentUrl}),
        signal:AbortSignal.timeout(10_000),
      });
    }catch{throw new BadGatewayException('E-sign provider request failed.');}
    const payload=await this.safeJson(response);
    if(!response.ok)throw new BadGatewayException(`E-sign provider rejected request (${response.status}).`);
    const documentId=this.documentId(payload?.document_id);
    return{provider:'SIGNIT',documentId,status:this.optionalString(payload?.status)};
  }

  async status(documentId:string):Promise<StatusResult>{
    this.integrations.requireOperational('ESIGN',{allowSandbox:true});
    const apiKey=this.apiKey();
    if(process.env.HYDROLAND_ESIGN_PROVIDER?.trim().toUpperCase()!=='SIGNIT')throw new ServiceUnavailableException('E-sign provider is not configured.');
    const id=this.documentId(documentId);
    let response:Response;
    try{
      response=await fetch(`${this.baseUrl}/documents/${encodeURIComponent(id)}/status`,{
        headers:{Authorization:`Bearer ${apiKey}`,Accept:'application/json'},
        signal:AbortSignal.timeout(8_000),
      });
    }catch{throw new BadGatewayException('E-sign provider status request failed.');}
    const payload=await this.safeJson(response);
    if(!response.ok)throw new BadGatewayException(`E-sign provider status request failed (${response.status}).`);
    const status=this.optionalString(payload?.status);
    if(!status)throw new BadGatewayException('E-sign provider returned an invalid status response.');
    return{provider:'SIGNIT',documentId:id,status,completedAt:this.optionalString(payload?.completed_at)};
  }

  private apiKey(){
    const apiKey=process.env.SIGNIT_API_KEY?.trim();
    if(!apiKey)throw new ServiceUnavailableException('E-sign provider credentials are not configured.');
    return apiKey;
  }

  private documentUrl(value:string){
    const raw=value?.trim();
    if(!raw)throw new ServiceUnavailableException('E-sign document URL is required.');
    let url:URL;
    try{url=new URL(raw);}catch{throw new ServiceUnavailableException('E-sign document URL is invalid.');}
    if(url.protocol!=='https:'||url.username||url.password||url.hash)throw new ServiceUnavailableException('E-sign document URL must be a clean HTTPS URL.');
    const allowed=(process.env.HYDROLAND_ESIGN_DOCUMENT_HOSTS??'').split(',').map(v=>v.trim().toLowerCase()).filter(Boolean);
    if(!allowed.length||!allowed.includes(url.hostname.toLowerCase()))throw new ServiceUnavailableException('E-sign document host is not approved.');
    return url.toString();
  }

  private signers(value:Signer[]){
    if(!Array.isArray(value)||value.length<1||value.length>25)throw new ServiceUnavailableException('E-sign requires between 1 and 25 signers.');
    return value.map(signer=>{
      const name=signer?.name?.trim();
      const email=signer?.email?.trim().toLowerCase();
      if(!name||name.length>160||!email||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new ServiceUnavailableException('E-sign signer data is invalid.');
      return{name,email};
    });
  }

  private documentId(value:unknown){
    const id=String(value??'').trim();
    if(!/^[A-Za-z0-9._-]{1,160}$/.test(id))throw new BadGatewayException('E-sign provider returned an invalid document id.');
    return id;
  }
  private optionalString(value:unknown){return value===undefined||value===null||String(value).trim()===''?null:String(value);}
  private async safeJson(response:Response):Promise<any>{try{return await response.json();}catch{return null;}}
}
