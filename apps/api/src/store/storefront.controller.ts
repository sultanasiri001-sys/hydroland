import {BadRequestException, Body, ConflictException, Controller, Get, NotFoundException, Param, Put, Query, Req, UseGuards} from '@nestjs/common';
import {AccessTokenGuard} from '../auth/access-token.guard';
import {DatabaseService} from '../database/database.service';
import {StoreOfferingsService} from './store-offerings.service';

type Profile={description:string;hours:string;faqs:Array<{question:string;answer:string}>;published:boolean};
const empty:Profile={description:'',hours:'',faqs:[],published:false};
const profileKey=(id:string)=>'merchant-storefront:'+id;

function profileData(body:Record<string,unknown>):Profile {
  const invalid=()=>new BadRequestException('تحقق من وصف المتجر وساعات العمل والأسئلة.');
  const text=(value:unknown,max:number)=>{
    if(typeof value!=='string'||value.trim().length>max||value.includes('\0'))throw invalid();
    return value.trim();
  };
  if(!body||Object.keys(body).some(k=>!['description','hours','faqs','published','revision'].includes(k))
    ||typeof body.published!=='boolean'||!(body.revision===null||typeof body.revision==='string')
    ||!Array.isArray(body.faqs)||body.faqs.length>10)throw invalid();
  return {description:text(body.description,1800),hours:text(body.hours,300),published:body.published,
    faqs:body.faqs.map(row=>{
      if(!row||typeof row!=='object'||Object.keys(row).some(k=>!['question','answer'].includes(k)))throw invalid();
      const question=text(row.question,180),answer=text(row.answer,900);
      if(!question||!answer)throw invalid();
      return {question,answer};
    })};
}

@Controller('store')
export class StorefrontController {
  constructor(private readonly db:DatabaseService,private readonly offers:StoreOfferingsService){}

  @Get('storefronts')
  directory(@Query('q') query='',@Query('after') after=''){
    if(typeof query!=='string'||typeof after!=='string'||query.length>120||after.length>128)throw new BadRequestException();
    return this.db.$queryRaw<Array<{id:string;displayName:string}>>`
      SELECT o.id,o."displayName" FROM "Organization" o
      JOIN "OperationalSetting" s ON s.key=('merchant-storefront:'||o.id::text)
      WHERE o.status='ACTIVE' AND o.kind='DIVE_CENTER' AND s.value->>'published'='true'
        AND o.id::text>${after} AND position(lower(${query.trim()}) in lower(o."displayName"))>0
      ORDER BY o.id::text LIMIT 50`;
  }

  @Get('storefronts/:id')
  async published(@Param('id') id:string){
    if(!id||id.length>128)throw new NotFoundException();
    const rows=await this.db.$queryRaw<Array<{id:string;displayName:string;profile:Profile}>>`
      SELECT o.id,o."displayName",s.value AS profile FROM "Organization" o
      JOIN "OperationalSetting" s ON s.key=('merchant-storefront:'||o.id::text)
      WHERE o.id::text=${id} AND o.status='ACTIVE' AND o.kind='DIVE_CENTER' AND s.value->>'published'='true'`;
    if(!rows.length)throw new NotFoundException('صفحة المتجر غير منشورة.');
    const {profile,...organization}=rows[0];
    return {...organization,description:profile.description,hours:profile.hours,faqs:profile.faqs};
  }

  @UseGuards(AccessTokenGuard) @Get('provider/storefront')
  current(@Req() req:{auth:{accountId:string}}){
    return this.db.serializable(async tx=>{
      const organization=await this.offers.providerScope(tx,req.auth.accountId);
      const row=await tx.operationalSetting.findUnique({where:{key:profileKey(organization.id)}});
      return {organization,profile:row?.value??empty,revision:row?.updatedAt.toISOString()??null};
    });
  }

  @UseGuards(AccessTokenGuard) @Put('provider/storefront')
  save(@Req() req:{auth:{accountId:string}},@Body() body:Record<string,unknown>){
    const profile=profileData(body);
    return this.db.serializable(async tx=>{
      const organization=await this.offers.providerScope(tx,req.auth.accountId),key=profileKey(organization.id);
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${key},0))`;
      const row=await tx.operationalSetting.findUnique({where:{key}});
      const previous=row?.value as Profile|null;
      if(previous && previous.published===profile.published && previous.description===profile.description && previous.hours===profile.hours
        && previous.faqs.length===profile.faqs.length && previous.faqs.every((p,i)=>p.question===profile.faqs[i].question&&p.answer===profile.faqs[i].answer)){
        return {organization,profile,revision:row!.updatedAt.toISOString()};
      }
      if((row?.updatedAt.toISOString()??null)!==body.revision)throw new ConflictException('تغيرت صفحة المتجر. حدّث البيانات قبل حفظها.');
      const updatedAt=new Date(Math.max(Date.now(),(row?.updatedAt.getTime()??0)+1));
      const saved=await tx.operationalSetting.upsert({where:{key},create:{key,value:profile,updatedAt},update:{value:profile,updatedAt}});
      await tx.auditEvent.create({data:{action:'MERCHANT_STOREFRONT_UPDATED',resource:'Organization',resourceId:organization.id,metadata:{accountId:req.auth.accountId,published:profile.published}}});
      return {organization,profile,revision:saved.updatedAt.toISOString()};
    });
  }
}
