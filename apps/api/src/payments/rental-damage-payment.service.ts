import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { requirePostedCommerceCollection } from '../commerce/rental-collection-ledger';
import { rentalContractHash, rentalObject } from '../commerce/rental-contract';
import { DatabaseService } from '../database/database.service';
import { FinanceAccessService } from '../finance/finance-access.service';
import { MoyasarCommerceInvoiceInput, MoyasarPaymentProviderService, MoyasarWebhook } from './moyasar-payment-provider.service';

const sourceType='RENTAL_DAMAGE';
const fields={id:true,organizationId:true,customerAccountId:true,amountMinor:true,currency:true,sha256:true,itemId:true,handoverReceiptId:true,returnReceiptId:true,status:true,payableAt:true,activeCheckoutId:true,financeEntryId:true} as const;
type Claim=Prisma.RentalDamageClaimGetPayload<{select:typeof fields}>;
type Role='renter'|'accountant'|'webhook';
const json=(value:unknown)=>value as Prisma.InputJsonObject;
const refOk=(value:unknown):value is string=>typeof value==='string'&&/^[a-z0-9-]{1,128}$/i.test(value);

@Injectable()
export class RentalDamagePaymentService {
  private readonly finance:FinanceAccessService;
  constructor(private readonly db:DatabaseService,private readonly provider:MoyasarPaymentProviderService,private readonly audit:AuditService){this.finance=new FinanceAccessService(db);}

