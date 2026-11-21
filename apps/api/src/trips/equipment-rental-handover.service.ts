import { assertRentalFitsCalendar } from './equipment-rental-calendar';
import { assertNoRentalClaim, rentalStatus } from './equipment-rental-hold';
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { RentalContractRecord, rentalCanonicalJson, rentalObject, requireAcceptedRentalContract, requireRentalContract } from '../commerce/rental-contract';
import { requirePostedRentalCollection } from '../commerce/rental-collection-ledger';
import { DatabaseService } from '../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EquipmentInspectionService } from './equipment-inspection.service';

type Rental={id:string;holdExpiresAt:Date|null;renterAccountId:string;status:string;paymentStatus:string;invoiceNumber:string;paidAt:Date|null;totalHalala?:bigint;dueAt?:Date|null;reservedAt?:Date;scheduledHandoverAt?:Date|null;contractSnapshot?:unknown};
type Item={id:string;resourceId:string;assetCodeSnapshot:string;equipmentNameSnapshot:string;handedOverAt:Date|null;returnedAt:Date|null};

@Injectable()
export class EquipmentRentalHandoverService{
  constructor(private readonly db:DatabaseService,private readonly audit:AuditService,private readonly notifications:NotificationsService,private readonly inspections:EquipmentInspectionService){}

  private async requireAuthority(tx:Prisma.TransactionClient,actorAccountId:string,organizationId?:string,lock=false){
    if(lock){
      await tx.$queryRaw`SELECT "id" FROM "Account" WHERE "id"::text=${actorAccountId} FOR SHARE`;
      await tx.$queryRaw`SELECT "id" FROM "RoleAssignment" WHERE "accountId"::text=${actorAccountId} AND "role"='ADMIN' FOR SHARE`;
      if(organizationId)await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id"::text=${organizationId} FOR SHARE`;
    }
    const actor=await tx.account.findFirst({where:{id:actorAccountId,status:'ACTIVE',roleAssignments:{some:{role:'ADMIN',status:'ACTIVE'}}},select:{id:true}});
    if(!actor)throw new ForbiddenException('An active ADMIN account is required for rental confirmation and handover.');
    if(organizationId&&!await tx.organization.findFirst({where:{id:organizationId,kind:'DIVE_CENTER',status:'ACTIVE'},select:{id:true}})){
      throw new ForbiddenException('The supplying rental center must be active.');
    }
  }

  async confirmPayment(actorAccountId: string, id: string) {
    const result = await this.db.serializable(async tx => {
      const [rental] = await tx.$queryRaw<Rental[]>`
        SELECT "id", "renterAccountId", "status", "paymentStatus", "invoiceNumber", "paidAt", "holdExpiresAt", "totalHalala", "dueAt", "reservedAt", "scheduledHandoverAt", "contractSnapshot"
        FROM "EquipmentRental" WHERE "id"=${id} FOR UPDATE`;
      if (!rental) throw new NotFoundException('Rental not found.');
      await this.requireAuthority(tx,actorAccountId);
      if (rental.status === 'CANCELLED') throw new ConflictException('Cancelled rental cannot be paid.');
      const collection = await this.requireCollectionEvidence(tx,rental);
      await this.requireAuthority(tx,actorAccountId,collection.organizationId);
      if (rental.paymentStatus === 'PAID') {await this.requireAuthority(tx,actorAccountId,collection.organizationId,true);return 'ALREADY_PAID';}
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
      await assertRentalFitsCalendar(tx, resourceIds, rental.dueAt ?? null);
      const readiness = await this.inspections.evaluate(resourceIds, tx);
      if (readiness.blocked) throw new ConflictException('Equipment inspection or service policy blocks rental payment confirmation.');
      await this.requireAuthority(tx,actorAccountId,collection.organizationId,true);

      const updated = await tx.$executeRaw`UPDATE "EquipmentRental"
        SET "paymentStatus"='PAID',"paidAt"=NOW(),"updatedAt"=NOW() WHERE "id"=${id}
        AND ("holdExpiresAt" IS NULL OR "holdExpiresAt" > clock_timestamp())`;
      if (!updated) throw new ConflictException('انتهت مهلة الدفع. أنشئ حجزًا جديدًا.');
      await this.notifications.notify(rental.renterAccountId,'EQUIPMENT_RENTAL_INVOICE',{title:'تم تأكيد دفع تأجير المعدات',invoiceNumber:rental.invoiceNumber,rentalId:id,totalHalala:Number(rental.totalHalala||0),dueAt:rental.dueAt?.toISOString()||null,message:'تم تأكيد الدفع. المعدات محجوزة وجاهزة للتسليم من المستودع بعد مسح كل قطعة.'},tx);
      await this.audit.record({actorId:actorAccountId,action:'EQUIPMENT_RENTAL_PAYMENT_CONFIRMED',resource:'EquipmentRental',resourceId:id,metadata:{invoiceNumber:rental.invoiceNumber,renterAccountId:rental.renterAccountId,totalHalala:Number(rental.totalHalala||0),collectionEvidenceId:collection.id,financeEntryId:collection.financeEntryId,providerPaymentId:collection.providerPaymentId,handoverRequired:true,inspectionStates:readiness.states}},tx);
      return 'PAYMENT_CONFIRMED';
    });
    return this.summary(id,result);
  }

