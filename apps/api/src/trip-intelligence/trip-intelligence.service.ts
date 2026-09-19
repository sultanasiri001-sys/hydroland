import {BadRequestException,ConflictException,ForbiddenException,Injectable,NotFoundException} from '@nestjs/common';
import {AuditService} from '../audit/audit.service';
import {DatabaseService} from '../database/database.service';

@Injectable()
export class TripIntelligenceService {
  constructor(private readonly db:DatabaseService,private readonly audit:AuditService){}

  private async assertAuthor(accountId:string){
    const role=await this.db.roleAssignment.findFirst({where:{accountId,status:'ACTIVE',role:{in:['ADMIN','REVIEWER','INSTRUCTOR','DIVE_CENTER','STAFF']}},select:{id:true}});
    if(!role)throw new ForbiddenException('Trip briefing author scope required.');
  }
  async createDraft(accountId:string,tripId:string){
    await this.assertAuthor(accountId);
    if(!tripId?.trim())throw new BadRequestException('Trip id is required.');
    const trip=await this.db.trip.findUnique({where:{id:tripId},select:{id:true}});
    if(!trip)throw new NotFoundException('Trip not found.');
    return this.db.serializable(async tx=>{
      const latest=await tx.tripBriefing.findFirst({where:{tripId},orderBy:{version:'desc'},select:{version:true}});
      const version=(latest?.version??0)+1;
      const briefing=await tx.tripBriefing.create({data:{tripId,version,status:'DRAFT',createdByAccountId:accountId}});
      await this.audit.record({action:'TRIP_BRIEFING_DRAFT_CREATED',resource:'TripBriefing',resourceId:briefing.id,metadata:{accountId,tripId,version}});
      return briefing;
    });
  }
  async submitForReview(accountId:string,briefingId:string){
    const briefing=await this.db.tripBriefing.findUnique({where:{id:briefingId}});
    if(!briefing)throw new NotFoundException('Briefing not found.');
    if(briefing.createdByAccountId!==accountId)throw new ForbiddenException('Only the briefing author can submit it for review.');
    if(briefing.status!=='DRAFT')throw new ConflictException('Only a draft briefing can be submitted.');
    const updated=await this.db.tripBriefing.update({where:{id:briefingId},data:{status:'REVIEW'}});
    await this.audit.record({action:'TRIP_BRIEFING_SUBMITTED_FOR_REVIEW',resource:'TripBriefing',resourceId:briefingId,metadata:{accountId,tripId:briefing.tripId,version:briefing.version}});
    return updated;
  }
  async publish(reviewerAccountId:string,briefingId:string){
    const briefing=await this.db.tripBriefing.findUnique({where:{id:briefingId}});
    if(!briefing)throw new NotFoundException('Briefing not found.');
    if(briefing.status!=='REVIEW')throw new ConflictException('Briefing must be under review before publication.');
    if(briefing.createdByAccountId===reviewerAccountId)throw new ForbiddenException('Briefing author cannot publish the same version.');
    const [divePlan,emergencyPlan]=await Promise.all([
      this.db.divePlan.findFirst({where:{tripId:briefing.tripId,approvedAt:{not:null}},orderBy:{version:'desc'}}),
      this.db.emergencyPlan.findFirst({where:{tripId:briefing.tripId,approvedAt:{not:null}},orderBy:{version:'desc'}})
    ]);
    if(!divePlan||!emergencyPlan)throw new ConflictException('Approved dive and emergency plans are required before publication.');
    return this.db.serializable(async tx=>{
      await tx.tripBriefing.updateMany({where:{tripId:briefing.tripId,status:'PUBLISHED'},data:{status:'SUPERSEDED'}});
      const updated=await tx.tripBriefing.update({where:{id:briefingId},data:{status:'PUBLISHED',publishedAt:new Date()}});
      await this.audit.record({action:'TRIP_BRIEFING_PUBLISHED',resource:'TripBriefing',resourceId:briefingId,metadata:{reviewerAccountId,tripId:briefing.tripId,version:briefing.version,divePlanVersion:divePlan.version,emergencyPlanVersion:emergencyPlan.version}});
      return updated;
    });
  }
  async saveDivePlan(accountId:string,tripId:string,plan:Record<string,unknown>){
    await this.assertAuthor(accountId);
    if(!plan||Object.keys(plan).length===0)throw new BadRequestException('Dive plan is required.');
    const latest=await this.db.divePlan.findFirst({where:{tripId},orderBy:{version:'desc'},select:{version:true}});
    return this.db.divePlan.create({data:{tripId,version:(latest?.version??0)+1,plan}});
  }
  async saveEmergencyPlan(accountId:string,tripId:string,plan:Record<string,unknown>){
    await this.assertAuthor(accountId);
    if(!plan||Object.keys(plan).length===0)throw new BadRequestException('Emergency plan is required.');
    const latest=await this.db.emergencyPlan.findFirst({where:{tripId},orderBy:{version:'desc'},select:{version:true}});
    return this.db.emergencyPlan.create({data:{tripId,version:(latest?.version??0)+1,plan}});
  }
  async approvePlans(reviewerAccountId:string,tripId:string){
    const [divePlan,emergencyPlan]=await Promise.all([
      this.db.divePlan.findFirst({where:{tripId},orderBy:{version:'desc'}}),
      this.db.emergencyPlan.findFirst({where:{tripId},orderBy:{version:'desc'}})
    ]);
    if(!divePlan||!emergencyPlan)throw new ConflictException('Dive and emergency plans are required.');
    const approvedAt=new Date();
    const result=await this.db.$transaction([
      this.db.divePlan.update({where:{id:divePlan.id},data:{approvedAt}}),
      this.db.emergencyPlan.update({where:{id:emergencyPlan.id},data:{approvedAt}})
    ]);
    await this.audit.record({action:'TRIP_PLANS_APPROVED',resource:'Trip',resourceId:tripId,metadata:{reviewerAccountId,divePlanVersion:divePlan.version,emergencyPlanVersion:emergencyPlan.version}});
    return{tripId,divePlan:result[0],emergencyPlan:result[1]};
  }
  async upsertTranslation(accountId:string,briefingId:string,input:{languageCode:string;content:Record<string,unknown>;level:string}){
    await this.assertAuthor(accountId);
    const allowed=['MACHINE_TRANSLATABLE','REVIEWED_TRANSLATION','CONTROLLED_SAFETY_CONTENT'];
    if(!allowed.includes(input.level))throw new BadRequestException('Invalid translation level.');
    if(input.level==='CONTROLLED_SAFETY_CONTENT')throw new ConflictException('Controlled safety translations require a separate reviewed approval workflow.');
    return this.db.briefingTranslation.upsert({where:{briefingId_languageCode:{briefingId,languageCode:input.languageCode}},create:{briefingId,languageCode:input.languageCode,content:input.content,level:input.level},update:{content:input.content,level:input.level,reviewedAt:null}});
  }
  async packageStatus(tripId:string){
    const briefing=await this.db.tripBriefing.findFirst({where:{tripId,status:'PUBLISHED'},orderBy:{version:'desc'},include:{offlinePackages:{orderBy:{generatedAt:'desc'},take:1}}});
    if(!briefing)return{tripId,status:'NOT_READY',reason:'PUBLISHED_BRIEFING_REQUIRED'};
    const pkg=briefing.offlinePackages[0];
    if(!pkg)return{tripId,briefingVersion:briefing.version,status:'UPDATE_REQUIRED',reason:'PACKAGE_GENERATION_REQUIRED'};
    return{tripId,briefingVersion:briefing.version,status:pkg.status,checksum:pkg.checksum,generatedAt:pkg.generatedAt};
  }
}
