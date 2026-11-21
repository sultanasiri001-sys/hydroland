import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { StoreOfferingsService } from './store-offerings.service';

const customerFields={id:true,productId:true,kind:true,body:true,rating:true,reply:true,published:true,revision:true,createdAt:true};
const online={status:'ACTIVE' as const,OR:[{organizationId:null},{organization:{status:'ACTIVE' as const}}]};
function content(value:unknown) {
  if(typeof value!=='string' || !value.trim() || value.trim().length>1800 || value.includes('\u0000'))throw new BadRequestException('أدخل نصًا من ١ إلى ١٨٠٠ حرف.');
  return value.trim();
}
function inputFields(input:Record<string,unknown>,fields:string[]) {
  if(!input || typeof input!=='object' || Array.isArray(input) || Object.keys(input).some(k=>!fields.includes(k)))throw new BadRequestException('تحقق من حقول الطلب.');
}
@Injectable()
export class StoreFeedbackService{
  constructor(private readonly db:DatabaseService,private readonly offers:StoreOfferingsService){}
  publicList(productId:string){
    return this.db.storeProductFeedback.findMany({where:{productId,published:true,product:online},
      select:{id:true,kind:true,body:true,rating:true,reply:true,createdAt:true},orderBy:[{createdAt:'desc'},{id:'desc'}],take:100});
  }
  mine(accountId:string,productId:string){
    return this.db.storeProductFeedback.findMany({where:{accountId,productId},select:customerFields,orderBy:{createdAt:'desc'},take:100});
  }
  save(accountId:string,productId:string,input:Record<string,unknown>){
    inputFields(input,['id','kind','body','rating','revision']);
    const id=input.id,kind=input.kind,body=content(input.body),rating=input.rating??null;
    if(typeof id!=='string'|| !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ||
      !['QUESTION','REVIEW'].includes(String(kind)) || (kind==='REVIEW' ? typeof rating!=='number'||!Number.isInteger(rating)||rating<1||rating>5 : rating!==null))throw new BadRequestException('تحقق من نوع المشاركة والتقييم.');
    return this.db.serializable(async tx=>{
      await tx.$queryRaw`SELECT id FROM "StoreProduct" WHERE id::text=${productId} FOR SHARE`;
      if(!await tx.storeProduct.findFirst({where:{id:productId,...online},select:{id:true}}))throw new NotFoundException('المنتج غير متاح.');
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${'store-feedback:'+accountId+':'+productId},0))`;
      const row=await tx.storeProductFeedback.findUnique({where:{id}});
      if(row){
        if(row.accountId!==accountId||row.productId!==productId||row.kind!==kind)throw new ConflictException('تعذر استخدام هذا المعرّف.');
        if(row.body===body&&row.rating===rating)return tx.storeProductFeedback.findUniqueOrThrow({where:{id},select:customerFields});
        if(input.revision!==row.revision)throw new ConflictException('تغيرت المشاركة. حدّث الصفحة.');
        return tx.storeProductFeedback.update({where:{id,revision:row.revision},data:{body,rating:rating as number|null,published:false,reply:null,revision:{increment:1}},select:customerFields});
      }
      if(input.revision!==undefined)throw new ConflictException('المشاركة غير موجودة.');
      if(kind==='REVIEW'){
        if(!await tx.storeGoodsDelivery.findFirst({where:{customerAccountId:accountId,item:{productId}},select:{id:true}}))throw new BadRequestException('يمكن تقييم المنتج بعد تسجيل استلامه.');
        if(await tx.storeProductFeedback.findFirst({where:{accountId,productId,kind:'REVIEW'},select:{id:true}}))throw new ConflictException('يمكنك تعديل تقييمك الحالي.');
      }
      return tx.storeProductFeedback.create({data:{id,accountId,productId,kind:kind as string,body,rating:rating as number|null},select:customerFields});
    });
  }
  queue(accountId:string,admin:boolean){
    return this.db.serializable(async tx=>{
      const org=admin?null:await this.offers.providerScope(tx,accountId);
      return tx.storeProductFeedback.findMany({where:org?{product:{organizationId:org.id}}:{},
        select:{...customerFields,product:{select:{nameAr:true,sku:true}}},orderBy:[{published:'asc'},{createdAt:'desc'}],take:150});
    });
  }
  moderate(accountId:string,admin:boolean,id:string,input:Record<string,unknown>){
    inputFields(input,['published','reply','revision']);
    if(typeof input.published!=='boolean'||!Number.isInteger(input.revision))throw new BadRequestException('تحقق من حالة النشر.');
    const published=input.published,reply=input.reply==null||input.reply===''?null:content(input.reply);
    return this.db.serializable(async tx=>{
      const org=admin?null:await this.offers.providerScope(tx,accountId);
      const row=await tx.storeProductFeedback.findFirst({where:{id,...(org?{product:{organizationId:org.id}}:{})}});
      if(!row)throw new NotFoundException('المشاركة غير موجودة.');
      if(row.revision!==input.revision)throw new ConflictException('تغيرت المشاركة. حدّث الصفحة.');
      if(published && row.kind==='QUESTION' && !reply)throw new BadRequestException('أضف الإجابة قبل النشر.');
      const updated=await tx.storeProductFeedback.update({where:{id,revision:row.revision},data:{published,reply,revision:{increment:1}},select:customerFields});
      await tx.auditEvent.create({data:{resource:'StoreProductFeedback',resourceId:id,action:'STORE_FEEDBACK_MODERATED',metadata:{accountId,published,revision:updated.revision}}});
      return updated;
    });
  }
}
