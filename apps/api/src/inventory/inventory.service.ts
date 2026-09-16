import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';

const INVENTORY_KEY='commerce.inventory';
const RENTALS_KEY='commerce.rentals';
type Item={id:string;sku:string;nameAr:string;nameEn?:string;category:string;quantity:number;dailyRateMinor:number;currency:string;enabled:boolean;updatedAt:string};
type Rental={id:string;accountId:string;itemId:string;quantity:number;startsAt:string;endsAt:string;status:'RESERVED'|'CANCELLED'|'COMPLETED';createdAt:string;updatedAt:string};

@Injectable()
export class InventoryService{
  constructor(private readonly db:DatabaseService,private readonly audit:AuditService){}
  private async read<T>(key:string):Promise<T[]>{const rows=await this.db.$queryRawUnsafe<Array<{value:unknown}>>('SELECT "value" FROM "OperationalSetting" WHERE "key"=$1 LIMIT 1',key);return Array.isArray(rows[0]?.value)?rows[0].value as T[]:[]}
  private async write(key:string,value:unknown){await this.db.$executeRawUnsafe('INSERT INTO "OperationalSetting" ("key","value","updatedAt") VALUES ($1,$2::jsonb,NOW()) ON CONFLICT ("key") DO UPDATE SET "value"=$2::jsonb,"updatedAt"=NOW()',key,JSON.stringify(value))}
  async catalog(){return (await this.read<Item>(INVENTORY_KEY)).filter(x=>x.enabled)}
  async adminCatalog(){return this.read<Item>(INVENTORY_KEY)}
  async upsertItem(input:Partial<Item>,accountId:string,id?:string){
    const items=await this.read<Item>(INVENTORY_KEY);const existing=id?items.find(x=>x.id===id):undefined;if(id&&!existing)throw new NotFoundException('Inventory item not found.');
    const sku=String(input.sku??existing?.sku??'').trim().toUpperCase();const nameAr=String(input.nameAr??existing?.nameAr??'').trim();const quantity=Number(input.quantity??existing?.quantity??0);const rate=Number(input.dailyRateMinor??existing?.dailyRateMinor??0);
    if(!/^[A-Z0-9-]{2,40}$/.test(sku)||nameAr.length<2||!Number.isInteger(quantity)||quantity<0||!Number.isInteger(rate)||rate<0)throw new BadRequestException('Invalid inventory item.');
    if(items.some(x=>x.sku===sku&&x.id!==id))throw new ConflictException('Inventory SKU already exists.');
    const item:Item={id:existing?.id??randomUUID(),sku,nameAr,nameEn:String(input.nameEn??existing?.nameEn??'').trim().slice(0,100)||undefined,category:String(input.category??existing?.category??'equipment').trim().slice(0,40)||'equipment',quantity,dailyRateMinor:rate,currency:'SAR',enabled:input.enabled===undefined?(existing?.enabled??true):Boolean(input.enabled),updatedAt:new Date().toISOString()};
    const next=existing?items.map(x=>x.id===item.id?item:x):[...items,item];await this.write(INVENTORY_KEY,next);await this.audit.record({action:existing?'INVENTORY_ITEM_UPDATED':'INVENTORY_ITEM_CREATED',resource:'InventoryItem',resourceId:item.id,metadata:{accountId,sku:item.sku,quantity:item.quantity,dailyRateMinor:item.dailyRateMinor}});return item;
  }
  async reserve(accountId:string,input:{itemId:string;quantity:number;startsAt:string;endsAt:string}){
    const quantity=Number(input.quantity);const startsAt=new Date(input.startsAt),endsAt=new Date(input.endsAt);if(!Number.isInteger(quantity)||quantity<1||!Number.isFinite(startsAt.getTime())||!Number.isFinite(endsAt.getTime())||endsAt<=startsAt)throw new BadRequestException('Invalid rental window or quantity.');
    const items=await this.read<Item>(INVENTORY_KEY),item=items.find(x=>x.id===input.itemId&&x.enabled);if(!item)throw new NotFoundException('Rental item not found.');
    const rentals=await this.read<Rental>(RENTALS_KEY);const overlapping=rentals.filter(x=>x.itemId===item.id&&x.status==='RESERVED'&&new Date(x.startsAt)<endsAt&&new Date(x.endsAt)>startsAt).reduce((sum,x)=>sum+x.quantity,0);if(overlapping+quantity>item.quantity)throw new ConflictException('Requested rental quantity is not available for this window.');
    const now=new Date().toISOString(),rental:Rental={id:randomUUID(),accountId,itemId:item.id,quantity,startsAt:startsAt.toISOString(),endsAt:endsAt.toISOString(),status:'RESERVED',createdAt:now,updatedAt:now};await this.write(RENTALS_KEY,[...rentals,rental]);await this.audit.record({action:'RENTAL_RESERVED',resource:'Rental',resourceId:rental.id,metadata:{accountId,itemId:item.id,quantity,startsAt:rental.startsAt,endsAt:rental.endsAt,financialActionExecuted:false}});return{...rental,item:{id:item.id,sku:item.sku,nameAr:item.nameAr,dailyRateMinor:item.dailyRateMinor,currency:item.currency},paymentStatus:'NOT_STARTED'};
  }
  async mine(accountId:string){return (await this.read<Rental>(RENTALS_KEY)).filter(x=>x.accountId===accountId).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))}
  async cancel(accountId:string,id:string){const rentals=await this.read<Rental>(RENTALS_KEY),index=rentals.findIndex(x=>x.id===id&&x.accountId===accountId);if(index<0)throw new NotFoundException('Rental not found.');if(rentals[index].status!=='RESERVED')throw new ConflictException('Only reserved rentals can be cancelled.');rentals[index]={...rentals[index],status:'CANCELLED',updatedAt:new Date().toISOString()};await this.write(RENTALS_KEY,rentals);await this.audit.record({action:'RENTAL_CANCELLED',resource:'Rental',resourceId:id,metadata:{accountId,financialActionExecuted:false}});return rentals[index]}
}
