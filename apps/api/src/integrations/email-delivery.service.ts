import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { IntegrationService } from './integration.service';

export type AuthEmailPurpose='VERIFY_EMAIL'|'RESET_PASSWORD';
export type AuthEmailDelivery={provider:'RESEND';messageId:string};

type ResendResponse={id?:unknown;message?:unknown;name?:unknown};

const escapeHtml=(value:string)=>value.replace(/[&<>"']/g,char=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[char]||char));

@Injectable()
export class EmailDeliveryService {
  constructor(private readonly integrations:IntegrationService,private readonly audit:AuditService){}

  async sendAuthChallenge(input:{notificationId:string;to:string;purpose:AuthEmailPurpose;token:string;expiresAt:string}):Promise<AuthEmailDelivery>{
    this.integrations.requireOperational('EMAIL',{allowSandbox:true});
    const provider=(process.env.HYDROLAND_EMAIL_PROVIDER?.trim().toUpperCase()||'');
    if(provider!=='RESEND')throw new ServiceUnavailableException('Email provider is not configured.');
    const apiKey=process.env.RESEND_API_KEY?.trim();
    const from=process.env.HYDROLAND_EMAIL_FROM?.trim();
    const origin=this.publicOrigin();
    if(!apiKey||!from)throw new ServiceUnavailableException('Email delivery credentials are not configured.');
    const url=this.challengeUrl(origin,input.purpose,input.token);
    const subject=input.purpose==='VERIFY_EMAIL'?'تفعيل حساب HYDROLAND | Verify your account':'استعادة كلمة مرور HYDROLAND | Reset your password';
    const action=input.purpose==='VERIFY_EMAIL'?'تفعيل الحساب':'تعيين كلمة مرور جديدة';
    const text=input.purpose==='VERIFY_EMAIL'
      ?`لتفعيل حسابك في HYDROLAND افتح الرابط التالي قبل ${input.expiresAt}:\n${url}\n\nإذا لم تطلب إنشاء هذا الحساب، تجاهل الرسالة.`
      :`لاستعادة كلمة مرور HYDROLAND افتح الرابط التالي قبل ${input.expiresAt}:\n${url}\n\nإذا لم تطلب الاستعادة، تجاهل الرسالة.`;
    const html=`<!doctype html><html lang="ar" dir="rtl"><body style="font-family:Arial,sans-serif;line-height:1.8;background:#f5f8fa;color:#102131;padding:24px"><main style="max-width:560px;margin:auto;background:#fff;border-radius:16px;padding:28px"><h1 style="font-size:22px">HYDROLAND</h1><p>${input.purpose==='VERIFY_EMAIL'?'أكمل تفعيل حسابك عبر الرابط الآمن أدناه.':'استخدم الرابط الآمن أدناه لتعيين كلمة مرور جديدة.'}</p><p><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#0b6685;color:#fff;text-decoration:none;font-weight:700">${action}</a></p><p style="font-size:13px;color:#526b78">تنتهي صلاحية الرابط في ${escapeHtml(input.expiresAt)}. إذا لم تطلب هذه العملية فتجاهل الرسالة.</p></main></body></html>`;
    const base=process.env.RESEND_API_BASE_URL?.trim()||'https://api.resend.com';
    let endpoint:URL;
    try{endpoint=new URL('/emails',base);}catch{throw new ServiceUnavailableException('Email provider endpoint is invalid.');}
    let response:Response;
    try{
      response=await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json','Idempotency-Key':`hydroland-auth/${input.notificationId}`,Accept:'application/json'},body:JSON.stringify({from,to:[input.to],subject,text,html}),signal:AbortSignal.timeout(8_000)});
    }catch{
      await this.audit.record({action:'integration.email.delivery_failed',resource:'Notification',resourceId:input.notificationId,metadata:{provider:'RESEND',purpose:input.purpose,reason:'NETWORK'}});
      throw new ServiceUnavailableException('Email delivery request failed.');
    }
    let payload:ResendResponse={};
    try{payload=await response.json() as ResendResponse;}catch{payload={};}
    if(!response.ok){
      await this.audit.record({action:'integration.email.delivery_failed',resource:'Notification',resourceId:input.notificationId,metadata:{provider:'RESEND',purpose:input.purpose,status:response.status}});
      throw new ServiceUnavailableException(`Email delivery provider rejected the request (${response.status}).`);
    }
    const messageId=typeof payload.id==='string'&&payload.id.trim()?payload.id.trim():'';
    if(!messageId)throw new ServiceUnavailableException('Email delivery provider returned an invalid response.');
    await this.audit.record({action:'integration.email.delivered',resource:'Notification',resourceId:input.notificationId,metadata:{provider:'RESEND',purpose:input.purpose,messageId}});
    return{provider:'RESEND',messageId};
  }

  private publicOrigin(){
    const raw=process.env.HYDROLAND_PUBLIC_WEB_ORIGIN?.trim();
    if(!raw)throw new ServiceUnavailableException('Public web origin is not configured for email links.');
    let origin:URL;
    try{origin=new URL(raw);}catch{throw new ServiceUnavailableException('Public web origin is invalid.');}
    if(origin.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(origin.hostname))throw new ServiceUnavailableException('Public web origin must use HTTPS.');
    origin.pathname='/';origin.search='';origin.hash='';
    return origin;
  }

  private challengeUrl(origin:URL,purpose:AuthEmailPurpose,token:string){
    const url=new URL(origin.toString());
    url.searchParams.set(purpose==='VERIFY_EMAIL'?'verify_email':'reset_token',token);
    return url.toString();
  }
}
