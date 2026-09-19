import {BadRequestException,Injectable} from '@nestjs/common';
import {AuditService} from '../audit/audit.service';
import {OfflinePackageManifest,TripBriefingVersion} from './trip-intelligence.domain';

@Injectable()
export class TripIntelligenceService {
  constructor(private readonly audit:AuditService){}
  async createDraft(accountId:string,tripId:string):Promise<TripBriefingVersion>{
    if(!tripId?.trim())throw new BadRequestException('Trip id is required.');
    const draft:TripBriefingVersion={id:`briefing:${tripId}:1`,tripId,version:1,status:'DRAFT',divePlanVersion:1,emergencyPlanVersion:1,safetyVersion:1,mapVersion:1,mediaVersion:1,languageVersion:1};
    await this.audit.record({action:'TRIP_BRIEFING_DRAFT_CREATED',resource:'TripBriefing',resourceId:draft.id,metadata:{accountId,tripId,version:draft.version}});
    return draft;
  }
  manifest(briefing:TripBriefingVersion):OfflinePackageManifest{
    if(briefing.status!=='PUBLISHED')return{tripId:briefing.tripId,briefingVersion:briefing.version,generatedAt:new Date(),files:[],readiness:'NOT_READY'};
    return{tripId:briefing.tripId,briefingVersion:briefing.version,generatedAt:new Date(),files:[],readiness:'UPDATE_REQUIRED'};
  }
}
