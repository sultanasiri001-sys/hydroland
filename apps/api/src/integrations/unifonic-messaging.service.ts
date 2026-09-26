import { BadGatewayException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { IntegrationService } from './integration.service';

type SmsInput={recipient:string;body:string;correlationId:string};
type WhatsAppTemplateInput={recipient:string;templateName:string;languageCode:string;parameters?:string[]};
type DeliveryResult={provider:'UNIFONIC';providerMessageId:string|null;status:string|null};

@Injectable()
export class UnifonicMessagingService {
  constructor(private readonly integrations:IntegrationService){}

  async sendSms(input:SmsInput):Promise<DeliveryResult>{
    this.integrations.requireOperational('SMS',{allowSandbox:true});
    if(process.env.HYDROLAND_SMS_PROVIDER?.trim().toUpperCase()!=='UNIFONIC')throw new ServiceUnavailableException('SMS provider is not configured.');
    const appSid=process.env.UNIFONIC_SMS_APPSID?.trim();
    const senderId=process.env.UNIFONIC_SMS_SENDER_ID?.trim();
    if(!appSid||!senderId)throw new ServiceUnavailableException('SMS provider credentials are not configured.');
    const recipient=this.smsRecipient(input.recipient);
    const body=input.body?.trim();
    const correlationId=input.correlationId?.trim();
    if(!body||!correlationId)throw new ServiceUnavailableException('SMS delivery input is incomplete.');
    const form=new URLSearchParams({AppSid:appSid,SenderID:senderId,Recipient:recipient,Body:body,responseType:'JSON',CorrelationID:correlationId,baseEncode:'true',async:'false'});
    let response:Response;
    try{
      response=await fetch('https://el.cloud.unifonic.com/rest/SMS/messages',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},body:form,signal:AbortSignal.timeout(8_000)});
    }catch{throw new BadGatewayException('SMS provider request failed.');}
    const payload=await this.safeJson(response);
    if(!response.ok||payload?.success===false)throw new BadGatewayException(`SMS provider rejected delivery (${response.status}).`);
    return{provider:'UNIFONIC',providerMessageId:this.stringValue(payload?.data?.MessageID),status:this.stringValue(payload?.data?.Status)};
  }

  async sendWhatsAppTemplate(input:WhatsAppTemplateInput):Promise<DeliveryResult>{
    this.integrations.requireOperational('WHATSAPP',{allowSandbox:true});
    if(process.env.HYDROLAND_WHATSAPP_PROVIDER?.trim().toUpperCase()!=='UNIFONIC')throw new ServiceUnavailableException('WhatsApp provider is not configured.');
    const publicId=process.env.UNIFONIC_WHATSAPP_PUBLIC_ID?.trim();
    const secret=process.env.UNIFONIC_WHATSAPP_SECRET?.trim();
    if(!publicId||!secret)throw new ServiceUnavailableException('WhatsApp provider credentials are not configured.');
    const recipient=this.whatsAppRecipient(input.recipient);
    const name=input.templateName?.trim();
    const language=input.languageCode?.trim();
    if(!name||!language)throw new ServiceUnavailableException('WhatsApp template input is incomplete.');
    const parameters=(input.parameters??[]).map(value=>({type:'text',text:String(value)}));
    const requestBody={recipient:{contact:recipient,channel:'whatsapp'},content:{type:'template',name,language:{code:language},components:parameters.length?[{type:'body',parameters}]:[]}};
    let response:Response;
    try{
      response=await fetch('https://apis.unifonic.com/v1/messages',{method:'POST',headers:{PublicId:publicId,Secret:secret,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(requestBody),signal:AbortSignal.timeout(8_000)});
    }catch{throw new BadGatewayException('WhatsApp provider request failed.');}
    const payload=await this.safeJson(response);
    if(!response.ok)throw new BadGatewayException(`WhatsApp provider rejected delivery (${response.status}).`);
    return{provider:'UNIFONIC',providerMessageId:this.stringValue(payload?.messageId??payload?.id??payload?.data?.messageId),status:this.stringValue(payload?.status??payload?.data?.status)};
  }

  private smsRecipient(value:string){
    const normalized=String(value??'').replace(/[\s()-]/g,'').replace(/^\+/,'');
    if(!/^\d{8,15}$/.test(normalized))throw new ServiceUnavailableException('SMS recipient is invalid.');
    return normalized;
  }

  private whatsAppRecipient(value:string){
    const normalized=String(value??'').replace(/[\s()-]/g,'');
    const digits=normalized.replace(/^\+/,'');
    if(!/^\d{8,15}$/.test(digits))throw new ServiceUnavailableException('WhatsApp recipient is invalid.');
    return`+${digits}`;
  }

  private async safeJson(response:Response):Promise<any>{try{return await response.json();}catch{return null;}}
  private stringValue(value:unknown){return value===undefined||value===null?null:String(value);}
}
