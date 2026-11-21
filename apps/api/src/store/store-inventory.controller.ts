import {BadRequestException,Body,ConflictException,Controller,Get,NotFoundException,Post,Req,UseGuards} from '@nestjs/common';
import {Prisma} from '@prisma/client';
import {AccessTokenGuard} from '../auth/access-token.guard';
import {DatabaseService} from '../database/database.service';
import {StoreOfferingsService} from './store-offerings.service';

const online='ONLINE';
const maxStock=2147483647;
type Request={auth:{accountId:string}};
const validId=(v:unknown):v is string=>typeof v==='string' && v.length>0 && v.length<=128;
const uuid=(v:unknown):v is string=>typeof v==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

@UseGuards(AccessTokenGuard)
@Controller('store/provider/inventory')
export class StoreInventoryController {
  constructor(private readonly db:DatabaseService,private readonly offers:StoreOfferingsService){}
  private async write<T>(work:(tx:Prisma.TransactionClient)=>Promise<T>){
    try{return await this.db.serializable(work)}catch(error){
      if(error instanceof Prisma.PrismaClientKnownRequestError && error.code==='P2002')return this.db.serializable(work);
      throw error;
    }
  }
  @Get()
  inventory(@Req() req:Request){
    return this.db.serializable(async tx=>{
      const org=await this.offers.providerScope(tx,req.auth.accountId);
      const [locations,units,products,movements]=await Promise.all([
        tx.storeStockLocation.findMany({where:{organizationId:org.id},orderBy:{title:'asc'},select:{id:true,title:true,code:true,orgUnitId:true}}),
        tx.orgUnit.findMany({where:{organizationId:org.id,active:true,type:{in:['CENTER','UNIT']}},orderBy:{nameAr:'asc'},select:{id:true,nameAr:true,code:true}}),
        tx.storeProduct.findMany({where:{organizationId:org.id,kind:'GOODS'},orderBy:{nameAr:'asc'},select:{id:true,nameAr:true,sku:true,stockQuantity:true,locationStock:{where:{quantity:{gt:0}},select:{locationId:true,quantity:true}}}}),
        tx.storeStockTransfer.findMany({where:{organizationId:org.id},orderBy:[{movedAt:'desc'},{id:'desc'}],take:50,select:{id:true,productId:true,sourceKey:true,destinationKey:true,quantity:true,movedAt:true}}),
      ]);
      return {locations,units,products,movements};
    });
  }

  @Post('locations')
  createLocation(@Req() req:Request,@Body() body:Record<string,unknown>){
    if(!body||Object.keys(body).some(k=>!['requestId','code','title','orgUnitId'].includes(k))
      ||!uuid(body.requestId)||typeof body.title!=='string'||!body.title.trim()||body.title.trim().length>160
      ||typeof body.code!=='string'||!(/^[\p{L}\p{N}][\p{L}\p{N}_.-]{0,39}$/u.test(body.code.trim()))
      ||(body.orgUnitId!=null&&!validId(body.orgUnitId)))throw new BadRequestException('تحقق من رمز موقع المخزون واسمه وفرعه.');
    const id=body.requestId,code=body.code.trim().toUpperCase(),title=body.title.trim(),orgUnitId=typeof body.orgUnitId==='string'?body.orgUnitId:null;
    return this.write(async tx=>{
      const org=await this.offers.providerScope(tx,req.auth.accountId);
      const old=await tx.storeStockLocation.findUnique({where:{id}});
      if(old){
        if(old.organizationId!==org.id||old.code!==code||old.title!==title||old.orgUnitId!==orgUnitId)throw new ConflictException('يتعارض الطلب مع موقع مسجل.');
        return old;
      }
      if(orgUnitId && !await tx.orgUnit.findFirst({where:{id:orgUnitId,organizationId:org.id,active:true,type:{in:['CENTER','UNIT']}}}))throw new NotFoundException('الفرع غير متاح للمركز.');
      if(await tx.storeStockLocation.findUnique({where:{organizationId_code:{organizationId:org.id,code}}}))throw new ConflictException('رمز الموقع مستخدم في المركز.');
      return tx.storeStockLocation.create({data:{id,organizationId:org.id,code,title,orgUnitId}});
    });
  }

  @Post('transfers')
  transfer(@Req() req:Request,@Body() body:Record<string,unknown>){
    if(!body||Object.keys(body).some(k=>!['requestId','productId','sourceKey','destinationKey','quantity'].includes(k))
      ||!uuid(body.requestId)||!validId(body.productId)||!validId(body.sourceKey)||!validId(body.destinationKey)
      ||body.sourceKey===body.destinationKey||typeof body.quantity!=='number'||!Number.isSafeInteger(body.quantity)||body.quantity<1||body.quantity>maxStock){
      throw new BadRequestException('اختر صنفًا وموقعين مختلفين وكمية صحيحة.');
    }
    const {requestId:id,productId,sourceKey,destinationKey,quantity}=body,actorId=req.auth.accountId;
    return this.write(async tx=>{
      const org=await this.offers.providerScope(tx,actorId);
      const rows=await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM "StoreProduct" WHERE id::text=${productId}
        AND "organizationId"::text=${org.id} AND kind='GOODS' FOR UPDATE`;
      if(!rows.length)throw new NotFoundException('السلعة غير موجودة في المركز.');
      const receipt=await tx.storeStockTransfer.findUnique({where:{id}});
      if(receipt){
        if(receipt.organizationId!==org.id||receipt.actorId!==actorId||receipt.productId!==productId||
          receipt.sourceKey!==sourceKey||receipt.destinationKey!==destinationKey||receipt.quantity!==quantity)throw new ConflictException('مرجع الحركة مستخدم لعملية مختلفة.');
        return receipt;
      }
      const locations=[sourceKey,destinationKey].filter(k=>k!==online);
      if(await tx.storeStockLocation.count({where:{organizationId:org.id,id:{in:locations}}})!==locations.length)throw new NotFoundException('موقع المخزون غير موجود في المركز.');

      const debit=sourceKey===online
        ?await tx.storeProduct.updateMany({where:{id:productId,stockQuantity:{gte:quantity}},data:{stockQuantity:{decrement:quantity}}})
        :await tx.storeStockBalance.updateMany({where:{productId,locationId:sourceKey,quantity:{gte:quantity}},data:{quantity:{decrement:quantity}}});
      if(debit.count!==1)throw new ConflictException('الكمية المتاحة في المصدر غير كافية.');
      if(destinationKey===online){
        const credit=await tx.storeProduct.updateMany({where:{id:productId,stockQuantity:{lte:maxStock-quantity}},data:{stockQuantity:{increment:quantity}}});
        if(!credit.count)throw new ConflictException('يتجاوز الرصيد حد المخزون.');
      }else{
        const key={productId,locationId:destinationKey};
        const current=await tx.storeStockBalance.findUnique({where:{productId_locationId:key}});
        if(current && current.quantity>maxStock-quantity)throw new ConflictException('يتجاوز الرصيد حد المخزون.');
        await tx.storeStockBalance.upsert({where:{productId_locationId:key},create:{...key,quantity},update:{quantity:{increment:quantity}}});
      }
      return tx.storeStockTransfer.create({data:{id,organizationId:org.id,actorId,productId,sourceKey,destinationKey,quantity}});
    });
  }
}
