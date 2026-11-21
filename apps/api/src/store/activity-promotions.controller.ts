import { BadRequestException, Body, ConflictException, Controller, Get, NotFoundException, Param, Put, Req, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { AdminGuard } from '../admin/admin.guard';
import { DatabaseService } from '../database/database.service';
import { normalizeSale, priceActivity } from './activity-promotions';

const object=(v:unknown):Record<string,any>=>v && typeof v==='object'&&!Array.isArray(v)?v as Record<string,any>:{};
const revision=(v:Date|null)=>v?.toISOString() ?? null;
const baseAmount=(n:unknown):n is number=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0&&n<=2147483647;
const rentalKey=(id:string)=>'store-rental-rate:'+id;
type Equipment = {id:string;title:string;code:string;available:boolean;supplier:string;organizationId:string;profile:unknown;updatedAt:Date|null};
async function equipment(db: Pick<Prisma.TransactionClient,'$queryRaw'>,published:boolean,id?:string){
 return db.$queryRaw<Equipment[]>`SELECT b."resourceId" AS id,r.name AS title,b."assetCode" AS code, (b."stockStatus"='AVAILABLE') AS available,
   o."displayName" AS supplier,o.id::text AS "organizationId",s.value AS profile,s."updatedAt"
   FROM "EquipmentBarcode" b JOIN "CalendarResource" r ON r.id=b."resourceId" JOIN "Organization" o ON o.id::text=b."organizationId"::text
   LEFT JOIN "OperationalSetting" s ON s.key= ('store-rental-rate:'||b."resourceId"::text)
   WHERE o.status='ACTIVE' AND o.kind='DIVE_CENTER' AND (${id??null}::text IS NULL OR b."resourceId"::text=${id??null}::text)
   AND (NOT ${published} OR (s.value->>'organizationId'=o.id::text AND s.value->>'published'='true'))
   ORDER BY r.name,b."assetCode"`;
}
@Controller('store')
export class ActivityPromotionsController {
 constructor(private readonly db:DatabaseService){}
 @Get('rental-offers')
 async rentals(){
   return (await equipment(this.db,true)).flatMap(row=>{
     const profile=object(row.profile),base=profile.baseMinor;
     return !baseAmount(base)?[]:[{id:row.id,title:row.title,sku:row.code,available:row.available,supplier:row.supplier,organizationId:row.organizationId,currency:'SAR',...priceActivity(base,profile.sale)}];
   });
 }
 @UseGuards(AccessTokenGuard,AdminGuard) @Get('admin/activity-promotions')
 async list(){
   const [courses,trips,assets,prices]=await Promise.all([this.db.storeCourseOffer.findMany({select:{id:true,title:true,currency:true,priceMinor:true,saleDetails:true,updatedAt:true},orderBy:{title:'asc'}}),
     this.db.trip.findMany({select:{id:true,title:true},orderBy:{title:'asc'}}),equipment(this.db,false),
     this.db.operationalSetting.findMany({where:{key:{startsWith:'trip-price:'}},select:{key:true,value:true,updatedAt:true}})]);
   const byId=new Map(prices.map(row=>[row.key.slice('trip-price:'.length),row]));
   return [...courses.map(c=>({id:c.id,type:'course',title:c.title,baseMinor:c.priceMinor,currency:c.currency,sale:c.saleDetails,revision:revision(c.updatedAt)})),
     ...trips.flatMap(t=>{const row=byId.get(t.id),v=object(row?.value);return row&&baseAmount(v.pricePerSeatMinor)&&v.currency==='SAR'?[{id:t.id,title:t.title,type:'trip',baseMinor:v.pricePerSeatMinor,currency:'SAR',sale:v.sale??null,revision:revision(row.updatedAt)}]:[]}),
     ...assets.map(a=>{const v=object(a.profile),current=v.organizationId===a.organizationId?v:{};return {id:a.id,type:'rental',title:a.title+' · '+a.code,baseMinor:current.baseMinor??null,currency:'SAR',sale:current.sale??null,published:current.published===true,revision:revision(a.updatedAt)}})];
 }
 @UseGuards(AccessTokenGuard,AdminGuard) @Put('admin/activity-promotions/:type/:id')
 set(@Req() req:{auth:{accountId:string}},@Param('type') type:string,@Param('id') id:string,@Body() body:Record<string,unknown>){
   if(!body||!['trip','course','rental'].includes(type)||Object.keys(body).some(k=>!['baseMinor','revision','sale','published'].includes(k))
     || (body.revision!==null&&typeof body.revision!=='string')||!baseAmount(body.baseMinor))throw new BadRequestException('تحقق من الصنف والسعر.');
   const base=body.baseMinor,sale=normalizeSale(body.sale,base);
   return this.db.serializable(async tx=>{
     await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${'activity-promotion:'+type+':'+id},0))`;
     if(type==='course'){
       const c=await tx.storeCourseOffer.findUnique({where:{id}});if(!c)throw new NotFoundException();
       if(c.priceMinor!==base||revision(c.updatedAt)!==body.revision)throw new ConflictException('تغير سعر الدورة. حدّث اللوحة.');
       await tx.storeCourseOffer.update({where:{id,updatedAt:c.updatedAt},data:{saleDetails:sale,updatedAt:new Date(Math.max(Date.now(),c.updatedAt.getTime()+1))}});
     } else {
       const key=type==='trip'?'trip-price:'+id:rentalKey(id),row=await tx.operationalSetting.findUnique({where:{key}}),v=object(row?.value);
       if(revision(row?.updatedAt??null)!==body.revision)throw new ConflictException('تغيرت الأسعار. حدّث اللوحة.');
       let next:Prisma.InputJsonObject;
       if(type==='trip'){
         if(!row||!await tx.trip.findUnique({where:{id},select:{id:true}}))throw new NotFoundException();
         if(v.currency!=='SAR'||v.pricePerSeatMinor!==base)throw new ConflictException('تحقق من السعر الأساسي للرحلة.');
         next={...v,sale};
       }else{
         const [asset]=await equipment(tx,false,id);if(!asset)throw new NotFoundException();
         if(typeof body.published!=='boolean')throw new BadRequestException('اختر حالة نشر عرض التأجير.');
         next={baseMinor:base,published:body.published,organizationId:asset.organizationId,sale};
       }
       const updatedAt=new Date(Math.max(Date.now(),(row?.updatedAt.getTime()??0)+1));
       await tx.operationalSetting.upsert({where:{key},create:{key,value:next,updatedAt},update:{value:next,updatedAt}});
     }
     await tx.auditEvent.create({data:{resource:'StoreActivityPromotion',resourceId:id,action:'STORE_ACTIVITY_PROMOTION_CHANGED',metadata:{type,base,sale,accountId:req.auth.accountId}}});
     return {id,type,...priceActivity(base,sale)};
   });
 }
}
