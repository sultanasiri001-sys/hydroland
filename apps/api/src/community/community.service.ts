import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';

type CommunityPostDecision='PUBLISHED'|'REJECTED'|'ARCHIVED';
type CommunityEventStatus='DRAFT'|'PUBLISHED'|'CANCELLED'|'COMPLETED';
type CommunityEngagementType='CONSULTATION'|'MEETING';
type CommunityEngagementDecision='UNDER_REVIEW'|'SCHEDULED'|'RESOLVED'|'REJECTED';
type CommunityVolunteerDecision='ATTENDED'|'REJECTED';

const postDecisions:CommunityPostDecision[]=['PUBLISHED','REJECTED','ARCHIVED'];
const eventStatuses:CommunityEventStatus[]=['DRAFT','PUBLISHED','CANCELLED','COMPLETED'];
const engagementTypes:CommunityEngagementType[]=['CONSULTATION','MEETING'];
const engagementDecisions:CommunityEngagementDecision[]=['UNDER_REVIEW','SCHEDULED','RESOLVED','REJECTED'];
const volunteerDecisions:CommunityVolunteerDecision[]=['ATTENDED','REJECTED'];

@Injectable()
export class CommunityService {
  constructor(private readonly db:DatabaseService,private readonly audit:AuditService){}

  private text(value:unknown,label:string,min:number,max:number){
    const result=typeof value==='string'?value.trim():'';
    if(result.length<min||result.length>max)throw new BadRequestException(label+' must be between '+min+' and '+max+' characters.');
    return result;
  }

  private optionalText(value:unknown,max:number){
    if(value===undefined||value===null)return null;
    const result=typeof value==='string'?value.trim():'';
    if(!result)return null;
    if(result.length>max)throw new BadRequestException('Value is too long.');
    return result;
  }

  private date(value:unknown,label:string){
    const parsed=new Date(typeof value==='string'?value:'');
    if(Number.isNaN(parsed.getTime()))throw new BadRequestException(label+' must be a valid date and time.');
    return parsed;
  }

  private optionalDate(value:unknown,label:string){
    if(value===undefined||value===null||value==='')return null;
    return this.date(value,label);
  }

  private positiveInteger(value:unknown,label:string,max:number,optional=false){
    if(optional&&(value===undefined||value===null||value===''))return null;
    const parsed=typeof value==='number'?value:Number(value);
    if(!Number.isInteger(parsed)||parsed<1||parsed>max)throw new BadRequestException(label+' must be a whole number between 1 and '+max+'.');
    return parsed;
  }

  private eventTiming(startsAt:unknown,endsAt:unknown){
    const starts=this.date(startsAt,'Event start');
    const ends=this.date(endsAt,'Event end');
    if(ends<=starts)throw new BadRequestException('Event end must be after its start.');
    return {starts,ends};
  }

  publicPosts(){
    return this.db.communityPost.findMany({
      where:{status:'PUBLISHED'},
      include:{author:{select:{id:true,person:{select:{firstName:true,lastName:true}}}}},
      orderBy:[{publishedAt:'desc'},{createdAt:'desc'}],
      take:100,
    });
  }

  publicEvents(){
    return this.db.communityEvent.findMany({
      where:{status:'PUBLISHED',endsAt:{gte:new Date()}},
      include:{_count:{select:{volunteerRegistrations:true}}},
      orderBy:{startsAt:'asc'},
      take:100,
    });
  }

  myPosts(accountId:string){
    return this.db.communityPost.findMany({where:{authorAccountId:accountId},orderBy:{createdAt:'desc'},take:100});
  }

  async createPost(accountId:string,input:{title:string;body:string}){
    const post=await this.db.communityPost.create({data:{authorAccountId:accountId,title:this.text(input.title,'Post title',3,160),body:this.text(input.body,'Post body',3,5000)}});
    await this.audit.record({actorId:accountId,action:'COMMUNITY_POST_CREATED',resource:'CommunityPost',resourceId:post.id,metadata:{status:post.status}});
    return post;
  }

  adminPosts(){
    return this.db.communityPost.findMany({
      include:{
        author:{select:{id:true,email:true,person:{select:{firstName:true,lastName:true}}}},
        reviewedBy:{select:{id:true,email:true,person:{select:{firstName:true,lastName:true}}}},
      },
      orderBy:[{status:'asc'},{createdAt:'desc'}],
      take:200,
    });
  }

