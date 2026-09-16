import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';
import { assertEquipmentAllocatable } from '../inventory/inventory-policy';
import { EquipmentInspectionService } from './equipment-inspection.service';

type Rental={id:string;renterAccountId:string;status:string;paymentStatus:string;invoiceNumber:string;paidAt:Date|null;totalHalala?:bigint;dueAt?:Date|null};
type Item={id:string;resourceId:string;assetCodeSnapshot:string;equipmentNameSnapshot:string;handedOverAt:Date|null;returnedAt:Date|null};

@Injectable()
export class EquipmentRentalHandoverService{
  constructor(private readonly db:DatabaseService,private readonly audit:AuditService,private readonly notifications:NotificationsService,private readonly inspections:EquipmentInspectionService){}

  private async assertHandoverReady(resourceId:string,stockStatus:string){
    const resources=await this.db.$queryRaw<Array<{active:boolean}>>`SELECT "active" FROM "CalendarResource" WHERE "id"=${resourceId} AND "type"='EQUIPMENT' LIMIT 1`;
    const inspection=await this.inspections.evaluate([resourceId]);const latest=inspection.latest.find(row=>row.resourceId===resourceId);
    try{assertEquipmentAllocatable({active:Boolean(resources[0]?.active),stockStatus,reserved:false,inspectionStatus:latest?.status??null,serviceExpiresAt:latest?.serviceExpiresAt??null,complianceBlocked:inspection.blocked});}catch(error){throw new ConflictException(error instanceof Error?error.message:'Equipment is not operationally allocatable.');}
  }

  async confirmPayment(actorAccountId:string,id:string){
    const rentals=await this.db.$queryRaw<Rental[]>`SELECT "id","renterAccountId","status","paymentStatus","invoiceNumber","paidAt","totalHalala","dueAt" FROM "EquipmentRental" WHERE "id"=${id} LIMIT 1`;const rental=rentals[0];
    if(!rental)throw new NotFoundException('Rental not found.');if(rental.status==='CANCELLED')throw new ConflictException('Cancelled rental cannot be paid.');if(rental.paymentStatus==='PAID')return this.summary(id,'ALREADY_PAID');
    const items=await this.db.$queryRaw<Item[]>`SELECT "id","resourceId","assetCodeSnapshot","equipmentNameSnapshot","handedOverAt","returnedAt" FROM "EquipmentRentalItem" WHERE "rentalId"=${id} ORDER BY "createdAt"`;
    for(const item of items){const rows=await this.db.$queryRaw<Array<{stockStatus:string}>>`SELECT "stockStatus" FROM "EquipmentBarcode" WHERE "resourceId"=${item.resourceId} LIMIT 1`;if(rows[0]?.stockStatus!=='AVAILABLE')throw new ConflictException(`${item.assetCodeSnapshot} is no longer available.`);await this.assertHandoverReady(item.resourceId,rows[0].stockStatus);}
    await this.db.$executeRaw`UPDATE "EquipmentRental" SET "paymentStatus"='PAID',"paidAt"=NOW(),"updatedAt"=NOW() WHERE "id"=${id} AND "paymentStatus"='PENDING'`;
    await this.notifications.notify(rental.renterAccountId,'EQUIPMENT_RENTAL_INVOICE',{title:'تم تأكيد دفع تأجير المعدات',invoiceNumber:rental.invoiceNumber,rentalId:id,totalHalala:Number(rental.totalHalala||0),dueAt:rental.dueAt?.toISOString()||null,message:'تم تأكيد الدفع. المعدات محجوزة وجاهزة للتسليم من المستودع بعد مسح كل قطعة.'});
    await this.audit.record({actorId:actorAccountId,action:'EQUIPMENT_RENTAL_PAYMENT_CONFIRMED',resource:'EquipmentRental',resourceId:id,metadata:{invoiceNumber:rental.invoiceNumber,renterAccountId:rental.renterAccountId,totalHalala:Number(rental.totalHalala||0),handoverRequired:true}});
    return this.summary(id,'PAYMENT_CONFIRMED');
  }

