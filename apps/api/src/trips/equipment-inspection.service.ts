import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { PolicyControlService } from './policy-control.service';

type InspectionStatus='PASS'|'REVIEW'|'FAIL';
type EquipmentInspectionRow={id:string;resourceId:string;status:InspectionStatus;inspectedAt:Date;serviceExpiresAt:Date|null;notes:string|null;reviewedByAccountId:string|null;createdAt:Date};
type EquipmentReadiness={ready:boolean;blocked:boolean;reviewRequired:boolean;issues:string[];states:Record<string,string>;latest:EquipmentInspectionRow[]};

@Injectable()
export class EquipmentInspectionService{
  constructor(private readonly db:DatabaseService,private readonly audit:AuditService,private readonly policies:PolicyControlService){}

  private async requireEquipment(resourceId:string){
    const rows=await this.db.$queryRaw<Array<{id:string;type:string;name:string;active:boolean}>>`SELECT "id","type","name","active" FROM "CalendarResource" WHERE "id"=${resourceId} LIMIT 1`;
    const resource=rows[0];if(!resource||resource.type!=='EQUIPMENT')throw new NotFoundException('Equipment resource not found.');return resource;
  }

  async history(resourceId:string){await this.requireEquipment(resourceId);return this.db.$queryRaw<EquipmentInspectionRow[]>`SELECT * FROM "EquipmentInspection" WHERE "resourceId"=${resourceId} ORDER BY "inspectedAt" DESC,"createdAt" DESC LIMIT 100`;}

  async record(reviewerAccountId:string,resourceId:string,input:{status?:InspectionStatus;inspectedAt?:string;serviceExpiresAt?:string|null;notes?:string|null}){
    const resource=await this.requireEquipment(resourceId),status=input.status;
    if(!status||!['PASS','REVIEW','FAIL'].includes(status))throw new BadRequestException('Invalid equipment inspection status.');
    const inspectedAt=input.inspectedAt?new Date(input.inspectedAt):new Date();if(Number.isNaN(inspectedAt.getTime()))throw new BadRequestException('Invalid inspectedAt.');
    const serviceExpiresAt=input.serviceExpiresAt?new Date(input.serviceExpiresAt):null;if(serviceExpiresAt&&Number.isNaN(serviceExpiresAt.getTime()))throw new BadRequestException('Invalid serviceExpiresAt.');
    if(serviceExpiresAt&&serviceExpiresAt<=inspectedAt)throw new BadRequestException('serviceExpiresAt must be after inspectedAt.');
    const notes=input.notes?.trim()||null;
    const rows=await this.db.$queryRaw<EquipmentInspectionRow[]>`INSERT INTO "EquipmentInspection"("id","resourceId","status","inspectedAt","serviceExpiresAt","notes","reviewedByAccountId","createdAt") VALUES(gen_random_uuid()::text,${resourceId},${status},${inspectedAt},${serviceExpiresAt},${notes},${reviewerAccountId},NOW()) RETURNING *`;
    const inspection=rows[0];
    await this.audit.record({action:'EQUIPMENT_INSPECTION_RECORDED',resource:'CalendarResource',resourceId,metadata:{reviewerAccountId,equipmentName:resource.name,inspectionId:inspection.id,status,inspectedAt,serviceExpiresAt,notes}});
    return inspection;
  }

  async evaluate(resourceIds:string[]):Promise<EquipmentReadiness>{
    const unique=[...new Set(resourceIds.filter(Boolean))];
    const [inspectionPolicy,expiryPolicy]=await Promise.all([this.policies.decision('EQUIPMENT','INSPECTION_STATUS'),this.policies.decision('EQUIPMENT','SERVICE_EXPIRY')]);
    if(!unique.length)return{ready:true,blocked:false,reviewRequired:false,issues:[],states:{inspection:inspectionPolicy.state,serviceExpiry:expiryPolicy.state},latest:[]};
    const latest=await this.db.$queryRaw<EquipmentInspectionRow[]>`SELECT DISTINCT ON ("resourceId") * FROM "EquipmentInspection" WHERE "resourceId"=ANY(${unique}::text[]) ORDER BY "resourceId","inspectedAt" DESC,"createdAt" DESC`;
    const byResource=new Map<string,EquipmentInspectionRow>(latest.map((row:EquipmentInspectionRow)=>[row.resourceId,row]));const issues:string[]=[];let blocked=false,reviewRequired=false;const now=new Date();
    for(const resourceId of unique){
      const row:EquipmentInspectionRow|undefined=byResource.get(resourceId);const inspectionInvalid=!row||row.status!=='PASS';const expiryInvalid=!row?.serviceExpiresAt||row.serviceExpiresAt<=now;
      if(inspectionInvalid&&!inspectionPolicy.bypass){issues.push(`EQUIPMENT_INSPECTION:${resourceId}`);if(inspectionPolicy.enforce)blocked=true;else if(inspectionPolicy.review)reviewRequired=true;}
      if(expiryInvalid&&!expiryPolicy.bypass){issues.push(`EQUIPMENT_SERVICE_EXPIRY:${resourceId}`);if(expiryPolicy.enforce)blocked=true;else if(expiryPolicy.review)reviewRequired=true;}
    }
    return{ready:!blocked&&!reviewRequired,blocked,reviewRequired,issues:[...new Set(issues)],states:{inspection:inspectionPolicy.state,serviceExpiry:expiryPolicy.state},latest};
  }
}
