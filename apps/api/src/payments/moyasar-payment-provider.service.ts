import { BadRequestException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { IntegrationService } from '../integrations/integration.service';

export type MoyasarInvoice={id:string;status:string;amount:number;currency:string;url:string;metadata:Record<string,string>};
export type MoyasarWebhook={id:string;type:string;secret_token:string;live:boolean;data:Record<string,unknown>};

@Injectable()
export class MoyasarPaymentProviderService {
  constructor(private readonly integrations:IntegrationService){}

  async createInvoice(input:{paymentId:string;bookingId:string;amountMinor:number;currency:string}){
    this.assertProvider();
    if(!Number.isInteger(input.amountMinor)||input.amountMinor<100)throw new BadRequestException('Moyasar invoice amount must be at least 100 minor units.');
    const origin=this.publicWebOrigin();
    const successUrl=new URL(origin.toString());successUrl.searchParams.set('payment','success');successUrl.searchParams.set('payment_id',input.paymentId);
    const backUrl=new URL(origin.toString());backUrl.searchParams.set('payment','cancelled');backUrl.searchParams.set('payment_id',input.paymentId);
    const metadata={hydroland_payment_id:input.paymentId,hydroland_booking_id:input.bookingId};
    const payload={amount:input.amountMinor,currency:input.currency,description:`HYDROLAND booking ${input.bookingId}`,success_url:successUrl.toString(),back_url:backUrl.toString(),expired_at:new Date(Date.now()+30*60_000).toISOString(),metadata};
    const response=await this.request('/invoices',{method:'POST',body:JSON.stringify(payload)});
    return this.invoice(response,input.amountMinor,input.currency,metadata);
  }

  async fetchInvoice(invoiceId:string){
    this.assertProvider();
    if(!/^[0-9a-f-]{30,40}$/i.test(invoiceId))throw new BadRequestException('Invalid provider reference.');
    return this.invoice(await this.request(`/invoices/${encodeURIComponent(invoiceId)}`),undefined,undefined,undefined);
  }

  async cancelInvoice(invoiceId:string){
    this.assertProvider();
    try{await this.request(`/invoices/${encodeURIComponent(invoiceId)}/cancel`,{method:'PUT'});}catch{return false}return true;
  }

  verifyWebhook(payload:unknown):MoyasarWebhook{
    if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new UnauthorizedException('Invalid payment webhook.');
    const event=payload as Record<string,unknown>;
    const id=typeof event.id==='string'?event.id.trim():'';
    const type=typeof event.type==='string'?event.type.trim():'';
    const secret=typeof event.secret_token==='string'?event.secret_token:'';
    const live=event.live===true;
    const data=event.data&&typeof event.data==='object'&&!Array.isArray(event.data)?event.data as Record<string,unknown>:null;
    const expected=process.env.MOYASAR_WEBHOOK_SECRET?.trim()||'';
    if(!id||!type||!data||!expected||secret.length!==expected.length||!timingSafeEqual(Buffer.from(secret),Buffer.from(expected)))throw new UnauthorizedException('Invalid payment webhook.');
    const integration=this.integrations.requireOperational('PAYMENT_PSP',{allowSandbox:true});
    if(integration.status==='PRODUCTION_ENABLED'&&!live)throw new UnauthorizedException('Sandbox payment webhook rejected in production mode.');
    if(integration.status==='SANDBOX'&&live)throw new UnauthorizedException('Live payment webhook rejected in sandbox mode.');
    return{id,type,secret_token:'[verified]',live,data};
  }

  private assertProvider(){
    this.integrations.requireOperational('PAYMENT_PSP',{allowSandbox:true});
    if((process.env.HYDROLAND_PAYMENT_PROVIDER?.trim().toUpperCase()||'')!=='MOYASAR')throw new ServiceUnavailableException('Payment provider is not configured.');
    if(!process.env.MOYASAR_SECRET_KEY?.trim())throw new ServiceUnavailableException('Payment provider credentials are not configured.');
  }

  private async request(path:string,init:RequestInit={}){
    const secret=process.env.MOYASAR_SECRET_KEY?.trim();if(!secret)throw new ServiceUnavailableException('Payment provider credentials are not configured.');
    const rawBase=process.env.MOYASAR_API_BASE_URL?.trim()||'https://api.moyasar.com/v1/';
    let url:URL;try{url=new URL(path.replace(/^\//,''),rawBase.endsWith('/')?rawBase:`${rawBase}/`);}catch{throw new ServiceUnavailableException('Payment provider endpoint is invalid.');}
    let response:Response;
    try{response=await fetch(url,{...init,headers:{Authorization:`Basic ${Buffer.from(`${secret}:`).toString('base64')}`,'Content-Type':'application/json',Accept:'application/json',...(init.headers||{})},signal:AbortSignal.timeout(8_000)});}catch{throw new ServiceUnavailableException('Payment provider request failed.');}
    const body=await response.json().catch(()=>({})) as unknown;
    if(!response.ok)throw new ServiceUnavailableException(`Payment provider request failed (${response.status}).`);
    return body;
  }

  private invoice(payload:unknown,expectedAmount?:number,expectedCurrency?:string,expectedMetadata?:Record<string,string>):MoyasarInvoice{
    if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new ServiceUnavailableException('Payment provider returned an invalid response.');
    const row=payload as Record<string,unknown>,id=typeof row.id==='string'?row.id:'',status=typeof row.status==='string'?row.status:'',currency=typeof row.currency==='string'?row.currency:'',url=typeof row.url==='string'?row.url:'',amount=typeof row.amount==='number'?row.amount:Number.NaN;
    if(!id||!status||!Number.isInteger(amount)||!currency||!url)throw new ServiceUnavailableException('Payment provider returned an invalid invoice.');
    if(expectedAmount!==undefined&&amount!==expectedAmount)throw new ServiceUnavailableException('Payment provider amount mismatch.');
    if(expectedCurrency&&currency!==expectedCurrency)throw new ServiceUnavailableException('Payment provider currency mismatch.');
    const metadata:Record<string,string>={};
    if(row.metadata&&typeof row.metadata==='object'&&!Array.isArray(row.metadata))for(const[key,value]of Object.entries(row.metadata as Record<string,unknown>))if(typeof value==='string')metadata[key]=value;
    if(expectedMetadata)for(const[key,value]of Object.entries(expectedMetadata))if(metadata[key]!==value)throw new ServiceUnavailableException('Payment provider metadata mismatch.');
    let checkout:URL;try{checkout=new URL(url);}catch{throw new ServiceUnavailableException('Payment provider returned an invalid checkout URL.');}
    if(checkout.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(checkout.hostname))throw new ServiceUnavailableException('Payment checkout URL must use HTTPS.');
    return{id,status,amount,currency,url:checkout.toString(),metadata};
  }

  private publicWebOrigin(){
    const raw=process.env.HYDROLAND_PUBLIC_WEB_ORIGIN?.trim();if(!raw)throw new ServiceUnavailableException('Public web origin is not configured.');
    let url:URL;try{url=new URL(raw);}catch{throw new ServiceUnavailableException('Public web origin is invalid.');}
    if(url.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(url.hostname))throw new ServiceUnavailableException('Public web origin must use HTTPS.');
    url.pathname='/';url.search='';url.hash='';return url;
  }
}