  private async claim(tx:Prisma.TransactionClient,id:string,role:Role,actor?:string) {
    await tx.$queryRaw`SELECT "id" FROM "RentalDamageClaim" WHERE "id"=${id} FOR UPDATE`;
    const claim=await tx.rentalDamageClaim.findUnique({where:{id},select:fields});
    if(!claim||role==='renter'&&claim.customerAccountId!==actor)throw new NotFoundException('المطالبة غير متاحة.');
    if(role==='accountant'){
      try{await this.finance.requireCenterOrganizationAccountant(actor!,claim.organizationId,tx);}
      catch{throw new ForbiddenException('تتطلب المطابقة محاسب المركز المورّد.');}
    }
    if(!claim.payableAt||!['PAYABLE','COLLECTED'].includes(claim.status))throw new ConflictException('يتوقف التحصيل إلى أن يوافق المستأجر أو يُحسم الاعتراض.');
    return claim;
  }
  private snapshot(c:Claim,expiresAt:string) {
    return {claimId:c.id,itemId:c.itemId,organizationId:c.organizationId,customerAccountId:c.customerAccountId,amountMinor:c.amountMinor,currency:c.currency,
      documentHash:c.sha256,handoverReceiptId:c.handoverReceiptId,returnReceiptId:c.returnReceiptId,payableAt:c.payableAt!.toISOString(),expiresAt};
  }
  private async binding(tx:Prisma.TransactionClient,c:Claim) {
    const checkout=c.activeCheckoutId?await tx.commerceCheckout.findUnique({where:{id:c.activeCheckoutId}}):null;
    if(!checkout)throw new ConflictException('لم يبدأ دفع هذه المطالبة.');
    const expiresAt=rentalObject(checkout.contractSnapshot).expiresAt;
    if(typeof expiresAt!=='string'||!Number.isFinite(Date.parse(expiresAt))||checkout.sourceType!==sourceType||checkout.sourceId!==checkout.id||
      checkout.organizationId!==c.organizationId||checkout.customerAccountId!==c.customerAccountId||checkout.currency!=='SAR'||checkout.amountMinor!==c.amountMinor||
      checkout.provider!=='MOYASAR'||!checkout.dispatchedAt||checkout.requestFingerprint!==rentalContractHash(this.snapshot(c,expiresAt))||
      rentalContractHash(checkout.contractSnapshot)!==checkout.requestFingerprint)throw new ConflictException('يلزم التحقق من بيانات مطالبة الضرر الأصلية.');
    const input:MoyasarCommerceInvoiceInput={checkoutId:checkout.id,sourceType,sourceId:c.id,customerAccountId:c.customerAccountId,organizationId:c.organizationId,amountMinor:c.amountMinor,currency:'SAR',expiresAt};
    return {checkout,input};
  }
  async start(actor:string,id:string) {
    const reservation=await this.db.serializable(async tx=>{
      const c=await this.claim(tx,id,'renter',actor);
      if(c.status==='COLLECTED')return null;
      if(c.amountMinor<100)throw new BadRequestException('الحد الأدنى لبوابة الدفع ريال واحد. تبقى قيمة المطالبة كما هي.');
      if(c.activeCheckoutId){
        const previous=await this.binding(tx,c);
        if(previous.checkout.status!=='CANCELLED')return {dispatch:false,...previous};
      }
      const key=randomUUID(),now=new Date(),expiresAt=new Date(now.getTime()+86400000).toISOString(),snapshot=this.snapshot(c,expiresAt);
      await tx.commerceCheckout.create({data:{id:key,sourceId:key,sourceType,organizationId:c.organizationId,customerAccountId:c.customerAccountId,amountMinor:c.amountMinor,
        currency:'SAR',idempotencyKey:'rental-damage:'+key,requestFingerprint:rentalContractHash(snapshot),contractSnapshot:snapshot,status:'DISPATCHED',dispatchedAt:now}});
      await tx.rentalDamageClaim.update({where:{id},data:{activeCheckoutId:key},select:{id:true}});
      await this.audit.record({actorId:actor,resource:'RentalDamageClaim',resourceId:id,action:'RENTAL_DAMAGE_CHECKOUT_REQUESTED',metadata:{checkoutId:key,amountMinor:c.amountMinor}},tx);
      return {dispatch:true,...await this.binding(tx,{...c,activeCheckoutId:key})};
    });
    if(!reservation)return {status:'COLLECTED',url:null};
    if(reservation.dispatch){
      // Commit the dispatch before contacting the PSP. A timeout can only be recovered by reading the original invoice.
      const invoice=await this.provider.createCommerceInvoice(reservation.input);
      return this.observe(id,'renter',actor,invoice.id,reservation.checkout.id);
    }
    return this.observe(id,'renter',actor,undefined,reservation.checkout.id);
  }
  async observe(id:string,role:Role,actor?:string,recovered?:string,expectedCheckoutId?:string,financeEntryId?:string) {
    const b=await this.db.serializable(async tx=>{
      const c=await this.claim(tx,id,role,actor);
      const binding=await this.binding(tx,c);
      if(expectedCheckoutId&&binding.checkout.id!==expectedCheckoutId)throw new ConflictException('تغيّرت محاولة الدفع.');
      if(recovered&&binding.checkout.providerInvoiceId&&recovered!==binding.checkout.providerInvoiceId)throw new ConflictException('مرجع الفاتورة مختلف.');
      return binding;
    });
    const invoiceId=b.checkout.providerInvoiceId||recovered;
    if(!invoiceId)throw new ConflictException('تتطلب العملية مطابقة مرجع الفاتورة الأصلية قبل المحاولة مجددًا.');
    const invoice=await this.provider.fetchCommerceInvoice(invoiceId,b.input);
    const paid=invoice.payments.filter(p=>['paid','captured','refunded'].includes(p.status));
    if(paid.length>1||invoice.status==='paid'&&paid.length!==1)throw new ConflictException('يلزم التحقق من دفعات الفاتورة.');
    const p=paid.length===1?await this.provider.fetchPayment(paid[0].id,{invoiceId,amountMinor:b.input.amountMinor,currency:'SAR'}):null;
    const at=new Date();
    const captured=invoice.status==='paid'&&p&&['paid','captured'].includes(p.status)&&p.capturedMinor===b.input.amountMinor&&p.refundedMinor===0&&p.refundedAt===null&&Date.parse(p.updatedAt)<=+at&&paid[0].amount===b.input.amountMinor&&paid[0].currency==='SAR';
    const empty=invoice.payments.length===0&&!p&&!b.checkout.providerPaymentId;
    const status=captured?'CAPTURED':empty&&['expired','canceled','voided'].includes(invoice.status)?'CANCELLED':
      empty&&['initiated','on_hold'].includes(invoice.status)&&Date.parse(b.input.expiresAt)>+at?'PENDING':'RECONCILIATION_REQUIRED';
    return this.db.serializable(async tx=>{
      const c=await this.claim(tx,id,role,actor),{checkout}=await this.binding(tx,c);
      if(checkout.id!==b.checkout.id||checkout.providerInvoiceId&&checkout.providerInvoiceId!==invoiceId||
        checkout.providerPaymentId&&checkout.providerPaymentId!==p?.id)throw new ConflictException('تغيّرت مراجع الدفع. حدّث المطابقة.');
      if(checkout.updatedAt.getTime()!==b.checkout.updatedAt.getTime()||rentalContractHash(checkout.providerResult)!==rentalContractHash(b.checkout.providerResult))
        throw new ConflictException('وصل تحديث آخر للدفع. حدّث المطابقة.');
      const previous=rentalObject(rentalObject(checkout.providerResult).payment);
      if(p&&previous.id===p.id&&(p.refundedMinor<previous.refundedMinor||p.capturedMinor<previous.capturedMinor||Date.parse(p.updatedAt)<Date.parse(previous.updatedAt)))throw new ConflictException('لا يمكن اعتماد رصد أقدم من الرصيد المحفوظ.');
      if(c.status==='COLLECTED'&&status!=='CAPTURED')throw new ConflictException('تغيّر رصيد دفعة محصّلة، تلزم مراجعة مالية.');
      if(c.status==='COLLECTED'&&financeEntryId&&financeEntryId!==c.financeEntryId)throw new ConflictException('تمت مطابقة قيد مختلف.');
      await tx.commerceCheckout.update({where:{id:checkout.id},data:{status,providerInvoiceId:invoice.id,providerPaymentId:p?.id??null,providerResult:json({invoice,payment:p,verifiedAt:at.toISOString()})},select:{id:true}});
      if(financeEntryId&&c.status!=='COLLECTED'){
        if(role!=='accountant'||!p||!captured||Date.now()-at.getTime()>60000)throw new ConflictException('تتطلب المطابقة دفعة كاملة ومؤكدة من المزوّد.');
        const entry=await requirePostedCommerceCollection(tx,{financeEntryId,sourceId:id,organizationId:c.organizationId,amountMinor:c.amountMinor,referenceType:'RENTAL_DAMAGE_COLLECTION'});
        if(entry.createdAt<c.payableAt!)throw new ConflictException('قيد التحصيل يسبق استحقاق المطالبة.');
        await tx.commerceCollectionEvidence.create({data:{sourceType,sourceId:id,organizationId:c.organizationId,customerAccountId:c.customerAccountId,amountMinor:c.amountMinor,currency:'SAR',
          provider:'MOYASAR',providerPaymentId:p.id,providerInvoiceId:invoice.id,providerCapturedMinor:p.capturedMinor,providerRefundedMinor:p.refundedMinor,providerVerifiedAt:at,
          providerSnapshot:json({...p,invoiceMetadata:invoice.metadata}),financeEntryId,contractSnapshot:json(checkout.contractSnapshot)}});
        await tx.rentalDamageClaim.update({where:{id},data:{financeEntryId,status:'COLLECTED'},select:{id:true}});
        await this.audit.record({actorId:actor,action:'RENTAL_DAMAGE_COLLECTED',resource:'RentalDamageClaim',resourceId:id,metadata:{financeEntryId,providerPaymentId:p.id,invoiceId}},tx);
      }
      return {status:c.status==='COLLECTED'||financeEntryId?'COLLECTED':status,url:role==='renter'&&status==='PENDING'?invoice.url:null};
    });
  }
  verify(actor:string,id:string,body:{invoiceId?:string;financeEntryId?:string}) {
    if(!body||!(body.invoiceId||body.financeEntryId)||[body.invoiceId,body.financeEntryId].some(v=>v!==undefined&&!refOk(v)))throw new BadRequestException('أدخل مرجعًا ماليًا صالحًا.');
    return this.observe(id,'accountant',actor,body.invoiceId,undefined,body.financeEntryId);
  }
  async handleVerifiedProviderEvent(event:MoyasarWebhook){
    const invoiceId=event.data.invoice_id;
    if(typeof invoiceId!=='string'||!invoiceId)return {handled:false};
    const checkout=await this.db.commerceCheckout.findUnique({where:{providerInvoiceId:invoiceId},select:{sourceType:true,id:true}});
    if(checkout?.sourceType!==sourceType)return {handled:false};
    const claim=await this.db.rentalDamageClaim.findUnique({where:{activeCheckoutId:checkout.id},select:{id:true}});
    if(!claim)throw new ConflictException('تتطلب محاولة الدفع السابقة مراجعة.');
    const result=await this.observe(claim.id,'webhook',undefined,undefined,checkout.id);
    return {handled:true,status:result.status,claimId:claim.id};
  }
}
