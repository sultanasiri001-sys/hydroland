import { assertRentalFitsCalendar } from './equipment-rental-calendar';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { assertNoRentalClaim, rentalStatus, RENTAL_HOLD_MINUTES } from './equipment-rental-hold';
import { randomBytes } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';

type RentalItemInput={resourceId?:string;equipmentType?:string|null;size?:string|null;unitPriceSar?:number};
type RentalRow={id:string;holdExpiresAt:Date|null;renterAccountId:string;status:string;paymentStatus:string;totalHalala:bigint;invoiceNumber:string;whatsappPhone:string|null;reservedAt:Date;paidAt:Date|null;returnedAt:Date|null;dueAt:Date|null;overdueNotifiedAt:Date|null;extensionRequestedUntil:Date|null;extensionStatus:'PENDING'|'APPROVED'|'REJECTED'|null;extensionRequestedAt:Date|null;extensionReviewedAt:Date|null;extensionReviewedByAccountId:string|null;returnIntentAt:Date|null;createdByAccountId:string;createdAt:Date;updatedAt:Date};
type RentalItemRow={id:string;rentalId:string;resourceId:string;equipmentType:string|null;size:string|null;unitPriceHalala:bigint;assetCodeSnapshot:string;equipmentNameSnapshot:string;serialNumberSnapshot:string|null;returnedAt:Date|null;returnCondition:'OK'|'DAMAGED'|'REVIEW'|null;returnNotes:string|null};

@Injectable()
export class EquipmentRentalService{
  constructor(private readonly db:DatabaseService,private readonly audit:AuditService,private readonly notifications:NotificationsService){}
  private toHalala(value?:number){if(value===undefined||!Number.isFinite(value)||value<0)throw new BadRequestException('Rental price must be zero or greater.');return BigInt(Math.round(value*100));}
  private invoiceNumber(){return `HYD-RNT-${Date.now().toString(36).toUpperCase()}-${randomBytes(8).toString('hex').toUpperCase()}`;}
  private parseDate(value?:string|null,label='Date'){if(!value)return null;const date=new Date(value);if(Number.isNaN(date.getTime()))throw new BadRequestException(`${label} is invalid.`);return date;}
  private serialize(rental:RentalRow,items:RentalItemRow[]){const returnedCount=items.filter(item=>item.returnedAt).length,now=Date.now(),overdue=Boolean(rental.status==='ACTIVE'&&rental.dueAt&&rental.dueAt.getTime()<now);return{...rental,status:rentalStatus(rental),totalHalala:Number(rental.totalHalala),returnedCount,pendingReturnCount:items.length-returnedCount,overdue,items:items.map(item=>({...item,unitPriceHalala:Number(item.unitPriceHalala)}))};}

