import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { EquipmentRentalService } from './equipment-rental.service';

type RentalIndexRow={id:string;status:string;paymentStatus:string;invoiceNumber:string;renterAccountId:string;dueAt:Date|null;returnIntentAt:Date|null;extensionStatus:string|null;extensionRequestedUntil:Date|null;reservedAt:Date;totalHalala:bigint};
type HandoverItem={id:string;resourceId:string;assetCodeSnapshot:string;equipmentNameSnapshot:string;handedOverAt:Date|null;returnedAt:Date|null};

@Injectable()
export class EquipmentRentalAdminService{
  constructor(private readonly db:DatabaseService,private readonly rentals:EquipmentRentalService,private readonly audit:AuditService){}

  async list(){
    const rows=await this.db.$queryRaw<RentalIndexRow[]>`SELECT "id","status","paymentStatus","invoiceNumber","renterAccountId","dueAt","returnIntentAt","extensionStatus","extensionRequestedUntil","reservedAt","totalHalala" FROM "EquipmentRental" WHERE "status" IN ('RESERVED','ACTIVE') OR "extensionStatus"='PENDING' ORDER BY CASE WHEN "extensionStatus"='PENDING' THEN 0 WHEN "returnIntentAt" IS NOT NULL THEN 1 WHEN "dueAt"<NOW() THEN 2 ELSE 3 END,"dueAt" ASC NULLS LAST,"reservedAt" DESC LIMIT 200`;
    const result=[];
    for(const row of rows){const rental=await this.rentals.get(row.id);result.push(rental);}
    return result;
  }

  async handoverScan(actorAccountId:string,id:string,input:{code?:string}){
    const code=input.code?.trim();if(!code)throw new BadRequestException('Barcode or QR code is required for handover.');
    const rentals=await this.db.$queryRaw<Array<{id:string;invoiceNumber:string;renterAccountId:string;status:string;paymentStatus:string}>>`SELECT "id","invoiceNumber","renterAccountId","status","paymentStatus" FROM "EquipmentRental" WHERE "id"=${id} LIMIT 1`;const rental=rentals[0];if(!rental)throw new NotFoundException('Rental not found.');if(rental.paymentStatus!=='PAID')throw new ConflictException('Rental must be paid before equipment handover.');if(!['RESERVED','ACTIVE'].includes(rental.status))throw new ConflictException('Rental is not open for equipment handover.');
    const equipment=await this.db.$queryRaw<Array<{resourceId:string;assetCode:string;stockStatus:string}>>`SELECT "resourceId","assetCode","stockStatus" FROM "EquipmentBarcode" WHERE "barcodeValue"=${code} OR "qrValue"=${code} OR "assetCode"=${code} OR "serialNumber"=${code} LIMIT 1`;const asset=equipment[0];if(!asset)throw new NotFoundException('Equipment code not found.');
    const items=await this.db.$queryRaw<HandoverItem[]>`SELECT "id","resourceId","assetCodeSnapshot","equipmentNameSnapshot","handedOverAt","returnedAt" FROM "EquipmentRentalItem" WHERE "rentalId"=${id} ORDER BY "createdAt"`;const item=items.find(row=>row.resourceId===asset.resourceId);if(!item)throw new ConflictException(`${asset.assetCode} does not belong to this rental invoice.`);if(item.returnedAt)throw new ConflictException('Returned equipment cannot be handed over again.');
    if(!item.handedOverAt){await this.db.$executeRaw`UPDATE "EquipmentRentalItem" SET "handedOverAt"=NOW() WHERE "id"=${item.id} AND "handedOverAt" IS NULL`;await this.audit.record({actorId:actorAccountId,action:'EQUIPMENT_RENTAL_ITEM_HANDED_OVER',resource:'EquipmentRental',resourceId:id,metadata:{invoiceNumber:rental.invoiceNumber,resourceId:item.resourceId,assetCode:item.assetCodeSnapshot,renterAccountId:rental.renterAccountId}});}
    const refreshed=await this.db.$queryRaw<HandoverItem[]>`SELECT "id","resourceId","assetCodeSnapshot","equipmentNameSnapshot","handedOverAt","returnedAt" FROM "EquipmentRentalItem" WHERE "rentalId"=${id} ORDER BY "createdAt"`;const handedOverCount=refreshed.filter(row=>row.handedOverAt).length;
    return{status:item.handedOverAt?'ALREADY_SCANNED':'HANDED_OVER',rentalId:id,invoiceNumber:rental.invoiceNumber,assetCode:item.assetCodeSnapshot,equipmentName:item.equipmentNameSnapshot,expectedCount:refreshed.length,handedOverCount,pendingHandoverCount:refreshed.length-handedOverCount,complete:handedOverCount===refreshed.length,items:refreshed};
  }
}