  async scan(actorAccountId: string, id: string, input: {code?: string; handoverCondition?: string}) {
    const code = input.code?.trim();
    if (!code) throw new BadRequestException('Barcode or QR code is required for handover.');
    if (input.handoverCondition !== undefined && (typeof input.handoverCondition !== 'string' || !input.handoverCondition.trim()
      || input.handoverCondition.length > 1000)) throw new BadRequestException('Describe the item condition at handover.');
    const outcome = await this.db.serializable(async tx => {
      // Serialize all scans for a rental, including replay and its final completion notice.
      const [rental] = await tx.$queryRaw<Rental[]>`
        SELECT "id","renterAccountId","status","paymentStatus","invoiceNumber","paidAt","totalHalala","dueAt","reservedAt","scheduledHandoverAt","contractSnapshot"
        FROM "EquipmentRental" WHERE "id"=${id} FOR UPDATE`;
      if (!rental) throw new NotFoundException('Rental not found.');
      await this.requireAuthority(tx,actorAccountId);
      if (rental.paymentStatus !== 'PAID') throw new ConflictException('Rental must be paid before equipment handover.');
      if (!['RESERVED','ACTIVE'].includes(rental.status)) throw new ConflictException('Rental is not open for equipment handover.');
      const collection=await this.requireCollectionEvidence(tx,rental);
      await this.requireAuthority(tx,actorAccountId,collection.organizationId);

      const [asset] = await tx.$queryRaw<Array<{resourceId:string;stockStatus:string;location:string|null}>>`
        SELECT "resourceId","stockStatus","location" FROM "EquipmentBarcode"
        WHERE "barcodeValue"=${code} OR "qrValue"=${code} OR "assetCode"=${code} OR "serialNumber"=${code}
        LIMIT 1 FOR UPDATE`;
      if (!asset) throw new NotFoundException('Equipment code not found.');
      const [item] = await tx.$queryRaw<Item[]>`
        SELECT "id","resourceId","assetCodeSnapshot","equipmentNameSnapshot","handedOverAt","returnedAt"
        FROM "EquipmentRentalItem" WHERE "rentalId"=${id} AND "resourceId"=${asset.resourceId} FOR UPDATE`;
      if (!item) throw new ConflictException('Scanned equipment does not belong to this rental.');
      if (item.handedOverAt) {await this.requireAuthority(tx,actorAccountId,collection.organizationId,true);return {result:'ALREADY_HANDED_OVER',resourceId:item.resourceId};}
      if (asset.stockStatus !== 'AVAILABLE') throw new ConflictException(`${item.assetCodeSnapshot} is not available for handover.`);
      const readiness = await this.inspections.evaluate([item.resourceId], tx);
      if (readiness.blocked) throw new ConflictException('Equipment inspection or service policy blocks rental handover.');
      await this.requireAuthority(tx,actorAccountId,collection.organizationId,true);

      if(rentalObject(rentalObject(rental.contractSnapshot).damagePolicy).version==='RENTAL_DAMAGE_1' && !input.handoverCondition?.trim())
        throw new BadRequestException('Describe the item condition before confirming handover.');
      await tx.$executeRaw`UPDATE "EquipmentRentalItem" SET "handedOverAt"=(statement_timestamp() AT TIME ZONE 'UTC') WHERE "id"=${item.id}`;
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
      await this.audit.record({actorId:actorAccountId,action:'EQUIPMENT_RENTAL_ITEM_HANDED_OVER',resource:'EquipmentRental',resourceId:id,metadata:{invoiceNumber:rental.invoiceNumber,resourceId:item.resourceId,assetCode:item.assetCodeSnapshot,handedOverCount:counts.handedOverCount,pendingHandoverCount,handoverCondition:input.handoverCondition?.trim()??null,inspectionId:readiness.latest[0]?.id??null,inspectionStates:readiness.states}},tx);
      if (pendingHandoverCount === 0) {
        await this.notifications.notify(rental.renterAccountId,'EQUIPMENT_RENTAL_HANDED_OVER',{title:'تم استلام معدات التأجير',invoiceNumber:rental.invoiceNumber,rentalId:id,message:'تم تسليم جميع معدات التأجير لك وتفعيل الإيجار.'},tx);
      }
      return {result:'HANDED_OVER',resourceId:item.resourceId};
    });
    return this.summary(id,outcome.result,outcome.resourceId);
  }