  async create(actorAccountId:string,input:{renterAccountId?:string;whatsappPhone?:string|null;dueAt?:string|null;items?:RentalItemInput[]}){
    const renterAccountId=input.renterAccountId?.trim();if(!renterAccountId)throw new BadRequestException('Renter account is required.');
    const dueAt=this.parseDate(input.dueAt,'Rental due date');if(!dueAt||dueAt.getTime()<=Date.now())throw new BadRequestException('Rental due date must be in the future.');
    const renter=await this.db.account.findUnique({where:{id:renterAccountId},select:{id:true,status:true}});if(!renter||renter.status!=='ACTIVE')throw new BadRequestException('Renter account is missing or inactive.');
    const items=input.items||[];if(!items.length)throw new BadRequestException('At least one rental equipment item is required.');
    const requested = items.map(item => ({
      resourceId: item.resourceId?.trim() || '', equipmentType: item.equipmentType?.trim() || null,
      size: item.size?.trim() || null, unitPriceHalala: this.toHalala(item.unitPriceSar)
    }));
    const resourceIds = requested.map(item => item.resourceId);
    if (resourceIds.includes('')) throw new BadRequestException('Equipment resource is required.');
    if (new Set(resourceIds).size !== resourceIds.length) {
      throw new BadRequestException('A serialized equipment item can appear only once per rental.');
    }
    const totalHalala = requested.reduce((sum, item) => sum + Number(item.unitPriceHalala), 0);
    const invoiceNumber = this.invoiceNumber(), whatsappPhone = input.whatsappPhone?.trim() || null;
    const result = await this.db.serializable(async tx => {
      const assets = await tx.$queryRaw<Array<{resourceId:string; assetCode:string; name:string; serialNumber:string|null; stockStatus:string}>>`
        SELECT b."resourceId", b."assetCode", b."serialNumber", b."stockStatus", r."name"
        FROM "EquipmentBarcode" b JOIN "CalendarResource" r ON r."id" = b."resourceId"
        WHERE b."resourceId" = ANY(${resourceIds}::text[]) ORDER BY b."resourceId" FOR UPDATE OF b`;
      if (assets.length !== requested.length) throw new NotFoundException('Rental equipment not found.');
      if (assets.some(asset => asset.stockStatus !== 'AVAILABLE')) throw new ConflictException('المعدّة غير متاحة للتأجير.');
      await assertNoRentalClaim(tx, resourceIds);
      await assertRentalFitsCalendar(tx, resourceIds, dueAt);
      const assetsById = new Map(assets.map(asset => [asset.resourceId, asset]));
      const [rental] = await tx.$queryRaw<RentalRow[]>`
        INSERT INTO "EquipmentRental" ("id","renterAccountId","status","paymentStatus","totalHalala","invoiceNumber",
          "whatsappPhone","reservedAt","holdExpiresAt","dueAt","createdByAccountId","createdAt","updatedAt")
        VALUES (gen_random_uuid()::text,${renterAccountId},'RESERVED','PENDING',${BigInt(totalHalala)},${invoiceNumber},
          ${whatsappPhone},statement_timestamp() AT TIME ZONE 'UTC',
          statement_timestamp() + ${RENTAL_HOLD_MINUTES}::int * INTERVAL '1 minute',(${dueAt}::timestamptz AT TIME ZONE 'UTC'),${actorAccountId},NOW(),NOW())
        RETURNING *`;
      const created: RentalItemRow[] = [];
      for (const item of requested) {
        const asset = assetsById.get(item.resourceId)!;
        const [row] = await tx.$queryRaw<RentalItemRow[]>`
          INSERT INTO "EquipmentRentalItem" ("id","rentalId","resourceId","equipmentType","size","unitPriceHalala",
            "assetCodeSnapshot","equipmentNameSnapshot","serialNumberSnapshot","createdAt")
          VALUES (gen_random_uuid()::text,${rental.id},${item.resourceId},${item.equipmentType},${item.size},
            ${item.unitPriceHalala},${asset.assetCode},${asset.name},${asset.serialNumber},NOW())
          RETURNING *`;
        created.push(row);
      }
      await this.audit.record({
        actorId: actorAccountId, action: 'EQUIPMENT_RENTAL_RESERVED', resource: 'EquipmentRental',
        resourceId: rental.id, metadata: {renterAccountId, invoiceNumber, totalHalala, itemCount: created.length, dueAt: dueAt.toISOString(), holdExpiresAt: rental.holdExpiresAt?.toISOString()}
      }, tx);
      return {rental, items: created};
    });
    return this.serialize(result.rental, result.items);
  }

  async cancelUnpaid(accountId: string, id: string) {
    await this.db.serializable(async tx => {
      const [rental] = await tx.$queryRaw<RentalRow[]>`
        SELECT * FROM "EquipmentRental" WHERE "id"=${id} AND "renterAccountId"=${accountId} FOR UPDATE`;
      if (!rental) throw new NotFoundException('Rental not found.');
      if (rental.status === 'CANCELLED' && rental.paymentStatus === 'PENDING') return;
      if (rentalStatus(rental) !== 'RESERVED' || rental.paymentStatus !== 'PENDING') {
        throw new ConflictException('لا يمكن إلغاء هذا الحجز قبل الدفع.');
      }
      await tx.$executeRaw`UPDATE "EquipmentRental" SET "status"='CANCELLED',"updatedAt"=NOW() WHERE "id"=${id}`;
      await this.audit.record({actorId: accountId, action: 'EQUIPMENT_RENTAL_CANCELLED',
        resource: 'EquipmentRental', resourceId: id, metadata: {invoiceNumber: rental.invoiceNumber}}, tx);
    });
    return this.getMine(accountId, id);
  }