  async decidePost(adminAccountId:string,postId:string,input:{status:CommunityPostDecision;reviewNotes?:string}){
    if(!postDecisions.includes(input.status))throw new BadRequestException('Invalid post decision.');
    const post=await this.db.communityPost.findUnique({where:{id:postId}});
    if(!post)throw new NotFoundException('Community post not found.');
    const reviewNotes=this.optionalText(input.reviewNotes,2000);
    if(input.status==='REJECTED'&&!reviewNotes)throw new BadRequestException('Review notes are required when rejecting a post.');
    const now=new Date();
    const updated=await this.db.communityPost.update({
      where:{id:postId},
      data:{
        status:input.status,
        reviewNotes:reviewNotes??post.reviewNotes,
        reviewedByAccountId:adminAccountId,
        reviewedAt:now,
        publishedAt:input.status==='PUBLISHED'?now:post.publishedAt,
      },
    });
    await this.audit.record({actorId:adminAccountId,action:'COMMUNITY_POST_REVIEWED',resource:'CommunityPost',resourceId:postId,metadata:{previousStatus:post.status,status:input.status}});
    return updated;
  }

  adminEvents(){
    return this.db.communityEvent.findMany({
      include:{createdBy:{select:{id:true,email:true,person:{select:{firstName:true,lastName:true}}}},_count:{select:{volunteerRegistrations:true}}},
      orderBy:{startsAt:'desc'},
      take:200,
    });
  }

  async createEvent(adminAccountId:string,input:{title:string;description:string;locationName:string;startsAt:string;endsAt:string;capacity?:number;status?:'DRAFT'|'PUBLISHED'}){
    const {starts,ends}=this.eventTiming(input.startsAt,input.endsAt);
    const status=input.status||'DRAFT';
    if(status!=='DRAFT'&&status!=='PUBLISHED')throw new BadRequestException('Invalid initial event status.');
    const event=await this.db.communityEvent.create({
      data:{
        createdByAccountId:adminAccountId,
        title:this.text(input.title,'Event title',3,160),
        description:this.text(input.description,'Event description',3,5000),
        locationName:this.text(input.locationName,'Event location',3,160),
        startsAt:starts,
        endsAt:ends,
        capacity:this.positiveInteger(input.capacity,'Event capacity',100000,true),
        status,
      },
    });
    await this.audit.record({actorId:adminAccountId,action:'COMMUNITY_EVENT_CREATED',resource:'CommunityEvent',resourceId:event.id,metadata:{status:event.status,capacity:event.capacity}});
    return event;
  }

  async updateEvent(adminAccountId:string,eventId:string,input:{title?:string;description?:string;locationName?:string;startsAt?:string;endsAt?:string;capacity?:number|null;status?:CommunityEventStatus}){
    const event=await this.db.communityEvent.findUnique({where:{id:eventId}});
    if(!event)throw new NotFoundException('Community event not found.');
    if(input.status!==undefined&&!eventStatuses.includes(input.status))throw new BadRequestException('Invalid event status.');
    const starts=input.startsAt===undefined?event.startsAt:this.date(input.startsAt,'Event start');
    const ends=input.endsAt===undefined?event.endsAt:this.date(input.endsAt,'Event end');
    if(ends<=starts)throw new BadRequestException('Event end must be after its start.');
    const capacity=input.capacity===undefined?event.capacity:this.positiveInteger(input.capacity,'Event capacity',100000,true);
    if(capacity!==null){
      const active=await this.db.communityVolunteerRegistration.count({where:{eventId,status:{in:['REGISTERED','ATTENDED']}}});
      if(capacity<active)throw new ConflictException('Event capacity cannot be lower than active volunteer registrations.');
    }
    const data:Record<string,unknown>={
      startsAt:starts,
      endsAt:ends,
      capacity,
    };
    if(input.title!==undefined)data.title=this.text(input.title,'Event title',3,160);
    if(input.description!==undefined)data.description=this.text(input.description,'Event description',3,5000);
    if(input.locationName!==undefined)data.locationName=this.text(input.locationName,'Event location',3,160);
    if(input.status!==undefined)data.status=input.status;
    const updated=await this.db.communityEvent.update({where:{id:eventId},data:data as never});
    await this.audit.record({actorId:adminAccountId,action:'COMMUNITY_EVENT_UPDATED',resource:'CommunityEvent',resourceId:eventId,metadata:{previousStatus:event.status,status:updated.status}});
    return updated;
  }

