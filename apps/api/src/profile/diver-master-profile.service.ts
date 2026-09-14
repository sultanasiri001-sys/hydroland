import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { PolicyControlService } from '../trips/policy-control.service';

type DiverProfileInput = {
  dateOfBirth?: string | null; nationality?: string | null; identityType?: string | null; identityLast4?: string | null; primaryPhone?: string | null; secondaryPhone?: string | null; preferredContact?: string | null; emergencyName?: string | null; emergencyRelation?: string | null; emergencyPhone?: string | null; emergencyAltPhone?: string | null; bloodType?: string | null; medicalFitnessStatus?: string | null; medicalClearanceExpiresAt?: string | null; preferredLanguage?: string | null; notes?: string | null;
};
type EquipmentRow={id:string;accountId:string;category:string;ownership:string;brand:string|null;model:string|null;serialNumber:string|null;size:string|null;serviceDueAt:Date|null;status:string;createdAt:Date;updatedAt:Date};

@Injectable()
export class DiverMasterProfileService {
  constructor(private readonly db: DatabaseService,private readonly policies:PolicyControlService,private readonly audit:AuditService) {}

  async get(accountId: string) {
    const rows = await this.db.$queryRawUnsafe<any[]>(`SELECT * FROM "DiverProfile" WHERE "accountId"=$1 LIMIT 1`,accountId);
    const equipment = await this.db.$queryRawUnsafe<EquipmentRow[]>(`SELECT * FROM "DiverEquipment" WHERE "accountId"=$1 ORDER BY "category","createdAt"`,accountId);
    const [inspectionPolicy,servicePolicy]=await Promise.all([this.policies.decision('EQUIPMENT','INSPECTION_STATUS'),this.policies.decision('EQUIPMENT','SERVICE_EXPIRY')]);
    const now=new Date();
    const equipmentWithPolicy=equipment.map((item:EquipmentRow)=>{
      const inactive=item.status!=='ACTIVE',serviceExpired=Boolean(item.serviceDueAt&&item.serviceDueAt<=now),issues:string[]=[];
      if(inactive&&!inspectionPolicy.bypass)issues.push('EQUIPMENT_INSPECTION_STATUS');
      if(serviceExpired&&!servicePolicy.bypass)issues.push('EQUIPMENT_SERVICE_EXPIRY');
      return {...item,policyReview:{required:(inspectionPolicy.review&&inactive)||(servicePolicy.review&&serviceExpired),blocked:(inspectionPolicy.enforce&&inactive)||(servicePolicy.enforce&&serviceExpired),issues,states:{inspection:inspectionPolicy.state,service:servicePolicy.state}}};
    });
    return { profile: rows[0] ?? null, equipment:equipmentWithPolicy };
  }

