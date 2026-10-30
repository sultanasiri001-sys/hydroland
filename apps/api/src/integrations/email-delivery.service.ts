import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { IntegrationService } from './integration.service';
import { assertAuthEmailRecipient, emailTrialRecipient } from '../auth/email-trial-policy';

export type AuthEmailPurpose='VERIFY_EMAIL'|'RESET_PASSWORD';
export type AuthEmailDelivery={provider:'RESEND';messageId:string};

type ResendResponse={id?:unknown;message?:unknown;name?:unknown};
export class ReportEmailError extends Error {
  constructor(readonly disposition:'RETRYABLE'|'PERMANENT'|'UNCERTAIN'){super('Executive report email '+disposition);}
}

const escapeHtml=(value:string)=>value.replace(/[&<>"']/g,char=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[char]||char));

@Injectable()
export class EmailDeliveryService {
  constructor(private readonly integrations:IntegrationService,private readonly audit:AuditService){}

  // Public feature availability only. Provider details and credentials stay admin-only.
  publicConfig():{enabled:boolean;restricted?:true}{
    try{const {trialRecipient}=this.configuration();return trialRecipient?{enabled:true,restricted:true}:{enabled:true}}catch{return{enabled:false}}
  }

  private configuration(){
    this.integrations.requireOperational('EMAIL',{allowSandbox:true});
    const provider=(process.env.HYDROLAND_EMAIL_PROVIDER?.trim().toUpperCase()||'');
    if(provider!=='RESEND')throw new ServiceUnavailableException('Email provider is not configured.');
    const apiKey=process.env.RESEND_API_KEY?.trim();
    const from=process.env.HYDROLAND_EMAIL_FROM?.trim();
    const origin=this.publicOrigin();
    if(!apiKey||!from)throw new ServiceUnavailableException('Email delivery credentials are not configured.');
    const trialRecipient=emailTrialRecipient();
    return{apiKey,from,origin,trialRecipient};
  }

  async sendAuthChallenge(input:{notificationId:string;to:string;purpose:AuthEmailPurpose;token:string;expiresAt:string}):Promise<AuthEmailDelivery>{
    const {apiKey,from,origin}=this.configuration();
    assertAuthEmailRecipient(input.to);
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

  async sendExecutiveReport(input:{notificationId:string;to:string;text:string}):Promise<AuthEmailDelivery>{
    let configuration:ReturnType<EmailDeliveryService['configuration']>;
    try{configuration=this.configuration();assertAuthEmailRecipient(input.to);}catch{throw new ReportEmailError('PERMANENT');}
    const {apiKey,from}=configuration;
    const html=`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>تقرير إدارات هيدرولاند</title></head><body style="font-family:Arial,sans-serif;line-height:1.8;color:#102131;background:#fff"><h1>تقرير إدارات هيدرولاند</h1><div style="white-space:pre-wrap">${escapeHtml(input.text)}</div></body></html>`;
    if(!input.text.trim()||Buffer.byteLength(html,'utf8')>95*1024)throw new ReportEmailError('PERMANENT');
    let endpoint:URL;
    try{endpoint=new URL('/emails',process.env.RESEND_API_BASE_URL?.trim()||'https://api.resend.com');}catch{throw new ReportEmailError('PERMANENT');}
    const localTest=process.env.NODE_ENV==='test'&&endpoint.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(endpoint.hostname);
    if(endpoint.username||endpoint.password||endpoint.origin!=='https://api.resend.com'&&!localTest)throw new ReportEmailError('PERMANENT');
    let response:Response;
    try{response=await fetch(endpoint,{method:'POST',redirect:'error',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json','Idempotency-Key':`hydroland-report/${input.notificationId}`,Accept:'application/json'},body:JSON.stringify({from,to:[input.to],subject:'تقرير إدارات هيدرولاند | عبدالله',text:input.text,html}),signal:AbortSignal.timeout(8_000)});}catch{throw new ReportEmailError('UNCERTAIN');}
    if(!response.ok){await response.body?.cancel();throw new ReportEmailError(response.status===429||response.status>=500?'RETRYABLE':'PERMANENT');}
    try{
      const reader=response.body?.getReader();if(!reader)throw new Error();const parts:Uint8Array[]=[];let size=0;
      while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>16*1024){await reader.cancel();throw new Error();}parts.push(part.value);}
      const data=JSON.parse(Buffer.concat(parts).toString('utf8')) as ResendResponse;
      if(typeof data.id!=='string'||!data.id.trim()||data.id.length>200)throw new Error();
      return{provider:'RESEND',messageId:data.id.trim()};
    }catch{throw new ReportEmailError('UNCERTAIN');}
  }

  private publicOrigin(){
    const raw=process.env.HYDROLAND_PUBLIC_WEB_ORIGIN?.trim();
    if(!raw)throw new ServiceUnavailableException('Public web origin is not configured for email links.');
    let origin:URL;
    try{origin=new URL(raw);}catch{throw new ServiceUnavailableException('Public web origin is invalid.');}
    const localHttp=origin.protocol==='http:'&&['localhost','127.0.0.1'].includes(origin.hostname);
    if((origin.protocol!=='https:'&&!localHttp)||origin.username||origin.password)throw new ServiceUnavailableException('Public web origin must use HTTPS.');
    origin.pathname='/';origin.search='';origin.hash='';
    return origin;
  }

  private challengeUrl(origin:URL,purpose:AuthEmailPurpose,token:string){
    const url=new URL(origin.toString());
    url.searchParams.set(purpose==='VERIFY_EMAIL'?'verify_email':'reset_token',token);
    return url.toString();
  }
}