  async get(id:string){const rentals=await this.db.$queryRaw<RentalRow[]>`SELECT * FROM "EquipmentRental" WHERE "id"=${id} LIMIT 1`;if(!rentals[0])throw new NotFoundException('Rental not found.');const items=await this.db.$queryRaw<RentalItemRow[]>`SELECT * FROM "EquipmentRentalItem" WHERE "rentalId"=${id} ORDER BY "createdAt"`;return this.serialize(rentals[0],items);}
  async getMine(accountId:string,id:string){const rental=await this.get(id);if(rental.renterAccountId!==accountId)throw new NotFoundException('Rental not found.');return rental;}

  async mine(accountId:string){
    const rows=await this.db.$queryRaw<RentalRow[]>`SELECT * FROM "EquipmentRental" WHERE "renterAccountId"=${accountId} ORDER BY "createdAt" DESC LIMIT 100`;
    for(const rental of rows){
      if(rental.status==='ACTIVE'&&rental.dueAt&&rental.dueAt.getTime()<Date.now()&&!rental.overdueNotifiedAt){
        const updated=await this.db.$executeRaw`UPDATE "EquipmentRental" SET "overdueNotifiedAt"=NOW(),"updatedAt"=NOW() WHERE "id"=${rental.id} AND "overdueNotifiedAt" IS NULL`;
        if(updated){rental.overdueNotifiedAt=new Date();await this.notifications.notify(accountId,'EQUIPMENT_RENTAL_OVERDUE',{title:'تأخر إرجاع معدات التأجير',invoiceNumber:rental.invoiceNumber,rentalId:rental.id,dueAt:rental.dueAt.toISOString(),actions:['REQUEST_EXTENSION','RETURN_EQUIPMENT'],message:'انتهت مدة الإيجار. يمكنك طلب تمديد الإيجار أو إعادة المعدات للمستودع.'});await this.audit.record({actorId:accountId,action:'EQUIPMENT_RENTAL_OVERDUE_NOTIFIED',resource:'EquipmentRental',resourceId:rental.id,metadata:{invoiceNumber:rental.invoiceNumber,dueAt:rental.dueAt.toISOString()}});}
      }
    }
    return Promise.all(rows.map((row:RentalRow)=>this.get(row.id)));
  }

  async requestExtension(accountId:string,id:string,input:{requestedUntil?:string}){
    await this.db.serializable(async tx => {
      const [rental] = await tx.$queryRaw<RentalRow[]>`
        SELECT * FROM "EquipmentRental" WHERE "id"=${id} AND "renterAccountId"=${accountId} FOR UPDATE`;
      if (!rental) throw new NotFoundException('Rental not found.');
      if (rental.status !== 'ACTIVE') throw new ConflictException('Only active rentals can be extended.');
      const requestedUntil = this.parseDate(input.requestedUntil, 'Requested extension date');
      if (!requestedUntil || requestedUntil.getTime() <= Date.now() ||
          rental.dueAt && requestedUntil.getTime() <= rental.dueAt.getTime()) {
        throw new BadRequestException('Extension date must be later than the current due date.');
      }
      if (rental.extensionStatus === 'PENDING' && rental.extensionRequestedUntil?.getTime() === requestedUntil.getTime()) return;
      await tx.$executeRaw`UPDATE "EquipmentRental" SET "extensionRequestedUntil"=(${requestedUntil}::timestamptz AT TIME ZONE 'UTC'),"extensionStatus"='PENDING',"extensionRequestedAt"=NOW(),"extensionReviewedAt"=NULL,"extensionReviewedByAccountId"=NULL,"updatedAt"=NOW() WHERE "id"=${id}`;
      await this.notifications.notify(rental.createdByAccountId,'EQUIPMENT_RENTAL_EXTENSION_REQUEST',{
        title:'طلب تمديد إيجار معدات',invoiceNumber:rental.invoiceNumber,rentalId:id,renterAccountId:accountId,
        currentDueAt:rental.dueAt,requestedUntil:requestedUntil.toISOString(),message:'الغواص طلب تمديد مدة إيجار المعدات.'
      },tx);
      await this.audit.record({actorId:accountId,action:'EQUIPMENT_RENTAL_EXTENSION_REQUESTED',resource:'EquipmentRental',
        resourceId:id,metadata:{invoiceNumber:rental.invoiceNumber,currentDueAt:rental.dueAt,requestedUntil:requestedUntil.toISOString()}},tx);
    });
    return this.getMine(accountId,id);
  }