  async registerVolunteer(accountId:string,eventId:string){
    const registration=await this.db.serializable(async tx=>{
      const event=await tx.communityEvent.findUnique({where:{id:eventId}});
      if(!event)throw new NotFoundException('Community event not found.');
      if(event.status!=='PUBLISHED')throw new ConflictException('Volunteer registration is available only for published events.');
      if(event.startsAt<=new Date())throw new ConflictException('Volunteer registration is closed after the event starts.');
      const existing=await tx.communityVolunteerRegistration.findUnique({where:{eventId_accountId:{eventId,accountId}}});
      if(existing&&(existing.status==='REGISTERED'||existing.status==='ATTENDED'))throw new ConflictException('You are already registered for this event.');
      if(event.capacity!==null){
        const active=await tx.communityVolunteerRegistration.count({where:{eventId,status:{in:['REGISTERED','ATTENDED']}}});
        if(active>=event.capacity)throw new ConflictException('Volunteer capacity has been reached.');
      }
      if(existing)return tx.communityVolunteerRegistration.update({where:{id:existing.id},data:{status:'REGISTERED',approvedMinutes:null,reviewNotes:null,reviewedByAccountId:null,reviewedAt:null,attendedAt:null}});
      return tx.communityVolunteerRegistration.create({data:{eventId,accountId}});
    });
    await this.audit.record({actorId:accountId,action:'COMMUNITY_VOLUNTEER_REGISTERED',resource:'CommunityVolunteerRegistration',resourceId:registration.id,metadata:{eventId}});
    return registration;
  }

  async myVolunteerWork(accountId:string){
    const registrations=await this.db.communityVolunteerRegistration.findMany({
      where:{accountId},
      include:{event:true},
      orderBy:{createdAt:'desc'},
      take:100,
    });
    const approvedMinutes=registrations.reduce((total,item)=>total+(item.status==='ATTENDED'?(item.approvedMinutes||0):0),0);
    return {registrations,approvedMinutes};
  }

  async cancelVolunteer(accountId:string,registrationId:string){
    const registration=await this.db.communityVolunteerRegistration.findFirst({where:{id:registrationId,accountId},include:{event:true}});
    if(!registration)throw new NotFoundException('Volunteer registration not found.');
    if(registration.status!=='REGISTERED')throw new ConflictException('Only an active volunteer registration can be cancelled.');
    if(registration.event.startsAt<=new Date())throw new ConflictException('Volunteer registration cannot be cancelled after the event starts.');
    const updated=await this.db.communityVolunteerRegistration.update({where:{id:registrationId},data:{status:'CANCELLED'}});
    await this.audit.record({actorId:accountId,action:'COMMUNITY_VOLUNTEER_CANCELLED',resource:'CommunityVolunteerRegistration',resourceId:registrationId,metadata:{eventId:registration.eventId}});
    return updated;
  }

  adminVolunteers(){
    return this.db.communityVolunteerRegistration.findMany({
      include:{
        event:true,
        account:{select:{id:true,email:true,person:{select:{firstName:true,lastName:true}}}},
        reviewedBy:{select:{id:true,email:true,person:{select:{firstName:true,lastName:true}}}},
      },
      orderBy:{createdAt:'desc'},
      take:300,
    });
  }

  async decideVolunteer(adminAccountId:string,registrationId:string,input:{status:CommunityVolunteerDecision;approvedMinutes?:number;reviewNotes?:string}){
    if(!volunteerDecisions.includes(input.status))throw new BadRequestException('Invalid volunteer decision.');
    const registration=await this.db.communityVolunteerRegistration.findUnique({where:{id:registrationId}});
    if(!registration)throw new NotFoundException('Volunteer registration not found.');
    if(registration.status==='CANCELLED')throw new ConflictException('Cancelled volunteer registrations cannot be reviewed.');
    const reviewNotes=this.optionalText(input.reviewNotes,2000);
    const approvedMinutes=input.status==='ATTENDED'?this.positiveInteger(input.approvedMinutes,'Approved volunteer minutes',1440):null;
    if(input.status==='REJECTED'&&!reviewNotes)throw new BadRequestException('Review notes are required when rejecting a volunteer registration.');
    const now=new Date();
    const updated=await this.db.communityVolunteerRegistration.update({
      where:{id:registrationId},
      data:{status:input.status,approvedMinutes,reviewNotes:reviewNotes??registration.reviewNotes,reviewedByAccountId:adminAccountId,reviewedAt:now,attendedAt:input.status==='ATTENDED'?now:registration.attendedAt},
    });
    await this.audit.record({actorId:adminAccountId,action:'COMMUNITY_VOLUNTEER_REVIEWED',resource:'CommunityVolunteerRegistration',resourceId:registrationId,metadata:{previousStatus:registration.status,status:input.status,approvedMinutes}});
    return updated;
  }

