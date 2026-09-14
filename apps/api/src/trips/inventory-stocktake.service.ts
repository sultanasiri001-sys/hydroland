import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';

type StocktakeRow={id:string;location:string|null;status:'OPEN'|'COMPLETED';startedByAccountId:string;startedAt:Date;completedByAccountId:string|null;completedAt:Date|null};
type EquipmentRow={resourceId:string;resourceName:string;assetCode:string;barcodeValue:string;qrValue:string;serialNumber:string|null;location:string|null;stockStatus:string;acquisitionCostHalala:string|null};
type ScanResult='MATCHED'|'WRONG_LOCATION'|'UNREGISTERED';
type StocktakeScanRow={id:string;stocktakeId:string;resourceId:string|null;scannedCode:string;result:ScanResult;expectedLocation:string|null;observedLocation:string|null;scannedByAccountId:string;scannedAt:Date;resourceName?:string|null;assetCode?:string|null;acquisitionCostHalala?:string|null};

@Injectable()
export class InventoryStocktakeService{
  constructor(private readonly db:DatabaseService,private readonly audit:AuditService,private readonly notifications:NotificationsService){}

  list(){return this.db.$queryRaw<StocktakeRow[]>`SELECT * FROM "InventoryStocktake" ORDER BY "startedAt" DESC LIMIT 100`;}
  async start(actorAccountId:string,input:{location?:string|null}){const location=input.location?.trim()||null;const rows=await this.db.$queryRaw<StocktakeRow[]>`INSERT INTO "InventoryStocktake"("id","location","status","startedByAccountId","startedAt") VALUES(gen_random_uuid()::text,${location},'OPEN',${actorAccountId},NOW()) RETURNING *`;const session=rows[0];await this.audit.record({actorId:actorAccountId,action:'INVENTORY_STOCKTAKE_STARTED',resource:'InventoryStocktake',resourceId:session.id,metadata:{location}});return session;}
  private async requireOpen(id:string){const rows=await this.db.$queryRaw<StocktakeRow[]>`SELECT * FROM "InventoryStocktake" WHERE "id"=${id} LIMIT 1`;const session=rows[0];if(!session)throw new NotFoundException('Stocktake session not found.');if(session.status!=='OPEN')throw new ConflictException('Stocktake session is already completed.');return session;}

  async scan(actorAccountId:string,id:string,input:{code?:string;observedLocation?:string|null}){
    const session=await this.requireOpen(id),code=input.code?.trim();if(!code)throw new BadRequestException('Barcode or QR code is required.');const observedLocation=input.observedLocation?.trim()||session.location||null;
    const equipment=await this.db.$queryRaw<EquipmentRow[]>`SELECT b."resourceId",r."name" AS "resourceName",b."assetCode",b."barcodeValue",b."qrValue",b."serialNumber",b."location",b."stockStatus",b."acquisitionCostHalala"::text AS "acquisitionCostHalala" FROM "EquipmentBarcode" b JOIN "CalendarResource" r ON r."id"=b."resourceId" WHERE b."barcodeValue"=${code} OR b."qrValue"=${code} OR b."assetCode"=${code} OR b."serialNumber"=${code} LIMIT 1`;
    const item=equipment[0];if(!item){const rows=await this.db.$queryRaw<StocktakeScanRow[]>`INSERT INTO "InventoryStocktakeScan"("id","stocktakeId","resourceId","scannedCode","result","expectedLocation","observedLocation","scannedByAccountId","scannedAt") VALUES(gen_random_uuid()::text,${id},NULL,${code},'UNREGISTERED',NULL,${observedLocation},${actorAccountId},NOW()) RETURNING *`;return{scan:rows[0],equipment:null};}
    const locationMismatch=Boolean(session.location&&item.location&&session.location!==item.location)||Boolean(observedLocation&&item.location&&observedLocation!==item.location),result:ScanResult=locationMismatch?'WRONG_LOCATION':'MATCHED';
    const duplicate=await this.db.$queryRaw<Array<{id:string}>>`SELECT "id" FROM "InventoryStocktakeScan" WHERE "stocktakeId"=${id} AND "resourceId"=${item.resourceId} LIMIT 1`;if(duplicate.length)throw new ConflictException('Equipment was already scanned in this stocktake.');
    const rows=await this.db.$queryRaw<StocktakeScanRow[]>`INSERT INTO "InventoryStocktakeScan"("id","stocktakeId","resourceId","scannedCode","result","expectedLocation","observedLocation","scannedByAccountId","scannedAt") VALUES(gen_random_uuid()::text,${id},${item.resourceId},${code},${result},${item.location},${observedLocation},${actorAccountId},NOW()) RETURNING *`;return{scan:rows[0],equipment:item};
  }

