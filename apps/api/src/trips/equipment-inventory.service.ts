import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';

const STOCK_STATUSES=['AVAILABLE','CHECKED_OUT','MAINTENANCE','QUARANTINED','RETIRED'] as const;
const MOVEMENT_TYPES=['CHECK_IN','CHECK_OUT','TRANSFER','MAINTENANCE','QUARANTINE','RELEASE','RETIRE'] as const;
type StockStatus=typeof STOCK_STATUSES[number];
type MovementType=typeof MOVEMENT_TYPES[number];
type BarcodeRow={id:string;resourceId:string;assetCode:string;barcodeValue:string;qrValue:string;serialNumber:string|null;sku:string|null;location:string|null;stockStatus:StockStatus;createdAt:Date;updatedAt:Date;resourceName?:string;active?:boolean};
type MovementRow={id:string;resourceId:string;movementType:MovementType;fromLocation:string|null;toLocation:string|null;tripId:string|null;assignedAccountId:string|null;notes:string|null;actorAccountId:string;occurredAt:Date};

@Injectable()
export class EquipmentInventoryService{
  constructor(private readonly db:DatabaseService,private readonly audit:AuditService){}

  private normalize(value?:string|null){return value?.trim()||null;}
  private async requireEquipment(resourceId:string){
    const rows=await this.db.$queryRaw<Array<{id:string;name:string;type:string;active:boolean}>>`SELECT "id","name","type","active" FROM "CalendarResource" WHERE "id"=${resourceId} LIMIT 1`;
    const resource=rows[0];if(!resource||resource.type!=='EQUIPMENT')throw new NotFoundException('Equipment resource not found.');return resource;
  }
  private generatedCode(resourceId:string){return `HYD-${resourceId.replace(/[^a-zA-Z0-9]/g,'').slice(0,12).toUpperCase()}`;}

  async list(){return this.db.$queryRaw<BarcodeRow[]>`SELECT b.*,r."name" AS "resourceName",r."active" FROM "EquipmentBarcode" b JOIN "CalendarResource" r ON r."id"=b."resourceId" ORDER BY r."name",b."assetCode"`;}

  async get(resourceId:string){
    await this.requireEquipment(resourceId);
    const rows=await this.db.$queryRaw<BarcodeRow[]>`SELECT b.*,r."name" AS "resourceName",r."active" FROM "EquipmentBarcode" b JOIN "CalendarResource" r ON r."id"=b."resourceId" WHERE b."resourceId"=${resourceId} LIMIT 1`;
    if(!rows[0])throw new NotFoundException('Barcode passport not found for equipment.');
    const movements=await this.history(resourceId);return{...rows[0],movements};
  }

  async lookup(code:string){
    const clean=code?.trim();if(!clean)throw new BadRequestException('Barcode or QR value is required.');
    const rows=await this.db.$queryRaw<BarcodeRow[]>`SELECT b.*,r."name" AS "resourceName",r."active" FROM "EquipmentBarcode" b JOIN "CalendarResource" r ON r."id"=b."resourceId" WHERE b."barcodeValue"=${clean} OR b."qrValue"=${clean} OR b."assetCode"=${clean} OR b."serialNumber"=${clean} LIMIT 1`;
    if(!rows[0])throw new NotFoundException('Equipment code not found.');
    return this.get(rows[0].resourceId);
  }

  async assignCode(actorAccountId:string,resourceId:string,input:{assetCode?:string;barcodeValue?:string;qrValue?:string;serialNumber?:string|null;sku?:string|null;location?:string|null}){
    const resource=await this.requireEquipment(resourceId);
    const existing=await this.db.$queryRaw<BarcodeRow[]>`SELECT * FROM "EquipmentBarcode" WHERE "resourceId"=${resourceId} LIMIT 1`;
    const assetCode=input.assetCode?.trim()||existing[0]?.assetCode||this.generatedCode(resourceId);
    const barcodeValue=input.barcodeValue?.trim()||existing[0]?.barcodeValue||assetCode;
    const qrValue=input.qrValue?.trim()||existing[0]?.qrValue||`hydroland:equipment:${assetCode}`;
    const serialNumber=this.normalize(input.serialNumber)??existing[0]?.serialNumber??null,sku=this.normalize(input.sku)??existing[0]?.sku??null,location=this.normalize(input.location)??existing[0]?.location??null;
    if(assetCode.length<3||barcodeValue.length<3||qrValue.length<3)throw new BadRequestException('Equipment codes must contain at least three characters.');
    try{
      const rows=existing.length
        ?await this.db.$queryRaw<BarcodeRow[]>`UPDATE "EquipmentBarcode" SET "assetCode"=${assetCode},"barcodeValue"=${barcodeValue},"qrValue"=${qrValue},"serialNumber"=${serialNumber},"sku"=${sku},"location"=${location},"updatedAt"=NOW() WHERE "resourceId"=${resourceId} RETURNING *`
        :await this.db.$queryRaw<BarcodeRow[]>`INSERT INTO "EquipmentBarcode"("id","resourceId","assetCode","barcodeValue","qrValue","serialNumber","sku","location","stockStatus","createdAt","updatedAt") VALUES(gen_random_uuid()::text,${resourceId},${assetCode},${barcodeValue},${qrValue},${serialNumber},${sku},${location},'AVAILABLE',NOW(),NOW()) RETURNING *`;
      const record=rows[0];await this.audit.record({actorId:actorAccountId,action:'EQUIPMENT_BARCODE_ASSIGNED',resource:'CalendarResource',resourceId,metadata:{equipmentName:resource.name,assetCode,barcodeValue,qrValue,serialNumber,sku,location}});return record;
    }catch(error){if(typeof error==='object'&&error!==null&&'code' in error&&(error as {code?:unknown}).code==='P2002')throw new ConflictException('Equipment asset, barcode or QR code already exists.');throw error;}
  }