  async scan(actorAccountId:string,id:string,input:{code?:string}){
    const code=input.code?.trim();if(!code)throw new BadRequestException('Barcode or QR code is required for handover.');
    const rentals=await this.db.$queryRaw<Rental[]>`SELECT "id","renterAccountId","status","paymentStatus","invoiceNumber","paidAt" FROM "EquipmentRental" WHERE "id"=${id} LIMIT 1`;
    const rental=rentals[0];if(!rental)throw new NotFoundException('Rental not found.');if(rental.paymentStatus!=='PAID')throw new ConflictException('Rental must be paid before equipment handover.');if(!['RESERVED','ACTIVE'].includes(rental.status))throw new ConflictException('Rental is not open for equipment handover.');
    const equipment=await this.db.$queryRaw<Array<{resourceId:string;assetCode:string;stockStatus:string;location:string|null}>>`SELECT "resourceId","assetCode","stockStatus","location" FROM "EquipmentBarcode" WHERE "barcodeValue"=${code} OR "qrValue"=${code} OR "assetCode"=${code} OR "serialNumber"=${code} LIMIT 1`;
    const asset=equipment[0];if(!asset)throw new NotFoundException('Equipment code not found.');
    const items=await this.db.$queryRaw<Item[]>`SELECT "id","resourceId","assetCodeSnapshot","equipmentNameSnapshot","handedOverAt","returnedAt" FROM "EquipmentRentalItem" WHERE "rentalId"=${id} ORDER BY "createdAt"`;
    const item=items.find((row:Item)=>row.resourceId===asset.resourceId);if(!item)throw new ConflictException('Scanned equipment does not belong to this rental.');if(item.handedOverAt)return this.summary(id,'ALREADY_HANDED_OVER',item.resourceId);
    await this.assertHandoverReady(item.resourceId,asset.stockStatus);
    await this.db.serializable(async tx=>{const locked=await tx.$queryRaw<Array<{stockStatus:string;location:string|null}>>`SELECT "stockStatus","location" FROM "EquipmentBarcode" WHERE "resourceId"=${item.resourceId} FOR UPDATE`;if(locked[0]?.stockStatus!=='AVAILABLE')throw new ConflictException(`${item.assetCodeSnapshot} is not available for handover.`);await tx.$executeRaw`UPDATE "EquipmentRentalItem" SET "handedOverAt"=NOW() WHERE "id"=${item.id} AND "handedOverAt" IS NULL`;await tx.$executeRaw`INSERT INTO "EquipmentMovement"("id","resourceId","movementType","fromLocation","toLocation","tripId","assignedAccountId","notes","actorAccountId","occurredAt") VALUES(gen_random_uuid()::text,${item.resourceId},'CHECK_OUT',${locked[0].location},NULL,NULL,${rental.renterAccountId},${`Rental handover ${rental.invoiceNumber}`},${actorAccountId},NOW())`;await tx.$executeRaw`UPDATE "EquipmentBarcode" SET "stockStatus"='CHECKED_OUT',"updatedAt"=NOW() WHERE "resourceId"=${item.resourceId}`;const pending=await tx.$queryRaw<Array<{count:bigint}>>`SELECT COUNT(*)::bigint AS "count" FROM "EquipmentRentalItem" WHERE "rentalId"=${id} AND "handedOverAt" IS NULL`;if(Number(pending[0]?.count||0)===0)await tx.$executeRaw`UPDATE "EquipmentRental" SET "status"='ACTIVE',"updatedAt"=NOW() WHERE "id"=${id}`;});
    const result=await this.summary(id,'HANDED_OVER',item.resourceId);await this.audit.record({actorId:actorAccountId,action:'EQUIPMENT_RENTAL_ITEM_HANDED_OVER',resource:'EquipmentRental',resourceId:id,metadata:{invoiceNumber:rental.invoiceNumber,resourceId:item.resourceId,assetCode:item.assetCodeSnapshot,handedOverCount:result.handedOverCount,pendingHandoverCount:result.pendingHandoverCount}});if(result.pendingHandoverCount===0)await this.notifications.notify(rental.renterAccountId,'EQUIPMENT_RENTAL_HANDED_OVER',{title:'تم استلام معدات التأجير',invoiceNumber:rental.invoiceNumber,rentalId:id,message:'تم تسليم جميع معدات التأجير لك وتفعيل الإيجار.'});return result;
  }

  async summary(id:string,result='SUMMARY',resourceId?:string){const rentals=await this.db.$queryRaw<Rental[]>`SELECT "id","renterAccountId","status","paymentStatus","invoiceNumber","paidAt" FROM "EquipmentRental" WHERE "id"=${id} LIMIT 1`;if(!rentals[0])throw new NotFoundException('Rental not found.');const items=await this.db.$queryRaw<Item[]>`SELECT "id","resourceId","assetCodeSnapshot","equipmentNameSnapshot","handedOverAt","returnedAt" FROM "EquipmentRentalItem" WHERE "rentalId"=${id} ORDER BY "createdAt"`;const handedOverCount=items.filter((item:Item)=>item.handedOverAt).length;return{result,resourceId:resourceId||null,rentalId:id,invoiceNumber:rentals[0].invoiceNumber,status:rentals[0].status,paymentStatus:rentals[0].paymentStatus,itemCount:items.length,handedOverCount,pendingHandoverCount:items.length-handedOverCount,items};}
}
