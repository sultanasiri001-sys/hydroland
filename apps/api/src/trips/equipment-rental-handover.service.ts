import { assertNoRentalClaim, rentalStatus } from './equipment-rental-hold';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EquipmentInspectionService } from './equipment-inspection.service';

type Rental={id:string;holdExpiresAt:Date|null;renterAccountId:string;status:string;paymentStatus:string;invoiceNumber:string;paidAt:Date|null;totalHalala?:bigint;dueAt?:Date|null};
type Item={id:string;resourceId:string;assetCodeSnapshot:string;equipmentNameSnapshot:string;handedOverAt:Date|null;returnedAt:Date|null};

@Injectable()
export class EquipmentRentalHandoverService{
  constructor(private readonly db:DatabaseService,private readonly audit:AuditService,private readonly notifications:NotificationsService,private readonly inspections:EquipmentInspectionService){}

  async confirmPayment(actorAccountId: string, id: string) {
    const result = await this.db.serializable(async tx => {
      const [rental] = await tx.$queryRaw<Rental[]>`
        SELECT "id", "renterAccountId", "status", "paymentStatus", "invoiceNumber", "paidAt", "holdExpiresAt", "totalHalala", "dueAt"
        FROM "EquipmentRental" WHERE "id"=${id} FOR UPDATE`;
      if (!rental) throw new NotFoundException('Rental not found.');
      if (rental.status === 'CANCELLED') throw new ConflictException('Cancelled rental cannot be paid.');
      if (rental.paymentStatus === 'PAID') return 'ALREADY_PAID';
      if (rental.status !== 'RESERVED' || rental.paymentStatus !== 'PENDING') {
        throw new ConflictException('Rental is not awaiting payment confirmation.');
      }

      const items = await tx.$queryRaw<Item[]>`
        SELECT "id","resourceId","assetCodeSnapshot" FROM "EquipmentRentalItem"
        WHERE "rentalId"=${id} ORDER BY "resourceId"`;
      const resourceIds = items.map(item => item.resourceId);
      if (!items.length || new Set(resourceIds).size !== items.length) {
        throw new ConflictException('Rental must contain distinct serialized equipment.');
      }
      const assets = await tx.$queryRaw<Array<{resourceId:string;stockStatus:string}>>`
        SELECT "resourceId","stockStatus" FROM "EquipmentBarcode"
        WHERE "resourceId"=ANY(${resourceIds}::text[]) ORDER BY "resourceId" FOR UPDATE`;
      if (assets.length !== items.length || assets.some(asset => asset.stockStatus !== 'AVAILABLE')) {
        throw new ConflictException('Rental equipment is no longer available.');
      }
      await assertNoRentalClaim(tx, resourceIds, id);
      const readiness = await this.inspections.evaluate(resourceIds, tx);
      if (readiness.blocked) throw new ConflictException('Equipment inspection or service policy blocks rental payment confirmation.');

      const updated = await tx.$executeRaw`UPDATE "EquipmentRental"
        SET "paymentStatus"='PAID',"paidAt"=NOW(),"updatedAt"=NOW() WHERE "id"=${id}
        AND ("holdExpiresAt" IS NULL OR "holdExpiresAt" > clock_timestamp())`;
      if (!updated) throw new ConflictException('انتهت مهلة الدفع. أنشئ حجزًا جديدًا.');
      await this.notifications.notify(rental.renterAccountId,'EQUIPMENT_RENTAL_INVOICE',{title:'تم تأكيد دفع تأجير المعدات',invoiceNumber:rental.invoiceNumber,rentalId:id,totalHalala:Number(rental.totalHalala||0),dueAt:rental.dueAt?.toISOString()||null,message:'تم تأكيد الدفع. المعدات محجوزة وجاهزة للتسليم من المستودع بعد مسح كل قطعة.'},tx);
      await this.audit.record({actorId:actorAccountId,action:'EQUIPMENT_RENTAL_PAYMENT_CONFIRMED',resource:'EquipmentRental',resourceId:id,metadata:{invoiceNumber:rental.invoiceNumber,renterAccountId:rental.renterAccountId,totalHalala:Number(rental.totalHalala||0),handoverRequired:true,inspectionStates:readiness.states}},tx);
      return 'PAYMENT_CONFIRMED';
    });
    return this.summary(id,result);
  }

