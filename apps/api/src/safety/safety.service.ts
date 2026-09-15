import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class SafetyService {
  constructor(private readonly db:DatabaseService,private readonly audit:AuditService){}

  async assess(accountId:string,tripId:string,input:{items:Record<string,boolean>;notes?:string}){
    const trip=await this.db.trip.findUnique({where:{id:tripId},select:{id:true}});
    if(!trip)throw new NotFoundException('Trip not found.');
    if(!input.items||typeof input.items!=='object'||Array.isArray(input.items)||!Object.keys(input.items).length)throw new BadRequestException('Safety checklist items are required.');
    const failed=Object.values(input.items).some((value:boolean)=>!value),decision=failed?'DEFERRED':'REVIEW_REQUIRED';
    const checklist=await this.db.safetyChecklist.create({data:{tripId,items:input.items,notes:input.notes?.trim()||null,decision}});
    await this.audit.record({action:'SAFETY_ASSESSMENT_CREATED',resource:'SafetyChecklist',resourceId:checklist.id,metadata:{accountId,tripId,decision,failedItems:Object.entries(input.items).filter((entry:[string,boolean])=>!entry[1]).map((entry:[string,boolean])=>entry[0]),notesProvided:Boolean(input.notes?.trim())}});
    return checklist;
  }

  async decide(id:string,decision:'ALLOWED'|'REVIEW_REQUIRED'|'DEFERRED'){
    if(decision==='ALLOWED')return this.db.safetyChecklist.update({where:{id},data:{decision,decidedAt:new Date()}});
    throw new BadRequestException('Only an allowed decision is final.');
  }
}