  /**
   * Read server-owned, immutable evidence. A posted entry alone, a browser flag,
   * or a captured trip Payment is not evidence that this rental was collected.
   * The collection publisher is separate; legacy markers are not backfilled.
   */
  private async requireCollectionEvidence(tx:Prisma.TransactionClient,rental:Rental){
    const fail=(message:string):never=>{throw new ConflictException({code:'RENTAL_COLLECTION_EVIDENCE_REQUIRED',message});};
    const refund=await tx.rentalRefundOperation.findFirst({where:{rentalId:rental.id,status:{in:['RESERVED','DISPATCHED','RECONCILIATION_REQUIRED','SUCCEEDED']}},select:{id:true}});
    if(refund)fail('A rental with a reserved or executed refund cannot authorize equipment handover.');
    const total=Number(rental.totalHalala);
    if(!Number.isSafeInteger(total)||total<=0||total>2_147_483_647||!rental.reservedAt||!rental.dueAt){
      fail('Rental requires a valid original amount and contract dates before financial confirmation.');
    }
    const evidence=await tx.commerceCollectionEvidence.findUnique({
      where:{sourceType_sourceId:{sourceType:'EQUIPMENT_RENTAL',sourceId:rental.id}},
    });
    if(!evidence)fail('A verified collection receipt and posted financial entry are required for this rental.');
    const proof=evidence!;
    if(proof.sourceType!=='EQUIPMENT_RENTAL'||proof.sourceId!==rental.id||proof.customerAccountId!==rental.renterAccountId
      ||!proof.organizationId||proof.amountMinor!==total||proof.currency!=='SAR'||proof.provider!=='MOYASAR'
      ||proof.providerCapturedMinor!==total||proof.providerRefundedMinor!==0
      ||!Number.isFinite(proof.providerVerifiedAt.getTime())||proof.providerVerifiedAt.getTime()>Date.now()){
      fail('Collection evidence does not match the rental, customer, currency or full captured amount.');
    }
    const object=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
    const canonicalTime=(value:unknown)=>typeof value==='string'&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value;
    const provider=object(proof.providerSnapshot),metadata=object(provider.invoiceMetadata);
    if(provider.id!==proof.providerPaymentId||provider.invoiceId!==proof.providerInvoiceId
      ||!['paid','captured'].includes(String(provider.status))||provider.amountMinor!==total||provider.currency!=='SAR'
      ||provider.capturedMinor!==total||provider.refundedMinor!==0||provider.refundedAt!==null
      ||!canonicalTime(provider.updatedAt)||Date.parse(provider.updatedAt as string)>proof.providerVerifiedAt.getTime()
      ||metadata.hydroland_source_type!=='EQUIPMENT_RENTAL'||metadata.hydroland_source_id!==rental.id
      ||metadata.hydroland_customer_account_id!==rental.renterAccountId||metadata.hydroland_organization_id!==proof.organizationId){
      fail('Provider evidence is not a verified full collection for this rental.');
    }
    const items=await tx.$queryRaw<Array<{id:string;resourceId:string;unitPriceHalala:bigint;organizationId:string|null}>>`
      SELECT i."id",i."resourceId",i."unitPriceHalala",b."organizationId"::text AS "organizationId"
      FROM "EquipmentRentalItem" i JOIN "EquipmentBarcode" b ON b."resourceId"=i."resourceId"
      WHERE i."rentalId"=${rental.id} ORDER BY i."resourceId" FOR UPDATE OF b`;
    if(!items.length||new Set(items.map(item=>item.resourceId)).size!==items.length
      ||items.some(item=>item.organizationId!==proof.organizationId||!Number.isSafeInteger(Number(item.unitPriceHalala))||item.unitPriceHalala<0n)
      ||items.reduce((sum,item)=>sum+Number(item.unitPriceHalala),0)!==total){
      fail('Rental lines must belong to the collecting center and match the collected amount.');
    }
    try{
      const original=requireRentalContract(rental as RentalContractRecord,items);
      requireAcceptedRentalContract(original,proof.contractSnapshot,proof.providerVerifiedAt);
    }catch{fail('The original rental schedule, issuer, prices and accepted policy must match the collection contract.');}
    const checkout=await tx.commerceCheckout.findUnique({where:{sourceType_sourceId:{sourceType:'EQUIPMENT_RENTAL',sourceId:rental.id}}});
    const latest=rentalObject(rentalObject(checkout?.providerResult).payment);
    if(!checkout||checkout.status!=='CAPTURED'||checkout.customerAccountId!==proof.customerAccountId||checkout.organizationId!==proof.organizationId
      ||checkout.amountMinor!==proof.amountMinor||checkout.currency!==proof.currency||checkout.provider!=='MOYASAR'
      ||checkout.providerInvoiceId!==proof.providerInvoiceId||checkout.providerPaymentId!==proof.providerPaymentId
      ||latest.id!==proof.providerPaymentId||latest.invoiceId!==proof.providerInvoiceId||latest.capturedMinor!==total||latest.refundedMinor!==0
      ||!['paid','captured'].includes(latest.status)||metadata.hydroland_checkout_id!==checkout.id
      ||rentalCanonicalJson(checkout.contractSnapshot)!==rentalCanonicalJson(proof.contractSnapshot)){
      fail('The current rental checkout must retain a verified, unrefunded collection bound to its immutable receipt.');
    }
    await requirePostedRentalCollection(tx,{financeEntryId:proof.financeEntryId,rentalId:rental.id,organizationId:proof.organizationId,amountMinor:total});
    return proof;
  }

  async summary(id:string,result='SUMMARY',resourceId?:string){const rentals=await this.db.$queryRaw<Rental[]>`SELECT "id","renterAccountId","status","paymentStatus","invoiceNumber","paidAt","holdExpiresAt" FROM "EquipmentRental" WHERE "id"=${id} LIMIT 1`;if(!rentals[0])throw new NotFoundException('Rental not found.');const items=await this.db.$queryRaw<Item[]>`SELECT "id","resourceId","assetCodeSnapshot","equipmentNameSnapshot","handedOverAt","returnedAt" FROM "EquipmentRentalItem" WHERE "rentalId"=${id} ORDER BY "createdAt"`;const handedOverCount=items.filter((item:Item)=>item.handedOverAt).length;return{result,resourceId:resourceId||null,rentalId:id,invoiceNumber:rentals[0].invoiceNumber,status:rentalStatus(rentals[0]),holdExpiresAt:rentals[0].holdExpiresAt,paymentStatus:rentals[0].paymentStatus,itemCount:items.length,handedOverCount,pendingHandoverCount:items.length-handedOverCount,items};}
}