  async scan(actorAccountId: string, id: string, input: {code?: string}) {
    const code = input.code?.trim();
    if (!code) throw new BadRequestException('Barcode or QR code is required for handover.');
    const outcome = await this.db.serializable(async tx => {
      // Serialize all scans for a rental, including replay and its final completion notice.
      const [rental] = await tx.$queryRaw<Rental[]>`
        SELECT "id","renterAccountId","status","paymentStatus","invoiceNumber","paidAt"
        FROM "EquipmentRental" WHERE "id"=${id} FOR UPDATE`;
      if (!rental) throw new NotFoundException('Rental not found.');
      if (rental.paymentStatus !== 'PAID') throw new ConflictException('Rental must be paid before equipment handover.');
      if (!['RESERVED','ACTIVE'].includes(rental.status)) throw new ConflictException('Rental is not open for equipment handover.');

      const [asset] = await tx.$queryRaw<Array<{resourceId:string;stockStatus:string;location:string|null}>>`
        SELECT "resourceId","stockStatus","location" FROM "EquipmentBarcode"
        WHERE "barcodeValue"=${code} OR "qrValue"=${code} OR "assetCode"=${code} OR "serialNumber"=${code}
        LIMIT 1 FOR UPDATE`;
      if (!asset) throw new NotFoundException('Equipment code not found.');
      const [item] = await tx.$queryRaw<Item[]>`
        SELECT "id","resourceId","assetCodeSnapshot","equipmentNameSnapshot","handedOverAt","returnedAt"
        FROM "EquipmentRentalItem" WHERE "rentalId"=${id} AND "resourceId"=${asset.resourceId} FOR UPDATE`;
      if (!item) throw new ConflictException('Scanned equipment does not belong to this rental.');
      if (item.handedOverAt) return {result:'ALREADY_HANDED_OVER',resourceId:item.resourceId};
      if (asset.stockStatus !== 'AVAILABLE') throw new ConflictException(`${item.assetCodeSnapshot} is not available for handover.`);
      const readiness = await this.inspections.evaluate([item.resourceId], tx);
      if (readiness.blocked) throw new ConflictException('Equipment inspection or service policy blocks rental handover.');

      await tx.$executeRaw`UPDATE "EquipmentRentalItem" SET "handedOverAt"=NOW() WHERE "id"=${item.id}`;
      await tx.$executeRaw`
        INSERT INTO "EquipmentMovement"("id","resourceId","movementType","fromLocation","toLocation","tripId","assignedAccountId","notes","actorAccountId","occurredAt")
        VALUES(gen_random_uuid()::text,${item.resourceId},'CHECK_OUT',${asset.location},NULL,NULL,${rental.renterAccountId},${`Rental handover ${rental.invoiceNumber}`},${actorAccountId},NOW())`;
      await tx.$executeRaw`UPDATE "EquipmentBarcode" SET "stockStatus"='CHECKED_OUT',"updatedAt"=NOW() WHERE "resourceId"=${item.resourceId}`;
      const [counts] = await tx.$queryRaw<Array<{itemCount:number;handedOverCount:number}>>`
        SELECT COUNT(*)::int AS "itemCount",COUNT("handedOverAt")::int AS "handedOverCount"
        FROM "EquipmentRentalItem" WHERE "rentalId"=${id}`;
      const pendingHandoverCount = counts.itemCount - counts.handedOverCount;
      if (pendingHandoverCount === 0) {
        await tx.$executeRaw`UPDATE "EquipmentRental" SET "status"='ACTIVE',"updatedAt"=NOW() WHERE "id"=${id}`;
      }
      await this.audit.record({actorId:actorAccountId,action:'EQUIPMENT_RENTAL_ITEM_HANDED_OVER',resource:'EquipmentRental',resourceId:id,metadata:{invoiceNumber:rental.invoiceNumber,resourceId:item.resourceId,assetCode:item.assetCodeSnapshot,handedOverCount:counts.handedOverCount,pendingHandoverCount,inspectionStates:readiness.states}},tx);
      if (pendingHandoverCount === 0) {
        await this.notifications.notify(rental.renterAccountId,'EQUIPMENT_RENTAL_HANDED_OVER',{title:'تم استلام معدات التأجير',invoiceNumber:rental.invoiceNumber,rentalId:id,message:'تم تسليم جميع معدات التأجير لك وتفعيل الإيجار.'},tx);
      }
      return {result:'HANDED_OVER',resourceId:item.resourceId};
    });
    return this.summary(id,outcome.result,outcome.resourceId);
  }

  async summary(id:string,result='SUMMARY',resourceId?:string){const rentals=await this.db.$queryRaw<Rental[]>`SELECT "id","renterAccountId","status","paymentStatus","invoiceNumber","paidAt","holdExpiresAt" FROM "EquipmentRental" WHERE "id"=${id} LIMIT 1`;if(!rentals[0])throw new NotFoundException('Rental not found.');const items=await this.db.$queryRaw<Item[]>`SELECT "id","resourceId","assetCodeSnapshot","equipmentNameSnapshot","handedOverAt","returnedAt" FROM "EquipmentRentalItem" WHERE "rentalId"=${id} ORDER BY "createdAt"`;const handedOverCount=items.filter((item:Item)=>item.handedOverAt).length;return{result,resourceId:resourceId||null,rentalId:id,invoiceNumber:rentals[0].invoiceNumber,status:rentalStatus(rentals[0]),holdExpiresAt:rentals[0].holdExpiresAt,paymentStatus:rentals[0].paymentStatus,itemCount:items.length,handedOverCount,pendingHandoverCount:items.length-handedOverCount,items};}
}