  async reviewExtension(actorAccountId: string, id: string, input: {decision?: 'APPROVED' | 'REJECTED'}) {
    const decision = input.decision;
    if (!decision || !['APPROVED', 'REJECTED'].includes(decision)) throw new BadRequestException('Extension decision is required.');
    await this.db.serializable(async tx => {
      const [rental] = await tx.$queryRaw<RentalRow[]>`SELECT * FROM "EquipmentRental" WHERE "id"=${id} FOR UPDATE`;
      if (!rental) throw new NotFoundException('Rental not found.');
      if (rental.status !== 'ACTIVE' || rental.extensionStatus !== 'PENDING' || !rental.extensionRequestedUntil) {
        throw new ConflictException('No pending extension request exists on an active rental.');
      }
      if (decision === 'APPROVED') {
        const remaining = await tx.$queryRaw<Array<{resourceId: string}>>`
          SELECT "resourceId" FROM "EquipmentRentalItem" WHERE "rentalId"=${id} AND "returnedAt" IS NULL`;
        await assertRentalFitsCalendar(tx, remaining.map(item => item.resourceId), rental.extensionRequestedUntil);
      }
      await tx.$executeRaw`UPDATE "EquipmentRental" SET "extensionStatus"=${decision},
        "dueAt"=CASE WHEN ${decision}='APPROVED' THEN "extensionRequestedUntil" ELSE "dueAt" END,
        "overdueNotifiedAt"=CASE WHEN ${decision}='APPROVED' THEN NULL ELSE "overdueNotifiedAt" END,
        "extensionReviewedAt"=NOW(),"extensionReviewedByAccountId"=${actorAccountId},"updatedAt"=NOW() WHERE "id"=${id}`;
      const dueAt = decision === 'APPROVED' ? rental.extensionRequestedUntil : rental.dueAt;
      await this.notifications.notify(rental.renterAccountId, 'EQUIPMENT_RENTAL_EXTENSION_REVIEWED', {
        title: decision === 'APPROVED' ? 'تمت الموافقة على تمديد الإيجار' : 'تم رفض طلب تمديد الإيجار',
        invoiceNumber: rental.invoiceNumber, rentalId: id, decision, dueAt,
        message: decision === 'APPROVED' ? 'تم تحديث موعد إرجاع المعدات.' : 'يرجى إعادة المعدات حسب موعد الاستحقاق الحالي.',
      }, tx);
      await this.audit.record({ actorId: actorAccountId, action: `EQUIPMENT_RENTAL_EXTENSION_${decision}`,
        resource: 'EquipmentRental', resourceId: id, metadata: {invoiceNumber: rental.invoiceNumber, renterAccountId: rental.renterAccountId, dueAt} }, tx);
    });
    return this.get(id);
  }