  async summary(id:string){
    const sessions=await this.db.$queryRaw<StocktakeRow[]>`SELECT * FROM "InventoryStocktake" WHERE "id"=${id} LIMIT 1`;const session=sessions[0];if(!session)throw new NotFoundException('Stocktake session not found.');
    const scans=await this.db.$queryRaw<StocktakeScanRow[]>`SELECT s.*,r."name" AS "resourceName",b."assetCode",b."acquisitionCostHalala"::text AS "acquisitionCostHalala" FROM "InventoryStocktakeScan" s LEFT JOIN "CalendarResource" r ON r."id"=s."resourceId" LEFT JOIN "EquipmentBarcode" b ON b."resourceId"=s."resourceId" WHERE s."stocktakeId"=${id} ORDER BY s."scannedAt" DESC`;
    const expected=await this.db.$queryRaw<EquipmentRow[]>`SELECT b."resourceId",r."name" AS "resourceName",b."assetCode",b."barcodeValue",b."qrValue",b."serialNumber",b."location",b."stockStatus",b."acquisitionCostHalala"::text AS "acquisitionCostHalala" FROM "EquipmentBarcode" b JOIN "CalendarResource" r ON r."id"=b."resourceId" WHERE (${session.location}::text IS NULL OR b."location"=${session.location}) AND b."stockStatus"<>'RETIRED' ORDER BY r."name"`;
    const scannedIds=new Set(scans.map((row:StocktakeScanRow)=>row.resourceId).filter((value:string|null):value is string=>Boolean(value))),missing=expected.filter((row:EquipmentRow)=>!scannedIds.has(row.resourceId));
    const halala=(value:string|null|undefined)=>value?Number(value):0,expectedValueHalala=expected.reduce((sum:number,row:EquipmentRow)=>sum+halala(row.acquisitionCostHalala),0),missingValueHalala=missing.reduce((sum:number,row:EquipmentRow)=>sum+halala(row.acquisitionCostHalala),0),scannedValueHalala=scans.filter((row:StocktakeScanRow)=>Boolean(row.resourceId)).reduce((sum:number,row:StocktakeScanRow)=>sum+halala(row.acquisitionCostHalala),0);
    const counts={matched:scans.filter((row:StocktakeScanRow)=>row.result==='MATCHED').length,wrongLocation:scans.filter((row:StocktakeScanRow)=>row.result==='WRONG_LOCATION').length,unregistered:scans.filter((row:StocktakeScanRow)=>row.result==='UNREGISTERED').length,missing:missing.length,totalExpected:expected.length,totalScanned:scans.length,expectedValueHalala,scannedValueHalala,missingValueHalala};
    return{session,counts,scans,missing};
  }

  async complete(actorAccountId:string,id:string){await this.requireOpen(id);const report=await this.summary(id);const rows=await this.db.$queryRaw<StocktakeRow[]>`UPDATE "InventoryStocktake" SET "status"='COMPLETED',"completedByAccountId"=${actorAccountId},"completedAt"=NOW() WHERE "id"=${id} RETURNING *`;await this.audit.record({actorId:actorAccountId,action:'INVENTORY_STOCKTAKE_COMPLETED',resource:'InventoryStocktake',resourceId:id,metadata:report.counts});return{session:rows[0],report};}

  async share(actorAccountId:string,id:string,input:{accountId?:string;channel?:'IN_APP'|'WHATSAPP';phone?:string|null}){
    const report=await this.summary(id),channel=input.channel||'IN_APP';
    if(channel==='WHATSAPP'){await this.audit.record({actorId:actorAccountId,action:'INVENTORY_STOCKTAKE_WHATSAPP_PREPARED',resource:'InventoryStocktake',resourceId:id,metadata:{phone:input.phone?.trim()||null,location:report.session.location,counts:report.counts}});return{channel:'WHATSAPP',status:'PROVIDER_NOT_CONNECTED',phone:input.phone?.trim()||null,report};}
    const accountId=input.accountId?.trim();if(!accountId)throw new BadRequestException('Recipient account is required.');const account=await this.db.account.findUnique({where:{id:accountId},select:{id:true,status:true}});if(!account||account.status!=='ACTIVE')throw new BadRequestException('Recipient account is missing or inactive.');
    await this.notifications.notify(accountId,'INVENTORY_STOCKTAKE_REPORT',{title:'تقرير جرد المخزون',stocktakeId:id,location:report.session.location,counts:report.counts,message:'تمت مشاركة تقرير الجرد معك داخل HYDROLAND.'});
    await this.audit.record({actorId:actorAccountId,action:'INVENTORY_STOCKTAKE_REPORT_SHARED',resource:'InventoryStocktake',resourceId:id,metadata:{accountId,channel:'IN_APP'}});return{channel:'IN_APP',status:'SENT',accountId};
  }
}
