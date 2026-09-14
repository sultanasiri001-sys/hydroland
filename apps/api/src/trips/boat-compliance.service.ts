import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { PolicyControlService } from './policy-control.service';

type BoatComplianceRow={id:string;resourceId:string;registrationNumber:string|null;registrationStatus:string;navigationLicenseNumber:string|null;navigationLicenseExpiresAt:Date|null;safetyCertificateExpiresAt:Date|null;passengerLimit:number|null;notes:string|null;createdAt:Date;updatedAt:Date};

type BoatComplianceInput={registrationNumber?:string|null;registrationStatus?:'PENDING'|'VERIFIED'|'REJECTED';navigationLicenseNumber?:string|null;navigationLicenseExpiresAt?:string|null;safetyCertificateExpiresAt?:string|null;passengerLimit?:number|null;notes?:string|null};

@Injectable()
export class BoatComplianceService{
  constructor(private readonly db:DatabaseService,private readonly policies:PolicyControlService,private readonly audit:AuditService){}

  private async requireBoat(resourceId:string){const rows=await this.db.$queryRaw<Array<{id:string;type:string}>>`SELECT "id","type" FROM "CalendarResource" WHERE "id"=${resourceId} LIMIT 1`;if(!rows[0]||rows[0].type!=='BOAT')throw new NotFoundException('Boat resource not found.');return rows[0];}

  async get(resourceId:string){await this.requireBoat(resourceId);const rows=await this.db.$queryRaw<BoatComplianceRow[]>`SELECT * FROM "BoatResourceCompliance" WHERE "resourceId"=${resourceId} LIMIT 1`;return rows[0]??null;}

  async upsert(accountId:string,resourceId:string,input:BoatComplianceInput){await this.requireBoat(resourceId);if(input.passengerLimit!==undefined&&input.passengerLimit!==null&&(!Number.isInteger(input.passengerLimit)||input.passengerLimit<1))throw new BadRequestException('passengerLimit must be a positive integer.');const navExpiry=input.navigationLicenseExpiresAt?new Date(input.navigationLicenseExpiresAt):null,safetyExpiry=input.safetyCertificateExpiresAt?new Date(input.safetyCertificateExpiresAt):null;if(navExpiry&&Number.isNaN(navExpiry.getTime()))throw new BadRequestException('Invalid navigationLicenseExpiresAt.');if(safetyExpiry&&Number.isNaN(safetyExpiry.getTime()))throw new BadRequestException('Invalid safetyCertificateExpiresAt.');const before=await this.get(resourceId);const rows=await this.db.$queryRaw<BoatComplianceRow[]>`
    INSERT INTO "BoatResourceCompliance"("id","resourceId","registrationNumber","registrationStatus","navigationLicenseNumber","navigationLicenseExpiresAt","safetyCertificateExpiresAt","passengerLimit","notes","createdAt","updatedAt")
    VALUES(gen_random_uuid()::text,${resourceId},${input.registrationNumber?.trim()||null},${input.registrationStatus??'PENDING'},${input.navigationLicenseNumber?.trim()||null},${navExpiry},${safetyExpiry},${input.passengerLimit??null},${input.notes?.trim()||null},NOW(),NOW())
    ON CONFLICT("resourceId") DO UPDATE SET
      "registrationNumber"=EXCLUDED."registrationNumber","registrationStatus"=EXCLUDED."registrationStatus","navigationLicenseNumber"=EXCLUDED."navigationLicenseNumber","navigationLicenseExpiresAt"=EXCLUDED."navigationLicenseExpiresAt","safetyCertificateExpiresAt"=EXCLUDED."safetyCertificateExpiresAt","passengerLimit"=EXCLUDED."passengerLimit","notes"=EXCLUDED."notes","updatedAt"=NOW()
    RETURNING *`;const result=rows[0];await this.audit.record({action:'BOAT_COMPLIANCE_UPDATED',resource:'BoatResourceCompliance',resourceId,metadata:{accountId,previousStatus:before?.registrationStatus??null,registrationStatus:result.registrationStatus,passengerLimit:result.passengerLimit,navigationLicenseExpiresAt:result.navigationLicenseExpiresAt?.toISOString()??null,safetyCertificateExpiresAt:result.safetyCertificateExpiresAt?.toISOString()??null}});return result;}

  async evaluate(resourceIds:string[],bookedSeats:number){
    const [registration,license,safety,passengers]=await Promise.all([this.policies.decision('BOAT','REGISTRATION'),this.policies.decision('BOAT','NAVIGATION_LICENSE'),this.policies.decision('BOAT','SAFETY_CERTIFICATES'),this.policies.decision('BOAT','PASSENGER_LIMIT')]);
    if(!resourceIds.length)return{ready:false,blocked:true,reviewRequired:false,issues:['BOAT_RESOURCE_MISSING'],states:{registration:registration.state,license:license.state,safety:safety.state,passengers:passengers.state}};
    const rows=await this.db.$queryRaw<BoatComplianceRow[]>`SELECT * FROM "BoatResourceCompliance" WHERE "resourceId"=ANY(${resourceIds}::text[])`;
    const now=new Date(),issues:string[]=[],hard:string[]=[],review:string[]=[];
    for(const resourceId of resourceIds){const row=rows.find((item:BoatComplianceRow)=>item.resourceId===resourceId);const checks={registration:Boolean(row?.registrationNumber&&row.registrationStatus==='VERIFIED'),license:Boolean(row?.navigationLicenseNumber&&row.navigationLicenseExpiresAt&&row.navigationLicenseExpiresAt>now),safety:Boolean(row?.safetyCertificateExpiresAt&&row.safetyCertificateExpiresAt>now),passengers:Boolean(row?.passengerLimit&&bookedSeats<=row.passengerLimit)};const rules=[['BOAT_REGISTRATION',checks.registration,registration],['BOAT_NAVIGATION_LICENSE',checks.license,license],['BOAT_SAFETY_CERTIFICATES',checks.safety,safety],['BOAT_PASSENGER_LIMIT',checks.passengers,passengers]] as const;for(const [name,ok,policy] of rules){if(ok||policy.bypass)continue;issues.push(name);if(policy.enforce)hard.push(name);else if(policy.review)review.push(name);}}
    return{ready:hard.length===0&&review.length===0,blocked:hard.length>0,reviewRequired:hard.length===0&&review.length>0,issues:[...new Set(issues)],states:{registration:registration.state,license:license.state,safety:safety.state,passengers:passengers.state}};
  }
}