  async upsert(accountId: string, input: DiverProfileInput) {
    const idLast4 = input.identityLast4?.trim() || null;
    if (idLast4 && !/^\d{4}$/.test(idLast4)) throw new BadRequestException('Identity last4 must contain exactly four digits.');
    if (input.emergencyPhone !== undefined && input.emergencyName !== undefined && Boolean(input.emergencyPhone) !== Boolean(input.emergencyName)) throw new BadRequestException('Emergency contact name and phone must be provided together.');
    const dob = input.dateOfBirth ? new Date(input.dateOfBirth) : null,clearance = input.medicalClearanceExpiresAt ? new Date(input.medicalClearanceExpiresAt) : null;
    if (dob && Number.isNaN(dob.getTime())) throw new BadRequestException('Invalid date of birth.');
    if (clearance && Number.isNaN(clearance.getTime())) throw new BadRequestException('Invalid medical clearance date.');
    await this.db.$executeRawUnsafe(`INSERT INTO "DiverProfile" ("id","accountId","dateOfBirth","nationality","identityType","identityLast4","primaryPhone","secondaryPhone","preferredContact","emergencyName","emergencyRelation","emergencyPhone","emergencyAltPhone","bloodType","medicalFitnessStatus","medicalClearanceExpiresAt","preferredLanguage","notes","createdAt","updatedAt") VALUES (gen_random_uuid()::text,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,NOW(),NOW()) ON CONFLICT ("accountId") DO UPDATE SET "dateOfBirth"=EXCLUDED."dateOfBirth","nationality"=EXCLUDED."nationality","identityType"=EXCLUDED."identityType","identityLast4"=EXCLUDED."identityLast4","primaryPhone"=EXCLUDED."primaryPhone","secondaryPhone"=EXCLUDED."secondaryPhone","preferredContact"=EXCLUDED."preferredContact","emergencyName"=EXCLUDED."emergencyName","emergencyRelation"=EXCLUDED."emergencyRelation","emergencyPhone"=EXCLUDED."emergencyPhone","emergencyAltPhone"=EXCLUDED."emergencyAltPhone","bloodType"=EXCLUDED."bloodType","medicalFitnessStatus"=EXCLUDED."medicalFitnessStatus","medicalClearanceExpiresAt"=EXCLUDED."medicalClearanceExpiresAt","preferredLanguage"=EXCLUDED."preferredLanguage","notes"=EXCLUDED."notes","updatedAt"=NOW()`,accountId,dob,input.nationality?.trim()||null,input.identityType?.trim()||null,idLast4,input.primaryPhone?.trim()||null,input.secondaryPhone?.trim()||null,input.preferredContact?.trim()||null,input.emergencyName?.trim()||null,input.emergencyRelation?.trim()||null,input.emergencyPhone?.trim()||null,input.emergencyAltPhone?.trim()||null,input.bloodType?.trim()||null,input.medicalFitnessStatus?.trim()||'UNKNOWN',clearance,input.preferredLanguage?.trim()||'ar',input.notes?.trim()||null);
    await this.audit.record({action:'DIVER_PROFILE_UPDATED',resource:'DiverProfile',resourceId:accountId,metadata:{accountId,medicalFitnessStatus:input.medicalFitnessStatus?.trim()||'UNKNOWN',medicalClearanceExpiresAt:clearance,preferredLanguage:input.preferredLanguage?.trim()||'ar'}});
    return this.get(accountId);
  }

  async addEquipment(accountId: string, input: { category?: string; ownership?: string; brand?: string; model?: string; serialNumber?: string; size?: string; serviceDueAt?: string | null }) {
    if (!input.category?.trim()) throw new BadRequestException('Equipment category is required.');
    const serviceDueAt = input.serviceDueAt ? new Date(input.serviceDueAt) : null;
    if (serviceDueAt && Number.isNaN(serviceDueAt.getTime())) throw new BadRequestException('Invalid service due date.');
    const servicePolicy=await this.policies.decision('EQUIPMENT','SERVICE_EXPIRY'),expired=Boolean(serviceDueAt&&serviceDueAt<=new Date());
    if(expired&&servicePolicy.enforce)throw new ConflictException('Equipment with expired service cannot be activated while service validation is enforced.');
    const status=expired&&servicePolicy.review?'REVIEW':'ACTIVE';
    const rows=await this.db.$queryRawUnsafe<EquipmentRow[]>(`INSERT INTO "DiverEquipment" ("id","accountId","category","ownership","brand","model","serialNumber","size","serviceDueAt","status","createdAt","updatedAt") VALUES (gen_random_uuid()::text,$1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW()) RETURNING *`,accountId,input.category.trim(),input.ownership?.trim()||'OWNED',input.brand?.trim()||null,input.model?.trim()||null,input.serialNumber?.trim()||null,input.size?.trim()||null,serviceDueAt,status);
    const equipment=rows[0];
    await this.audit.record({action:'DIVER_EQUIPMENT_ADDED',resource:'DiverEquipment',resourceId:equipment.id,metadata:{accountId,category:equipment.category,ownership:equipment.ownership,status:equipment.status,serviceDueAt:equipment.serviceDueAt,policyState:servicePolicy.state}});
    return this.get(accountId);
  }
}