  myEngagementRequests(accountId:string){
    return this.db.communityEngagementRequest.findMany({where:{requesterAccountId:accountId},orderBy:{createdAt:'desc'},take:100});
  }

  async createEngagementRequest(accountId:string,input:{type:CommunityEngagementType;subject:string;description:string;requestedFor?:string}){
    if(!engagementTypes.includes(input.type))throw new BadRequestException('Invalid engagement request type.');
    const request=await this.db.communityEngagementRequest.create({
      data:{
        requesterAccountId:accountId,
        type:input.type,
        subject:this.text(input.subject,'Request subject',3,160),
        description:this.text(input.description,'Request description',3,5000),
        requestedFor:this.optionalDate(input.requestedFor,'Requested time'),
      },
    });
    await this.audit.record({actorId:accountId,action:'COMMUNITY_ENGAGEMENT_REQUESTED',resource:'CommunityEngagementRequest',resourceId:request.id,metadata:{type:request.type}});
    return request;
  }

  async cancelEngagementRequest(accountId:string,requestId:string){
    const request=await this.db.communityEngagementRequest.findFirst({where:{id:requestId,requesterAccountId:accountId}});
    if(!request)throw new NotFoundException('Community engagement request not found.');
    if(['RESOLVED','REJECTED','CANCELLED'].includes(request.status))throw new ConflictException('This engagement request can no longer be cancelled.');
    const updated=await this.db.communityEngagementRequest.update({where:{id:requestId},data:{status:'CANCELLED'}});
    await this.audit.record({actorId:accountId,action:'COMMUNITY_ENGAGEMENT_CANCELLED',resource:'CommunityEngagementRequest',resourceId:requestId,metadata:{previousStatus:request.status}});
    return updated;
  }

  adminEngagementRequests(){
    return this.db.communityEngagementRequest.findMany({
      include:{
        requester:{select:{id:true,email:true,person:{select:{firstName:true,lastName:true}}}},
        decidedBy:{select:{id:true,email:true,person:{select:{firstName:true,lastName:true}}}},
      },
      orderBy:[{status:'asc'},{createdAt:'desc'}],
      take:300,
    });
  }

  async decideEngagementRequest(adminAccountId:string,requestId:string,input:{status:CommunityEngagementDecision;scheduledAt?:string;decisionNotes?:string}){
    if(!engagementDecisions.includes(input.status))throw new BadRequestException('Invalid engagement decision.');
    const request=await this.db.communityEngagementRequest.findUnique({where:{id:requestId}});
    if(!request)throw new NotFoundException('Community engagement request not found.');
    if(request.status==='CANCELLED')throw new ConflictException('Cancelled engagement requests cannot be reviewed.');
    const decisionNotes=input.decisionNotes===undefined?request.decisionNotes:this.optionalText(input.decisionNotes,2000);
    const scheduledAt=input.scheduledAt===undefined?request.scheduledAt:this.optionalDate(input.scheduledAt,'Scheduled time');
    if(input.status==='SCHEDULED'&&!scheduledAt)throw new BadRequestException('Scheduled time is required when scheduling an engagement request.');
    if((input.status==='RESOLVED'||input.status==='REJECTED')&&!decisionNotes)throw new BadRequestException('Decision notes are required for final engagement decisions.');
    const now=new Date();
    const updated=await this.db.communityEngagementRequest.update({
      where:{id:requestId},
      data:{status:input.status,scheduledAt,decisionNotes,decidedByAccountId:adminAccountId,decidedAt:now},
    });
    await this.audit.record({actorId:adminAccountId,action:'COMMUNITY_ENGAGEMENT_DECIDED',resource:'CommunityEngagementRequest',resourceId:requestId,metadata:{previousStatus:request.status,status:input.status,scheduledAt}});
    return updated;
  }
}
