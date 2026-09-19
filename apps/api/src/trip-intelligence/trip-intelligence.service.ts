import {BadRequestException,ConflictException,Injectable,NotFoundException} from '@nestjs/common';
import {AuditService} from '../audit/audit.service';
import {DatabaseService} from '../database/database.service';

@Injectable()
export class TripIntelligenceService {
  constructor(private readonly db:DatabaseService,private readonly audit:AuditService){}

  async createDraft(accountId:string,tripId:string){
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

  async saveDivePlan(tripId:string,plan:Record<string,unknown>){
    if(!plan||Object.keys(plan).length===0)throw new BadRequestException('Dive plan is required.');
    const latest=await this.db.divePlan.findFirst({where:{tripId},orderBy:{version:'desc'},select:{version:true}});
    return this.db.divePlan.create({data:{tripId,version:(latest?.version??0)+1,plan}});
  }

  async saveEmergencyPlan(tripId:string,plan:Record<string,unknown>){
    if(!plan||Object.keys(plan).length===0)throw new BadRequestException('Emergency plan is required.');
    const latest=await this.db.emergencyPlan.findFirst({where:{tripId},orderBy:{version:'desc'},select:{version:true}});
    return this.db.emergencyPlan.create({data:{tripId,version:(latest?.version??0)+1,plan}});
  }

  async upsertTranslation(briefingId:string,input:{languageCode:string;content:Record<string,unknown>;level:string}){
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
