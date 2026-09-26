import { BadRequestException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { IntegrationService } from '../integrations/integration.service';

export type MoyasarPaymentStatus='initiated'|'paid'|'authorized'|'captured'|'failed'|'refunded'|'voided'|'verified';
export type MoyasarPaymentScope='BOOKING'|'STORE';
export type MoyasarPayment={id:string;status:MoyasarPaymentStatus;amount:number;currency:string;description?:string|null;metadata?:Record<string,unknown>|null};

@Injectable()
export class MoyasarPaymentService {
  constructor(private readonly integrations:IntegrationService){}

  checkoutConfig(payment:{id:string;scope:MoyasarPaymentScope;referenceId:string;amountMinor:number;currency:string;description:string}){
    this.integrations.requireOperational('PAYMENT_PSP',{allowSandbox:true});
    this.assertProvider();
    const publishableKey=process.env.MOYASAR_PUBLISHABLE_KEY?.trim();
    if(!publishableKey)throw new ServiceUnavailableException('Moyasar publishable key is not configured.');
    const callback=this.publicWebUrl();
    callback.searchParams.set('payment_result',payment.id);
    callback.searchParams.set('payment_scope',payment.scope.toLowerCase());
    return{
      provider:'MOYASAR' as const,
      amount:payment.amountMinor,
      currency:payment.currency,
      description:payment.description,
      publishableApiKey:publishableKey,
      callbackUrl:callback.toString(),
      methods:['creditcard'],
      supportedNetworks:['mada','visa','mastercard'],
      metadata:{hydroland_payment_id:payment.id,hydroland_payment_scope:payment.scope,hydroland_reference_id:payment.referenceId},
    };
  }

  async fetchPayment(providerPaymentId:string):Promise<MoyasarPayment>{const id=this.paymentId(providerPaymentId);this.integrations.requireOperational('PAYMENT_PSP',{allowSandbox:true});this.assertProvider();return this.parsePayment(await this.request(`/payments/${encodeURIComponent(id)}`,{method:'GET'}));}
  async refund(providerPaymentId:string):Promise<MoyasarPayment>{const id=this.paymentId(providerPaymentId);this.integrations.requireOperational('PAYMENT_PSP',{allowSandbox:true});this.assertProvider();return this.parsePayment(await this.request(`/payments/${encodeURIComponent(id)}/refund`,{method:'POST'}));}

  verifyWebhook(input:unknown){
    this.integrations.requireOperational('PAYMENT_PSP',{allowSandbox:true});this.assertProvider();
    if(!input||typeof input!=='object'||Array.isArray(input))throw new UnauthorizedException('Invalid payment webhook.');
    const body=input as Record<string,unknown>,configured=process.env.MOYASAR_WEBHOOK_SECRET?.trim(),received=typeof body.secret_token==='string'?body.secret_token:'';
    if(!configured||!received||!this.safeEqual(configured,received))throw new UnauthorizedException('Invalid payment webhook secret.');
    const type=typeof body.type==='string'?body.type:'';
    if(!type.startsWith('payment_'))throw new BadRequestException('Unsupported payment webhook event.');
    const data=body.data;
    if(!data||typeof data!=='object'||Array.isArray(data)||typeof (data as Record<string,unknown>).id!=='string')throw new BadRequestException('Payment webhook is missing payment id.');
    const integration=this.integrations.status('PAYMENT_PSP');
    if(typeof body.live==='boolean'){
      if(integration.status==='PRODUCTION_ENABLED'&&body.live!==true)throw new UnauthorizedException('Test webhook is not accepted in production.');
      if(integration.status==='SANDBOX'&&body.live!==false)throw new UnauthorizedException('Live webhook is not accepted in sandbox.');
    }
    return{type,providerPaymentId:String((data as Record<string,unknown>).id)};
  }

  scope(payment:MoyasarPayment):MoyasarPaymentScope|null{const value=payment.metadata?.hydroland_payment_scope;return value==='BOOKING'||value==='STORE'?value:null;}
  localPaymentId(payment:MoyasarPayment){const value=payment.metadata?.hydroland_payment_id;return typeof value==='string'&&value.trim()?value.trim():null;}

  private async request(path:string,init:RequestInit){
    const secret=process.env.MOYASAR_SECRET_KEY?.trim();if(!secret)throw new ServiceUnavailableException('Moyasar secret key is not configured.');
    const base=process.env.MOYASAR_API_BASE_URL?.trim()||'https://api.moyasar.com/v1';let url:URL;
    try{url=new URL(`${base.replace(/\/$/,'')}${path}`);}catch{throw new ServiceUnavailableException('Moyasar API endpoint is invalid.');}
    let response:Response;try{response=await fetch(url,{...init,headers:{Authorization:`Basic ${Buffer.from(`${secret}:`).toString('base64')}`,Accept:'application/json','Content-Type':'application/json',...(init.headers||{})},signal:AbortSignal.timeout(8_000)});}catch{throw new ServiceUnavailableException('Moyasar request failed.');}
    let payload:unknown={};try{payload=await response.json();}catch{payload={};}
    if(!response.ok)throw new ServiceUnavailableException(`Moyasar request failed (${response.status}).`);return payload;
  }

  private parsePayment(input:unknown):MoyasarPayment{
    if(!input||typeof input!=='object'||Array.isArray(input))throw new ServiceUnavailableException('Moyasar returned an invalid payment response.');
    const row=input as Record<string,unknown>,statuses=new Set<MoyasarPaymentStatus>(['initiated','paid','authorized','captured','failed','refunded','voided','verified']);
    if(typeof row.id!=='string'||!row.id||typeof row.status!=='string'||!statuses.has(row.status as MoyasarPaymentStatus)||!Number.isInteger(row.amount)||typeof row.currency!=='string')throw new ServiceUnavailableException('Moyasar returned an incomplete payment response.');
    const metadata=row.metadata&&typeof row.metadata==='object'&&!Array.isArray(row.metadata)?row.metadata as Record<string,unknown>:null;
    return{id:row.id,status:row.status as MoyasarPaymentStatus,amount:row.amount as number,currency:row.currency.toUpperCase(),description:typeof row.description==='string'?row.description:null,metadata};
  }
  private paymentId(value:string){const id=value?.trim();if(!id||id.length>128)throw new BadRequestException('Valid provider payment id is required.');return id;}
  private assertProvider(){if(process.env.HYDROLAND_PAYMENT_PROVIDER?.trim().toUpperCase()!=='MOYASAR')throw new ServiceUnavailableException('Payment provider is not configured.');}
  private publicWebUrl(){const raw=process.env.HYDROLAND_PUBLIC_WEB_ORIGIN?.trim();if(!raw)throw new ServiceUnavailableException('Public web origin is not configured.');let url:URL;try{url=new URL(raw);}catch{throw new ServiceUnavailableException('Public web origin is invalid.');}if(url.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(url.hostname))throw new ServiceUnavailableException('Public web origin must use HTTPS.');url.pathname='/';url.search='';url.hash='';return url;}
  private safeEqual(a:string,b:string){const aa=Buffer.from(a),bb=Buffer.from(b);return aa.length===bb.length&&timingSafeEqual(aa,bb);}
}
