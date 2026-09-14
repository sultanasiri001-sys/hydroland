import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { PolicyControlService } from './policy-control.service';

type ComplianceRow={id:string;tripId:string;regulatoryStatus:string;permitStatus:string;permitReference:string|null;authorityReference:string|null;notes:string|null;reviewedByAccountId:string|null;reviewedAt:Date|null;createdAt:Date;updatedAt:Date};

@Injectable()
export class TripComplianceService{
  constructor(private readonly db:DatabaseService,private readonly policies:PolicyControlService,private readonly audit:AuditService){}

  private async policy(){const [regulatory,permit]=await Promise.all([this.policies.decision('COMPLIANCE','REGULATORY_REVIEW'),this.policies.decision('COMPLIANCE','PERMIT_REQUIRED')]);return{regulatory,permit};}

  async get(tripId:string){
    const trip=await this.db.trip.findUnique({where:{id:tripId},select:{id:true}});if(!trip)throw new NotFoundException('Trip not found.');
    const rows=await this.db.$queryRaw<ComplianceRow[]>`SELECT * FROM "TripComplianceReview" WHERE "tripId"=${tripId} LIMIT 1`;
    const record=rows[0]??null,{regulatory,permit}=await this.policy();
    const regulatoryOk=record?.regulatoryStatus==='APPROVED',permitOk=record?.permitStatus==='APPROVED',issues:string[]=[];
    if(!regulatoryOk&&!regulatory.bypass)issues.push('COMPLIANCE_REGULATORY_REVIEW');
    if(!permitOk&&!permit.bypass)issues.push('COMPLIANCE_PERMIT_REQUIRED');
    return{record,policyReview:{required:(regulatory.review&&!regulatoryOk)||(permit.review&&!permitOk),blocked:(regulatory.enforce&&!regulatoryOk)||(permit.enforce&&!permitOk),issues,states:{regulatory:regulatory.state,permit:permit.state},externalVerification:false}};
  }

  async update(accountId:string,tripId:string,input:{regulatoryStatus?:string;permitStatus?:string;permitReference?:string|null;authorityReference?:string|null;notes?:string|null}){
    const valid=['PENDING','APPROVED','REJECTED'];
    if(input.regulatoryStatus&&!valid.includes(input.regulatoryStatus))throw new BadRequestException('Invalid regulatory status.');
    if(input.permitStatus&&!valid.includes(input.permitStatus))throw new BadRequestException('Invalid permit status.');
    const trip=await this.db.trip.findUnique({where:{id:tripId},select:{id:true}});if(!trip)throw new NotFoundException('Trip not found.');
    const current=await this.db.$queryRaw<ComplianceRow[]>`SELECT * FROM "TripComplianceReview" WHERE "tripId"=${tripId} LIMIT 1`,row=current[0];
    const regulatoryStatus=input.regulatoryStatus??row?.regulatoryStatus??'PENDING',permitStatus=input.permitStatus??row?.permitStatus??'PENDING';
    if(row){await this.db.$executeRaw`UPDATE "TripComplianceReview" SET "regulatoryStatus"=${regulatoryStatus},"permitStatus"=${permitStatus},"permitReference"=${input.permitReference??row.permitReference},"authorityReference"=${input.authorityReference??row.authorityReference},"notes"=${input.notes??row.notes},"reviewedByAccountId"=${accountId},"reviewedAt"=NOW(),"updatedAt"=NOW() WHERE "id"=${row.id}`;}else{await this.db.$executeRaw`INSERT INTO "TripComplianceReview"("id","tripId","regulatoryStatus","permitStatus","permitReference","authorityReference","notes","reviewedByAccountId","reviewedAt","createdAt","updatedAt") VALUES(gen_random_uuid()::text,${tripId},${regulatoryStatus},${permitStatus},${input.permitReference??null},${input.authorityReference??null},${input.notes??null},${accountId},NOW(),NOW(),NOW())`;}
    await this.audit.record({action:'TRIP_COMPLIANCE_REVIEW_UPDATED',resource:'TripComplianceReview',resourceId:tripId,metadata:{accountId,previousRegulatoryStatus:row?.regulatoryStatus??null,previousPermitStatus:row?.permitStatus??null,regulatoryStatus,permitStatus,permitReference:input.permitReference??row?.permitReference??null,authorityReference:input.authorityReference??row?.authorityReference??null}});
    return this.get(tripId);
  }
}
