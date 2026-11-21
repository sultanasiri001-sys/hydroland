import { BadRequestException, Body, ConflictException, Controller, Get, NotFoundException, Param, Put, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { DatabaseService } from '../database/database.service';

@UseGuards(AccessTokenGuard)
@Controller('store/preferences')
export class StorePreferencesController {
  constructor(private readonly db: DatabaseService) {}

  @Get('mine')
  mine(@Req() request:any) {
    return this.db.storeProductPreference.findMany({where:{accountId:request.auth.accountId},
      select:{productId:true,favorite:true,stockAlert:true},orderBy:{productId:'asc'}});
  }

  @Put(':productId/:kind')
  update(@Req() request:any,@Param('productId') productId:string,@Param('kind') kind:string,@Body() body:{enabled?:boolean}) {
    if (!['favorite','stock-alert'].includes(kind) || typeof body?.enabled !== 'boolean' || Object.keys(body).length !== 1) {
      throw new BadRequestException('تحقق من الاختيار.');
    }
    const enabled=body.enabled,accountId=request.auth.accountId as string;
    const field=kind==='favorite'?'favorite':'stockAlert';
    return this.db.serializable(async tx=>{
      // Serialize opt-ins with stock changes so a restock cannot pass a pending subscription.
      await tx.$queryRaw`SELECT id FROM "StoreProduct" WHERE id::text=${productId} FOR UPDATE`;
      if(enabled){
        const product=await tx.storeProduct.findFirst({where:{id:productId,status:'ACTIVE',
          OR:[{organizationId:null},{organization:{status:'ACTIVE'}}]},select:{stockQuantity:true}});
        if(!product)throw new NotFoundException('المنتج غير متاح.');
        if(field==='stockAlert' && product.stockQuantity>0)throw new ConflictException('المنتج متوفر الآن.');
      }
      const key={accountId,productId};
      let row=await tx.storeProductPreference.findUnique({where:{accountId_productId:key}});
      if(row)row=await tx.storeProductPreference.update({where:{accountId_productId:key},data:{[field]:enabled}});
      else if(enabled)row=await tx.storeProductPreference.create({data:{...key,[field]:true}});
      if(row&&!row.favorite&&!row.stockAlert)await tx.storeProductPreference.delete({where:{accountId_productId:key}});
      return {productId,favorite:row?.favorite ?? false,stockAlert:row?.stockAlert ?? false};
    });
  }
}
