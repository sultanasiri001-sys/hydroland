import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
@Injectable()
export class StoreService {
 constructor(private readonly prisma:DatabaseService){}
 listProducts(){return this.prisma.storeProduct.findMany({where:{status:'ACTIVE'},orderBy:{nameAr:'asc'}})}
 async createOrder(accountId:string,items:{productId:string;quantity:number}[]){
  if(!items?.length)throw new BadRequestException('Order requires items');
  return this.prisma.$transaction(async tx=>{
   const ids=[...new Set(items.map(x=>x.productId))]; const products=await tx.storeProduct.findMany({where:{id:{in:ids},status:'ACTIVE'}}); const map=new Map(products.map(p=>[p.id,p]));
   let total=0; for(const item of items){const p=map.get(item.productId);if(!p)throw new NotFoundException('Product unavailable');if(!Number.isInteger(item.quantity)||item.quantity<1||p.stockQuantity<item.quantity)throw new BadRequestException('Invalid quantity or insufficient stock');total+=p.priceMinor*item.quantity;}
   const order=await tx.storeOrder.create({data:{accountId,totalMinor:total,items:{create:items.map(i=>({productId:i.productId,quantity:i.quantity,unitPriceMinor:map.get(i.productId)!.priceMinor}))}},include:{items:true}});
   for(const item of items)await tx.storeProduct.update({where:{id:item.productId},data:{stockQuantity:{decrement:item.quantity}}}); return order;
  });
 }
 listMine(accountId:string){return this.prisma.storeOrder.findMany({where:{accountId},include:{items:{include:{product:true}}},orderBy:{createdAt:'desc'}})}
}
