import {BadRequestException,ConflictException,ForbiddenException,Injectable,NotFoundException} from '@nestjs/common';
import {AuditService} from '../audit/audit.service';
import {DatabaseService} from '../database/database.service';
import {createHash} from 'node:crypto';
import {Prisma} from '@prisma/client';
import {TranslationRouterService} from '../translation/translation-router.service';
import {TranslationMode} from '../translation/translation.domain';
import {OfflinePayloadStorageService} from './offline-payload-storage.service';

@Injectable()
export class TripIntelligenceService {
  constructor(private readonly db:DatabaseService,private readonly audit:AuditService,private readonly translation:TranslationRouterService,private readonly payloadStorage:OfflinePayloadStorageService){}

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
    return this.db.divePlan.create({data:{tripId,version:(latest?.version??0)+1,plan:plan as Prisma.InputJsonValue}});
  }
  async saveEmergencyPlan(accountId:string,tripId:string,plan:Record<string,unknown>){
    await this.assertAuthor(accountId);
    if(!plan||Object.keys(plan).length===0)throw new BadRequestException('Emergency plan is required.');
    const latest=await this.db.emergencyPlan.findFirst({where:{tripId},orderBy:{version:'desc'},select:{version:true}});
    return this.db.emergencyPlan.create({data:{tripId,version:(latest?.version??0)+1,plan:plan as Prisma.InputJsonValue}});
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
    const briefing=await this.db.tripBriefing.findUnique({where:{id:briefingId},select:{id:true,status:true}});
    if(!briefing)throw new NotFoundException('Briefing not found.');
    if(briefing.status==='SUPERSEDED')throw new ConflictException('Superseded briefing translations cannot be changed.');
    const controlled=input.level==='CONTROLLED_SAFETY_CONTENT';
    return this.db.briefingTranslation.upsert({
      where:{briefingId_languageCode:{briefingId,languageCode:input.languageCode}},
      create:{briefingId,languageCode:input.languageCode,content:input.content as Prisma.InputJsonValue,level:input.level,createdByAccountId:accountId,reviewStatus:controlled?'PENDING_REVIEW':'NOT_REQUIRED'},
      update:{content:input.content as Prisma.InputJsonValue,level:input.level,createdByAccountId:accountId,reviewedAt:null,reviewedByAccountId:null,reviewStatus:controlled?'PENDING_REVIEW':'NOT_REQUIRED'}
    });
  }
  async translateBriefingText(briefingId:string,input:{sourceLanguage:string;targetLanguage:string;text:string;mode:TranslationMode}){
    const briefing=await this.db.tripBriefing.findUnique({where:{id:briefingId},select:{id:true,status:true}});
    if(!briefing)throw new NotFoundException('Briefing not found.');
    if(briefing.status!=='PUBLISHED')throw new ConflictException('Only published briefing content may be translated for participants.');
    return this.translation.translate({...input,contentClass:'GENERAL'});
  }
  async approveControlledTranslation(reviewerAccountId:string,translationId:string){
    const translation=await this.db.briefingTranslation.findUnique({where:{id:translationId}});
    if(!translation)throw new NotFoundException('Translation not found.');
    if(translation.level!=='CONTROLLED_SAFETY_CONTENT')throw new ConflictException('Only controlled safety translations use this approval workflow.');
    if(translation.reviewStatus!=='PENDING_REVIEW')throw new ConflictException('Translation is not pending review.');
    if(translation.createdByAccountId===reviewerAccountId)throw new ForbiddenException('Translation author cannot approve the same controlled translation.');
    const updated=await this.db.briefingTranslation.update({where:{id:translationId},data:{reviewStatus:'APPROVED',reviewedAt:new Date(),reviewedByAccountId:reviewerAccountId}});
    await this.audit.record({action:'CONTROLLED_TRANSLATION_APPROVED',resource:'BriefingTranslation',resourceId:translationId,metadata:{reviewerAccountId,briefingId:translation.briefingId,languageCode:translation.languageCode}});
    return updated;
  }
  private stableJson(value:unknown):string{
    if(Array.isArray(value))return '['+value.map(item=>this.stableJson(item)).join(',')+']';
    if(value&&typeof value==='object'){const obj=value as Record<string,unknown>;return '{'+Object.keys(obj).sort().map(key=>JSON.stringify(key)+':'+this.stableJson(obj[key])).join(',')+'}';}
    return JSON.stringify(value);
  }
  private sha256(value:unknown){return createHash('sha256').update(this.stableJson(value)).digest('hex');}

  async generateOfflinePackage(reviewerAccountId:string,tripId:string){
    const briefing=await this.db.tripBriefing.findFirst({where:{tripId,status:'PUBLISHED'},orderBy:{version:'desc'},include:{translations:true,media:{where:{status:'READY'}}}});
    if(!briefing)throw new ConflictException('Published briefing required before package generation.');
    const [divePlan,emergencyPlan]=await Promise.all([
      this.db.divePlan.findFirst({where:{tripId,approvedAt:{not:null}},orderBy:{version:'desc'}}),
      this.db.emergencyPlan.findFirst({where:{tripId,approvedAt:{not:null}},orderBy:{version:'desc'}})
    ]);
    if(!divePlan||!emergencyPlan)throw new ConflictException('Approved dive and emergency plans are required.');
    const unapprovedControlled=briefing.translations.filter((translation:any)=>translation.level==='CONTROLLED_SAFETY_CONTENT'&&translation.reviewStatus!=='APPROVED');
    if(unapprovedControlled.length)throw new ConflictException('All controlled safety translations must be approved before offline package generation.');
    const files=[
      {key:'briefing',version:briefing.version,checksum:this.sha256({title:briefing.title,summary:briefing.summary}),classification:'OPERATIONAL_OFFLINE'},
      {key:'dive-plan',version:divePlan.version,checksum:this.sha256(divePlan.plan),classification:'SENSITIVE_ENCRYPTED'},
      {key:'emergency-plan',version:emergencyPlan.version,checksum:this.sha256(emergencyPlan.plan),classification:'SENSITIVE_ENCRYPTED'},
      ...briefing.translations.map((translation:any)=>({key:`translation:${translation.languageCode}`,version:briefing.version,checksum:this.sha256(translation.content),classification:translation.level==='CONTROLLED_SAFETY_CONTENT'?'SENSITIVE_ENCRYPTED':'OPERATIONAL_OFFLINE'})),
      ...briefing.media.filter((media:any)=>media.classification!=='ONLINE_ONLY').map((media:any)=>({key:`media:${media.mediaKey}`,version:briefing.version,checksum:media.checksum,classification:media.classification,mediaType:media.mediaType,sizeBytes:media.sizeBytes,contentType:media.contentType,payloadKey:media.mediaKey}))
    ];
    const manifest={schemaVersion:1,tripId,briefingId:briefing.id,briefingVersion:briefing.version,divePlanVersion:divePlan.version,emergencyPlanVersion:emergencyPlan.version,generatedAt:new Date().toISOString(),files};
    const checksum=this.sha256(manifest);
    const pkg=await this.db.offlineTripPackage.create({data:{briefingId:briefing.id,manifest,checksum,status:'READY'}});
    await this.audit.record({action:'OFFLINE_TRIP_PACKAGE_GENERATED',resource:'OfflineTripPackage',resourceId:pkg.id,metadata:{reviewerAccountId,tripId,briefingVersion:briefing.version,checksum,fileCount:files.length}});
    return pkg;
  }

  async packageStatus(tripId:string){
    const briefing=await this.db.tripBriefing.findFirst({where:{tripId,status:'PUBLISHED'},orderBy:{version:'desc'},include:{offlinePackages:{orderBy:{generatedAt:'desc'},take:1}}});
    if(!briefing)return{tripId,status:'NOT_READY',reason:'PUBLISHED_BRIEFING_REQUIRED'};
    const pkg=briefing.offlinePackages[0];
    if(!pkg)return{tripId,briefingVersion:briefing.version,status:'UPDATE_REQUIRED',reason:'PACKAGE_GENERATION_REQUIRED'};
    return{tripId,briefingVersion:briefing.version,status:pkg.status,checksum:pkg.checksum,generatedAt:pkg.generatedAt};
  }
  async packageContent(tripId:string){
    const briefing=await this.db.tripBriefing.findFirst({where:{tripId,status:'PUBLISHED'},orderBy:{version:'desc'},include:{offlinePackages:{where:{status:'READY'},orderBy:{generatedAt:'desc'},take:1}}});
    if(!briefing)throw new NotFoundException('Published briefing package not found.');
    const pkg=briefing.offlinePackages[0];
    if(!pkg)throw new ConflictException('Ready offline package is not available.');
    const manifest=pkg.manifest as Prisma.JsonValue;
    if(this.sha256(manifest)!==pkg.checksum)throw new ConflictException('Offline package integrity check failed.');
    return{tripId,briefingVersion:briefing.version,checksum:pkg.checksum,generatedAt:pkg.generatedAt,manifest};
  }
  async payloadDelivery(tripId:string,mediaKey:string){
    const briefing=await this.db.tripBriefing.findFirst({where:{tripId,status:'PUBLISHED'},orderBy:{version:'desc'},include:{offlinePackages:{where:{status:'READY'},orderBy:{generatedAt:'desc'},take:1},media:{where:{mediaKey,status:'READY'},take:1}}});
    if(!briefing)throw new NotFoundException('Published briefing not found.');
    const pkg=briefing.offlinePackages[0];
    const media=briefing.media[0];
    if(!pkg||!media)throw new NotFoundException('Offline payload is not available.');
    const manifest=pkg.manifest as any;
    if(this.sha256(manifest)!==pkg.checksum)throw new ConflictException('Offline package integrity check failed.');
    const entry=Array.isArray(manifest?.files)?manifest.files.find((item:any)=>item?.key===`media:${mediaKey}`):null;
    if(!entry||entry.checksum!==media.checksum||entry.payloadKey!==media.mediaKey||entry.classification==='ONLINE_ONLY')throw new ConflictException('Payload is not part of the approved offline manifest.');
    return this.payloadStorage.delivery({storageKey:media.storageKey,checksum:media.checksum,sizeBytes:media.sizeBytes,contentType:media.contentType});
  }
}