  async returnIntent(accountId:string,id:string){
    await this.db.serializable(async tx => {
      const [rental] = await tx.$queryRaw<RentalRow[]>`
        SELECT * FROM "EquipmentRental" WHERE "id"=${id} AND "renterAccountId"=${accountId} FOR UPDATE`;
      if (!rental) throw new NotFoundException('Rental not found.');
      if (rental.status !== 'ACTIVE') throw new ConflictException('Only active rentals can be returned.');
      if (rental.returnIntentAt) return;
      const [remaining] = await tx.$queryRaw<Array<{pendingReturnCount:number}>>`
        SELECT COUNT(*)::int AS "pendingReturnCount" FROM "EquipmentRentalItem"
        WHERE "rentalId"=${id} AND "returnedAt" IS NULL`;
      await tx.$executeRaw`UPDATE "EquipmentRental" SET "returnIntentAt"=NOW(),"updatedAt"=NOW() WHERE "id"=${id}`;
      await this.notifications.notify(rental.createdByAccountId,'EQUIPMENT_RENTAL_RETURN_INTENT',{
        title:'الغواص سيعيد معدات التأجير',invoiceNumber:rental.invoiceNumber,rentalId:id,renterAccountId:accountId,
        pendingReturnCount:remaining.pendingReturnCount,message:'الغواص اختار إعادة المعدات. أكمل الاستلام في المستودع بمسح الباركود.'
      },tx);
      await this.audit.record({actorId:accountId,action:'EQUIPMENT_RENTAL_RETURN_INTENT',resource:'EquipmentRental',
        resourceId:id,metadata:{invoiceNumber:rental.invoiceNumber,pendingReturnCount:remaining.pendingReturnCount}},tx);
    });
    return{status:'RETURN_INTENT_RECORDED',rentalId:id};
  }

