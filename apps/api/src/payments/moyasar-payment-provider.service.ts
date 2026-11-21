import { BadRequestException, ConflictException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { IntegrationService } from '../integrations/integration.service';

export type MoyasarInvoice={id:string;status:string;amount:number;currency:string;url:string;metadata:Record<string,string>;payments:Array<{id:string;status:string;amount:number;currency:string}>};
export type MoyasarCommerceInvoice = MoyasarInvoice & {expiresAt: string};
export type MoyasarCommerceInvoiceInput = {
  checkoutId: string; sourceType: 'EQUIPMENT_RENTAL' | 'STORE_ORDER' | 'TRAINING_ENROLLMENT'; sourceId: string; organizationId: string;
  customerAccountId: string; amountMinor: number; currency: 'SAR'; expiresAt: string;
};
export type MoyasarWebhook={id:string;type:string;secret_token:string;live:boolean;data:Record<string,unknown>};

export type MoyasarPaymentBinding={invoiceId:string;amountMinor:number;currency:string};
// A payment response is intentionally reduced to the financial evidence required
// by reconciliation. Card tokens, cardholder data and arbitrary metadata never
// leave this adapter.
export type MoyasarPayment={
  id:string;invoiceId:string;status:string;amountMinor:number;currency:string;
  capturedMinor:number;refundedMinor:number;updatedAt:string;refundedAt:string|null;
};
export type MoyasarRefundInput=MoyasarPaymentBinding&{
  providerPaymentId:string;refundAmountMinor:number;expectedRefundedMinor:number;
};
const providerUuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const providerPaymentStatuses=new Set(['initiated','paid','authorized','failed','refunded','captured','voided','verified','expired']);
const maxProviderMinor=2_147_483_647;

@Injectable()
export class MoyasarPaymentProviderService {
  constructor(private readonly integrations:IntegrationService){}

  async createInvoice(input:{paymentId:string;bookingId:string;amountMinor:number;currency:string;organizationPayment?:{buyerOrganizationId:string;delegateAccountId:string}}){
    this.assertProvider();
    if(!Number.isInteger(input.amountMinor)||input.amountMinor<100)throw new BadRequestException('Moyasar invoice amount must be at least 100 minor units.');
    const origin=this.publicWebOrigin();
    const successUrl=new URL(origin.toString());successUrl.searchParams.set('payment','success');successUrl.searchParams.set('payment_id',input.paymentId);
    const backUrl=new URL(origin.toString());backUrl.searchParams.set('payment','cancelled');backUrl.searchParams.set('payment_id',input.paymentId);
    const metadata={hydroland_payment_id:input.paymentId,hydroland_booking_id:input.bookingId,
      ...(input.organizationPayment?{hydroland_buyer_organization_id:input.organizationPayment.buyerOrganizationId,hydroland_delegate_account_id:input.organizationPayment.delegateAccountId}:{})} as Record<string,string>;
    const payload={amount:input.amountMinor,currency:input.currency,description:`HYDROLAND booking ${input.bookingId}`,success_url:successUrl.toString(),back_url:backUrl.toString(),expired_at:new Date(Date.now()+30*60_000).toISOString(),metadata};
    const response=await this.request('/invoices',{method:'POST',...(input.organizationPayment?{redirect:'error' as const}:{}),body:JSON.stringify(payload)});
    return this.observeInvoice(response, {amount: input.amountMinor, currency: input.currency, metadata});
  }

  async fetchInvoice(invoiceId:string){
    this.assertProvider();
    if(!/^[0-9a-f-]{30,40}$/i.test(invoiceId))throw new BadRequestException('Invalid provider reference.');
    const response = await this.request(`/invoices/${encodeURIComponent(invoiceId)}`);
    return this.observeInvoice(response, {id: invoiceId});
  }

  commerceInvoiceMetadata(input: MoyasarCommerceInvoiceInput) {
    return {hydroland_checkout_id:input.checkoutId,hydroland_source_type:input.sourceType,
      hydroland_source_id:input.sourceId,hydroland_organization_id:input.organizationId,
      hydroland_customer_account_id:input.customerAccountId};
  }

  // Invoice creation has no documented given_id support. The caller must claim
  // one durable operation first; a lost response can never trigger POST replay.
  async createCommerceInvoice(input: MoyasarCommerceInvoiceInput): Promise<MoyasarCommerceInvoice> {
    this.assertCommerceInvoiceInput(input);
    if(Date.parse(input.expiresAt)<=Date.now())throw new ConflictException('The original checkout payment window has expired.');
    this.assertProvider();
    const origin=this.publicWebOrigin();
    const route=input.sourceType==='EQUIPMENT_RENTAL'
      ? {payment:'rental_payment',id:'rental_id',label:'equipment rental'}
      : input.sourceType==='STORE_ORDER'
        ? {payment:'store_payment',id:'store_order_id',label:'store order'}
        : {payment:'course_payment',id:'enrollment_id',label:'course enrollment'};
    const successUrl=new URL(origin);successUrl.searchParams.set(route.payment,'returned');successUrl.searchParams.set(route.id,input.sourceId);
    const backUrl=new URL(origin);backUrl.searchParams.set(route.payment,'back');backUrl.searchParams.set(route.id,input.sourceId);
    const metadata=this.commerceInvoiceMetadata(input);
    try{
      const response=await this.request('/invoices',{method:'POST',redirect:'error',body:JSON.stringify({
        amount:input.amountMinor,currency:input.currency,description:`HYDROLAND ${route.label} ${input.sourceId}`,
        success_url:successUrl.toString(),back_url:backUrl.toString(),expired_at:input.expiresAt,metadata,
      })});
      return await this.observeCommerceInvoice(response,input);
    }catch{
      const code=input.sourceType==='EQUIPMENT_RENTAL'?'RENTAL_CHECKOUT_RECONCILIATION_REQUIRED'
        :input.sourceType==='STORE_ORDER'?'STORE_CHECKOUT_RECONCILIATION_REQUIRED':'COURSE_CHECKOUT_RECONCILIATION_REQUIRED';
      throw new ServiceUnavailableException({code,message:'The checkout result requires reconciliation before any further payment request.'});
    }
  }

  async fetchCommerceInvoice(invoiceId: string,input: MoyasarCommerceInvoiceInput): Promise<MoyasarCommerceInvoice> {
    this.assertCommerceInvoiceInput(input);
    if(!providerUuid.test(invoiceId))throw new BadRequestException('Invalid provider invoice reference.');
    this.assertProvider();
    const response=await this.request(`/invoices/${encodeURIComponent(invoiceId)}`,{redirect:'error'});
    return this.observeCommerceInvoice(response,input,invoiceId);
  }

  private assertCommerceInvoiceInput(input:MoyasarCommerceInvoiceInput){
    if(!input||!['EQUIPMENT_RENTAL','STORE_ORDER','TRAINING_ENROLLMENT'].includes(input.sourceType)||!['checkoutId','sourceId','organizationId','customerAccountId'].every(key=>{
      const value=input[key as keyof MoyasarCommerceInvoiceInput];return typeof value==='string'&&value.trim()===value&&value.length>0&&value.length<=128;
    })||input.currency!=='SAR'||!Number.isSafeInteger(input.amountMinor)||input.amountMinor<100||input.amountMinor>maxProviderMinor
      ||typeof input.expiresAt!=='string'||!Number.isFinite(Date.parse(input.expiresAt))||new Date(input.expiresAt).toISOString()!==input.expiresAt){
      throw new BadRequestException('A valid original commerce checkout binding is required.');
    }
  }

  private async observeCommerceInvoice(payload:unknown,input:MoyasarCommerceInvoiceInput,id?:string):Promise<MoyasarCommerceInvoice>{
    const invoice=await this.observeInvoice(payload,{id,amount:input.amountMinor,currency:input.currency,metadata:this.commerceInvoiceMetadata(input)});
    const raw=payload as Record<string,unknown>;
    if(!providerUuid.test(invoice.id)||!['initiated','paid','failed','refunded','canceled','on_hold','expired','voided'].includes(invoice.status)
      ||typeof raw.expired_at!=='string'||!Number.isFinite(Date.parse(raw.expired_at))
      ||Date.parse(raw.expired_at)!==Date.parse(input.expiresAt)){
      await this.integrations.recordProviderSignal('PAYMENT_PSP','PROVIDER_FAILURE');
      throw new ServiceUnavailableException('Provider invoice does not preserve the original checkout expiry.');
    }
    return {...invoice,metadata:this.commerceInvoiceMetadata(input),expiresAt:input.expiresAt};
  }

  async fetchPayment(providerPaymentId:string,binding:MoyasarPaymentBinding):Promise<MoyasarPayment>{
    this.assertPaymentBinding(providerPaymentId,binding);
    this.assertProvider();
    const response=await this.request(`/payments/${encodeURIComponent(providerPaymentId)}`,{redirect:'error'});
    return this.observePayment(response,providerPaymentId,binding);
  }

  /**
   * The caller must durably reserve one refund operation before calling this
   * method. Moyasar documents given_id for creation, not refund idempotency.
   * Exactly one POST is sent; any uncertain outcome requires GET reconciliation
   * and must never be retried automatically with a new operation.
   */
  async refundPayment(input:MoyasarRefundInput):Promise<MoyasarPayment>{
    this.assertPaymentBinding(input?.providerPaymentId,input);
    if(!Number.isSafeInteger(input.refundAmountMinor)||input.refundAmountMinor<=0
      ||input.refundAmountMinor>maxProviderMinor||!Number.isSafeInteger(input.expectedRefundedMinor)
      ||input.expectedRefundedMinor<0||input.expectedRefundedMinor>input.amountMinor
      ||input.refundAmountMinor>input.amountMinor-input.expectedRefundedMinor){
      throw new BadRequestException('Refund amount must fit within the remaining original payment.');
    }
    const before=await this.fetchPayment(input.providerPaymentId,input);
    if(before.refundedMinor!==input.expectedRefundedMinor){
      throw new ConflictException({code:'PAYMENT_REFUND_BALANCE_CHANGED',message:'Provider refund balance changed. Reconcile before sending a refund.'});
    }
    // The published operation guide permits refund POST only from paid/captured.
    // A partial balance in a refunded response is readable but is not permission
    // to assume that another refund POST is supported by this provider.
    if(!['paid','captured'].includes(before.status)){
      throw new ConflictException({code:'PAYMENT_REFUND_PROVIDER_REVIEW_REQUIRED',message:'Provider payment is not in a documented refundable state.'});
    }
    if(input.refundAmountMinor>before.capturedMinor-before.refundedMinor){
      throw new ConflictException({code:'PAYMENT_REFUND_CAPTURE_LIMIT',message:'Refund amount exceeds the remaining captured payment.'});
    }
    try{
      const response=await this.request(`/payments/${encodeURIComponent(input.providerPaymentId)}/refund`,{
        method:'POST',redirect:'error',body:JSON.stringify({amount:input.refundAmountMinor}),
      });
      const after=this.payment(response,input.providerPaymentId,input);
      if(!['paid','captured','refunded'].includes(after.status)
        ||after.capturedMinor!==before.capturedMinor
        ||after.refundedMinor!==before.refundedMinor+input.refundAmountMinor
        ||!after.refundedAt||Date.parse(after.updatedAt)<Date.parse(before.updatedAt)){
        throw new ServiceUnavailableException('Payment provider refund outcome is not verified.');
      }
      await this.integrations.recordProviderSignal('PAYMENT_PSP','SUCCESS');
      return after;
    }catch{
      await this.integrations.recordProviderSignal('PAYMENT_PSP','PROVIDER_FAILURE');
      throw new ServiceUnavailableException({
        code:'PAYMENT_REFUND_RECONCILIATION_REQUIRED',
        message:'Refund outcome is uncertain. Reconcile the original provider payment before any further action.',
      });
    }
  }

  async cancelInvoice(invoiceId:string){
    this.assertProvider();
    try {
      const response = await this.request(`/invoices/${encodeURIComponent(invoiceId)}/cancel`, {method:'PUT'}) as Record<string, unknown>;
      const confirmed = response.id === invoiceId && response.status === 'canceled';
      await this.integrations.recordProviderSignal('PAYMENT_PSP', confirmed ? 'SUCCESS' : 'PROVIDER_FAILURE');
      return confirmed;
    } catch { return false; }
  }

  verifyWebhook(payload:unknown):MoyasarWebhook{
    if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new UnauthorizedException('Invalid payment webhook.');
    const event=payload as Record<string,unknown>;
    const id=typeof event.id==='string'?event.id.trim():'';
    const type=typeof event.type==='string'?event.type.trim():'';
    const secret=typeof event.secret_token==='string'?event.secret_token:'';
    const live=event.live;
    const data=event.data&&typeof event.data==='object'&&!Array.isArray(event.data)?event.data as Record<string,unknown>:null;
    const expected=process.env.MOYASAR_WEBHOOK_SECRET?.trim()||'';
    if(!id||!type||!data||typeof live!=='boolean'||!expected||Buffer.byteLength(secret)!==Buffer.byteLength(expected)||!timingSafeEqual(Buffer.from(secret),Buffer.from(expected)))throw new UnauthorizedException('Invalid payment webhook.');
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
    try{response=await fetch(url,{...init,headers:{Authorization:`Basic ${Buffer.from(`${secret}:`).toString('base64')}`,'Content-Type':'application/json',Accept:'application/json',...(init.headers||{})},signal:AbortSignal.timeout(8_000)});}catch{await this.integrations.recordProviderSignal('PAYMENT_PSP','PROVIDER_FAILURE');throw new ServiceUnavailableException('Payment provider request failed.');}
    if(!response.ok){if(response.status===401||response.status===403||response.status===408||response.status===429||response.status>=500)await this.integrations.recordProviderSignal('PAYMENT_PSP','PROVIDER_FAILURE');throw new ServiceUnavailableException(`Payment provider request failed (${response.status}).`);}
    let body:unknown;
    try{body=await response.json() as unknown;}catch{await this.integrations.recordProviderSignal('PAYMENT_PSP','PROVIDER_FAILURE');throw new ServiceUnavailableException('Payment provider returned an invalid response.');}
    if(!body||typeof body!=='object'||Array.isArray(body)){await this.integrations.recordProviderSignal('PAYMENT_PSP','PROVIDER_FAILURE');throw new ServiceUnavailableException('Payment provider returned an invalid response.');}
    return body;
  }

  private async observeInvoice(payload: unknown, expected: {id?: string; amount?: number; currency?: string; metadata?: Record<string, string>}) {
    let invoice: MoyasarInvoice;
    try {
      invoice = this.invoice(payload, expected.amount, expected.currency, expected.metadata);
      if (expected.id && invoice.id !== expected.id) throw new ServiceUnavailableException('Payment provider reference mismatch.');
    } catch (error) {
      await this.integrations.recordProviderSignal('PAYMENT_PSP', 'PROVIDER_FAILURE');
      throw error;
    }
    await this.integrations.recordProviderSignal('PAYMENT_PSP', 'SUCCESS');
    return invoice;
  }

  private assertPaymentBinding(providerPaymentId:unknown,binding:MoyasarPaymentBinding){
    if(typeof providerPaymentId!=='string'||!providerUuid.test(providerPaymentId)
      ||!binding||typeof binding.invoiceId!=='string'||!providerUuid.test(binding.invoiceId)
      ||!Number.isSafeInteger(binding.amountMinor)||binding.amountMinor<=0||binding.amountMinor>maxProviderMinor
      ||typeof binding.currency!=='string'||!/^[A-Z]{3}$/.test(binding.currency)){
      throw new BadRequestException('A valid provider payment and invoice binding is required.');
    }
  }

  private async observePayment(payload:unknown,providerPaymentId:string,binding:MoyasarPaymentBinding){
    let payment:MoyasarPayment;
    try{payment=this.payment(payload,providerPaymentId,binding);}
    catch(error){await this.integrations.recordProviderSignal('PAYMENT_PSP','PROVIDER_FAILURE');throw error;}
    await this.integrations.recordProviderSignal('PAYMENT_PSP','SUCCESS');
    return payment;
  }

  private payment(payload:unknown,providerPaymentId:string,binding:MoyasarPaymentBinding):MoyasarPayment{
    if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new ServiceUnavailableException('Payment provider returned an invalid payment.');
    const row=payload as Record<string,unknown>;
    const amount=typeof row.amount==='number'?row.amount:Number.NaN;
    const captured=typeof row.captured==='number'?row.captured:Number.NaN;
    const refunded=typeof row.refunded==='number'?row.refunded:Number.NaN;
    const status=typeof row.status==='string'?row.status:'';
    const timestamp=(value:unknown)=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)&&Number.isFinite(Date.parse(value));
    if(row.id!==providerPaymentId||row.invoice_id!==binding.invoiceId||row.currency!==binding.currency||amount!==binding.amountMinor
      ||!providerPaymentStatuses.has(status)||!Number.isSafeInteger(amount)||amount<=0||amount>maxProviderMinor
      ||!Number.isSafeInteger(captured)||captured<0||captured>amount
      ||!Number.isSafeInteger(refunded)||refunded<0||refunded>amount
      ||!timestamp(row.updated_at)||!(row.refunded_at==null||timestamp(row.refunded_at))){
      throw new ServiceUnavailableException('Payment provider payment binding or amount is invalid.');
    }
    // Purchase flow charges the full amount directly (status paid). The captured
    // field records manual capture; keep a partial manual capture as the ceiling
    // after its status changes to refunded.
    const capturedMinor=captured>0?captured:(['paid','refunded'].includes(status)?amount:0);
    if(refunded>capturedMinor||(status==='captured'&&capturedMinor===0)
      ||(!['paid','captured','refunded'].includes(status)&&refunded>0)){
      throw new ServiceUnavailableException('Payment provider captured/refunded balance is invalid.');
    }
    return{id:providerPaymentId,invoiceId:binding.invoiceId,status,amountMinor:amount,currency:binding.currency,
      capturedMinor,refundedMinor:refunded,updatedAt:new Date(row.updated_at as string).toISOString(),
      refundedAt:row.refunded_at==null?null:new Date(row.refunded_at as string).toISOString()};
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
    if(checkout.protocol!=='https:'&&!(checkout.protocol==='http:'&&['localhost','127.0.0.1'].includes(checkout.hostname)))throw new ServiceUnavailableException('Payment checkout URL must use HTTPS.');
    const payments=Array.isArray(row.payments)?row.payments.flatMap(value=>{
      if(!value||typeof value!=='object'||Array.isArray(value))return[];
      const payment=value as Record<string,unknown>;
      if(typeof payment.id!=='string'||typeof payment.status!=='string'||!Number.isInteger(payment.amount)||typeof payment.currency!=='string')return[];
      return[{id:payment.id,status:payment.status,amount:payment.amount as number,currency:payment.currency}];
    }):[];
    return{id,status,amount,currency,url:checkout.toString(),metadata,payments};
  }

  private publicWebOrigin(){
    const raw=process.env.HYDROLAND_PUBLIC_WEB_ORIGIN?.trim();if(!raw)throw new ServiceUnavailableException('Public web origin is not configured.');
    let url:URL;try{url=new URL(raw);}catch{throw new ServiceUnavailableException('Public web origin is invalid.');}
    if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))throw new ServiceUnavailableException('Public web origin must use HTTPS.');
    url.pathname='/';url.search='';url.hash='';return url;
  }
}