  history(resourceId:string){return this.db.$queryRaw<MovementRow[]>`SELECT * FROM "EquipmentMovement" WHERE "resourceId"=${resourceId} ORDER BY "occurredAt" DESC LIMIT 200`;}

  async move(actorAccountId:string,resourceId:string,input:{movementType?:MovementType;toLocation?:string|null;tripId?:string|null;assignedAccountId?:string|null;notes?:string|null}){
    await this.requireEquipment(resourceId);const movementType=input.movementType;
    if(!movementType||!MOVEMENT_TYPES.includes(movementType))throw new BadRequestException('Invalid equipment movement type.');
    const codes=await this.db.$queryRaw<BarcodeRow[]>`SELECT * FROM "EquipmentBarcode" WHERE "resourceId"=${resourceId} LIMIT 1`;const current=codes[0];if(!current)throw new ConflictException('Equipment must have a barcode passport before inventory movements.');
    const toLocation=this.normalize(input.toLocation),tripId=this.normalize(input.tripId),assignedAccountId=this.normalize(input.assignedAccountId),notes=this.normalize(input.notes);
    if(tripId){const trip=await this.db.trip.findUnique({where:{id:tripId},select:{id:true}});if(!trip)throw new NotFoundException('Trip not found.');}
    if(assignedAccountId){const account=await this.db.account.findUnique({where:{id:assignedAccountId},select:{id:true,status:true}});if(!account||account.status!=='ACTIVE')throw new BadRequestException('Assigned account is missing or inactive.');}
    const nextStatus:StockStatus=movementType==='CHECK_OUT'?'CHECKED_OUT':movementType==='MAINTENANCE'?'MAINTENANCE':movementType==='QUARANTINE'?'QUARANTINED':movementType==='RETIRE'?'RETIRED':'AVAILABLE';
    if(current.stockStatus==='RETIRED'&&movementType!=='RELEASE')throw new ConflictException('Retired equipment cannot be moved.');
    const result=await this.db.serializable(async tx=>{
      const rows=await tx.$queryRaw<BarcodeRow[]>`SELECT * FROM "EquipmentBarcode" WHERE "resourceId"=${resourceId} FOR UPDATE`;const latest=rows[0];if(!latest)throw new ConflictException('Equipment barcode passport is missing.');
      const movements=await tx.$queryRaw<MovementRow[]>`INSERT INTO "EquipmentMovement"("id","resourceId","movementType","fromLocation","toLocation","tripId","assignedAccountId","notes","actorAccountId","occurredAt") VALUES(gen_random_uuid()::text,${resourceId},${movementType},${latest.location},${toLocation},${tripId},${assignedAccountId},${notes},${actorAccountId},NOW()) RETURNING *`;
      await tx.$executeRaw`UPDATE "EquipmentBarcode" SET "stockStatus"=${nextStatus},"location"=COALESCE(${toLocation},"location"),"updatedAt"=NOW() WHERE "resourceId"=${resourceId}`;
      return movements[0];
    });
    await this.audit.record({actorId:actorAccountId,action:'EQUIPMENT_INVENTORY_MOVED',resource:'CalendarResource',resourceId,metadata:{movementType,fromLocation:current.location,toLocation,tripId,assignedAccountId,previousStatus:current.stockStatus,stockStatus:nextStatus,notes}});return{movement:result,stockStatus:nextStatus};
  }
}