  async returnScan(actorAccountId: string, id: string, input: {code?: string; condition?: 'OK' | 'DAMAGED' | 'REVIEW'; notes?: string | null; toLocation?: string | null}) {
    const code = input.code?.trim();
    if (!code) throw new BadRequestException('Barcode or QR code is required for return.');
    const condition = input.condition || 'OK';
    if (!['OK', 'DAMAGED', 'REVIEW'].includes(condition)) throw new BadRequestException('Invalid return condition.');
    const notes = input.notes?.trim() || null;
    const nextStatus = condition === 'OK' ? 'AVAILABLE' : 'QUARANTINED';

    await this.db.serializable(async tx => {
      const [rental] = await tx.$queryRaw<Array<Pick<RentalRow, 'id' | 'status' | 'invoiceNumber' | 'renterAccountId'>>>`
        SELECT "id", "status", "invoiceNumber", "renterAccountId"
        FROM "EquipmentRental" WHERE "id"=${id} FOR UPDATE`;
      if (!rental) throw new NotFoundException('Rental not found.');
      if (rental.status !== 'ACTIVE' && rental.status !== 'RETURNED') {
        throw new ConflictException('Only active rentals can receive equipment returns.');
      }

      const [asset] = await tx.$queryRaw<Array<{resourceId: string; assetCode: string; stockStatus: string; location: string | null}>>`
        SELECT "resourceId", "assetCode", "stockStatus", "location" FROM "EquipmentBarcode"
        WHERE "barcodeValue"=${code} OR "qrValue"=${code} OR "assetCode"=${code} OR "serialNumber"=${code}
        LIMIT 1 FOR UPDATE`;
      if (!asset) throw new NotFoundException('Equipment code not found.');
      const items = await tx.$queryRaw<Array<Pick<RentalItemRow, 'id' | 'returnedAt' | 'returnCondition'>>>`
        SELECT "id", "returnedAt", "returnCondition" FROM "EquipmentRentalItem"
        WHERE "rentalId"=${id} AND "resourceId"=${asset.resourceId} LIMIT 2 FOR UPDATE`;
      if (items.length > 1) throw new ConflictException('Rental contains multiple lines for this serialized item.');
      const [item] = items;
      if (!item) throw new ConflictException('Scanned equipment does not belong to this rental.');
      if (item.returnedAt) {
        if (item.returnCondition && item.returnCondition !== condition) throw new ConflictException('Item already returned with a different condition.');
        return;
      }
      if (rental.status !== 'ACTIVE' || asset.stockStatus !== 'CHECKED_OUT') {
        throw new ConflictException('Equipment is not currently checked out on an active rental.');
      }

      const toLocation = input.toLocation?.trim() || asset.location;
      await tx.$executeRaw`UPDATE "EquipmentRentalItem" SET "returnedAt"=NOW(), "returnCondition"=${condition}, "returnNotes"=${notes} WHERE "id"=${item.id}`;
      await tx.$executeRaw`
        INSERT INTO "EquipmentMovement" ("id","resourceId","movementType","fromLocation","toLocation","tripId","assignedAccountId","notes","actorAccountId","occurredAt")
        VALUES (gen_random_uuid()::text,${asset.resourceId},${condition === 'OK' ? 'CHECK_IN' : 'QUARANTINE'},${asset.location},${toLocation},NULL,${rental.renterAccountId},${notes || `Rental return ${rental.invoiceNumber}`},${actorAccountId},NOW())`;
      await tx.$executeRaw`UPDATE "EquipmentBarcode" SET "stockStatus"=${nextStatus}, "location"=${toLocation}, "updatedAt"=NOW() WHERE "resourceId"=${asset.resourceId}`;
      await this.audit.record({actorId:actorAccountId, action:'EQUIPMENT_RENTAL_ITEM_RETURNED', resource:'EquipmentRental', resourceId:id,
        metadata:{invoiceNumber:rental.invoiceNumber, resourceId:asset.resourceId, assetCode:asset.assetCode, condition, stockStatus:nextStatus, notes}}, tx);

      const [remaining] = await tx.$queryRaw<Array<{pending: boolean}>>`
        SELECT EXISTS (SELECT 1 FROM "EquipmentRentalItem" WHERE "rentalId"=${id} AND "returnedAt" IS NULL) AS "pending"`;
      if (remaining.pending) return;
      await tx.$executeRaw`UPDATE "EquipmentRental" SET "status"='RETURNED', "returnedAt"=NOW(), "updatedAt"=NOW() WHERE "id"=${id}`;
      await this.notifications.notify(rental.renterAccountId, 'EQUIPMENT_RENTAL_RETURNED', {
        title:'تم استلام معدات التأجير', invoiceNumber:rental.invoiceNumber, rentalId:id, message:'تم استلام جميع معدات التأجير وإغلاق عملية الإيجار.'
      }, tx);
      await this.audit.record({actorId:actorAccountId, action:'EQUIPMENT_RENTAL_RETURNED', resource:'EquipmentRental', resourceId:id,
        metadata:{invoiceNumber:rental.invoiceNumber, renterAccountId:rental.renterAccountId}}, tx);
    });
    return this.get(id);
  }

  async shareInvoice(actorAccountId:string,id:string,input:{accountId?:string;channel?:'IN_APP'|'WHATSAPP'}){const rental=await this.get(id);const accountId=input.accountId?.trim()||rental.renterAccountId,channel=input.channel||'IN_APP';if(channel==='WHATSAPP'){await this.audit.record({actorId:actorAccountId,action:'EQUIPMENT_RENTAL_WHATSAPP_PREPARED',resource:'EquipmentRental',resourceId:id,metadata:{invoiceNumber:rental.invoiceNumber,recipientPhone:rental.whatsappPhone}});return{channel:'WHATSAPP',status:'PROVIDER_NOT_CONNECTED',phone:rental.whatsappPhone,invoice:rental};}await this.notifications.notify(accountId,'EQUIPMENT_RENTAL_INVOICE_SHARED',{title:'فاتورة تأجير معدات',invoiceNumber:rental.invoiceNumber,rentalId:id,totalHalala:rental.totalHalala,items:rental.items});await this.audit.record({actorId:actorAccountId,action:'EQUIPMENT_RENTAL_INVOICE_SHARED',resource:'EquipmentRental',resourceId:id,metadata:{accountId,channel:'IN_APP'}});return{channel:'IN_APP',status:'SENT',accountId};}
}
