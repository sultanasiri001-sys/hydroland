import { Body, Controller, Get, Header, Param, Patch, Post, Put, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin/admin.guard';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { CommunityPolicyService } from './community-policy.service';
import { CommunityService } from './community.service';

type RequestAuth={auth:{accountId:string}};

@Controller('community')
export class CommunityController {
  constructor(private readonly community:CommunityService,private readonly policy:CommunityPolicyService){}

  @Get('policy') policyStatus(){return this.policy.current()}
  @Get('audio-policy') @Header('Cache-Control','no-store') audioPolicyStatus(){return this.policy.audioCurrent()}
  @UseGuards(AccessTokenGuard,AdminGuard)
  @Get('admin/policy-authoring') policyAuthoring(@Req() request:RequestAuth){return this.policy.authoring(request.auth.accountId)}
  @UseGuards(AccessTokenGuard,AdminGuard)
  @Post('admin/policy-drafts') policyDraft(@Req() request:RequestAuth,@Body() body:Parameters<CommunityPolicyService['draft']>[1]){return this.policy.draft(request.auth.accountId,body??{})}
  @UseGuards(AccessTokenGuard,AdminGuard)
  @Get('admin/policy-sources') policySources(@Req() request:RequestAuth){return this.policy.candidates(request.auth.accountId)}
  @UseGuards(AccessTokenGuard,AdminGuard)
  @Put('admin/policy') configurePolicy(@Req() request:RequestAuth,@Body() body:Parameters<CommunityPolicyService['configure']>[1]){return this.policy.configure(request.auth.accountId,body??{})}
  @UseGuards(AccessTokenGuard)
  @Patch('posts/:postId') editPost(@Req() request:RequestAuth,@Param('postId') postId:string,@Body() body:Parameters<CommunityService['editPost']>[2]){return this.community.editPost(request.auth.accountId,postId,body??{})}
  @UseGuards(AccessTokenGuard)
  @Post('posts/:postId/withdraw') withdrawPost(@Req() request:RequestAuth,@Param('postId') postId:string){return this.community.withdrawPost(request.auth.accountId,postId)}
  @UseGuards(AccessTokenGuard)
  @Post('posts/:postId/report') reportPost(@Req() request:RequestAuth,@Param('postId') postId:string,@Body() body:Parameters<CommunityService['reportPost']>[2]){return this.community.reportPost(request.auth.accountId,postId,body??{})}
  @UseGuards(AccessTokenGuard,AdminGuard)
  @Get('admin/reports') reports(@Req() request:RequestAuth){return this.community.reports(request.auth.accountId)}
  @UseGuards(AccessTokenGuard,AdminGuard)
  @Post('admin/reports/:caseId/release') releaseReport(@Req() request:RequestAuth,@Param('caseId') caseId:string){return this.community.releaseReport(request.auth.accountId,caseId)}
  @UseGuards(AccessTokenGuard,AdminGuard)
  @Post('admin/posts/purge') purgePosts(@Req() request:RequestAuth,@Body() body:{confirm?:unknown}){return this.community.purgePosts(request.auth.accountId,body??{})}

  @Get('posts')
  posts(){return this.community.publicPosts()}

  @Get('events')
  events(){return this.community.publicEvents()}

  @UseGuards(AccessTokenGuard)
  @Get('posts/mine')
  myPosts(@Req()request:RequestAuth){return this.community.myPosts(request.auth.accountId)}

  @UseGuards(AccessTokenGuard)
  @Post('posts')
  createPost(@Req()request:RequestAuth,@Body()body:{title:string;body:string}){return this.community.createPost(request.auth.accountId,body)}

  @UseGuards(AccessTokenGuard)
  @Get('volunteers/mine')
  @Header('Cache-Control','private, no-store')
  myVolunteerWork(@Req()request:RequestAuth){return this.community.myVolunteerWork(request.auth.accountId)}

  @UseGuards(AccessTokenGuard)
  @Post('events/:eventId/volunteers')
  registerVolunteer(@Req()request:RequestAuth,@Param('eventId')eventId:string,@Body() body:{programConsent?:unknown}){return this.community.registerVolunteer(request.auth.accountId,eventId,body?.programConsent)}

  @UseGuards(AccessTokenGuard)
  @Patch('volunteers/:registrationId/cancel')
  cancelVolunteer(@Req()request:RequestAuth,@Param('registrationId')registrationId:string){return this.community.cancelVolunteer(request.auth.accountId,registrationId)}

  @UseGuards(AccessTokenGuard)
  @Get('engagement-requests/mine')
  myEngagementRequests(@Req()request:RequestAuth){return this.community.myEngagementRequests(request.auth.accountId)}

  @UseGuards(AccessTokenGuard)
  @Post('engagement-requests')
  createEngagementRequest(@Req()request:RequestAuth,@Body()body:{type:'CONSULTATION'|'MEETING';subject:string;description:string;requestedFor?:string}){return this.community.createEngagementRequest(request.auth.accountId,body)}

  @UseGuards(AccessTokenGuard)
  @Patch('engagement-requests/:requestId/cancel')
  cancelEngagementRequest(@Req()request:RequestAuth,@Param('requestId')requestId:string){return this.community.cancelEngagementRequest(request.auth.accountId,requestId)}

  @UseGuards(AccessTokenGuard,AdminGuard)
  @Get('admin/posts')
  adminPosts(@Req() request:RequestAuth){return this.community.adminPosts(request.auth.accountId)}

  @UseGuards(AccessTokenGuard,AdminGuard)
  @Patch('admin/posts/:postId/status')
  decidePost(@Req()request:RequestAuth,@Param('postId')postId:string,@Body()body:{status:'PUBLISHED'|'REJECTED'|'ARCHIVED';reviewNotes?:string}){return this.community.decidePost(request.auth.accountId,postId,body)}

  @UseGuards(AccessTokenGuard,AdminGuard)
  @Get('admin/events')
  adminEvents(@Req() request:RequestAuth){return this.community.adminEvents(request.auth.accountId)}

  @UseGuards(AccessTokenGuard,AdminGuard)
  @Post('admin/events')
  createEvent(@Req()request:RequestAuth,@Body()body:{title:string;description:string;locationName:string;startsAt:string;endsAt:string;capacity?:number;status?:'DRAFT'|'PUBLISHED'}){return this.community.createEvent(request.auth.accountId,body)}

  @UseGuards(AccessTokenGuard,AdminGuard)
  @Patch('admin/events/:eventId')
  updateEvent(@Req()request:RequestAuth,@Param('eventId')eventId:string,@Body()body:{title?:string;description?:string;locationName?:string;startsAt?:string;endsAt?:string;capacity?:number|null;status?:'DRAFT'|'PUBLISHED'|'CANCELLED'|'COMPLETED'}){return this.community.updateEvent(request.auth.accountId,eventId,body)}

  @UseGuards(AccessTokenGuard,AdminGuard)
  @Get('admin/volunteers')
  adminVolunteers(@Req() request:RequestAuth){return this.community.adminVolunteers(request.auth.accountId)}

  @UseGuards(AccessTokenGuard,AdminGuard)
  @Patch('admin/volunteers/:registrationId/status')
  decideVolunteer(@Req()request:RequestAuth,@Param('registrationId')registrationId:string,@Body()body:{status:'ATTENDED'|'REJECTED';approvedMinutes?:number;reviewNotes?:string}){return this.community.decideVolunteer(request.auth.accountId,registrationId,body)}

  @UseGuards(AccessTokenGuard,AdminGuard)
  @Get('admin/engagement-requests')
  adminEngagementRequests(@Req() request:RequestAuth){return this.community.adminEngagementRequests(request.auth.accountId)}

  @UseGuards(AccessTokenGuard,AdminGuard)
  @Patch('admin/engagement-requests/:requestId/status')
  decideEngagementRequest(@Req()request:RequestAuth,@Param('requestId')requestId:string,@Body()body:{status:'UNDER_REVIEW'|'SCHEDULED'|'RESOLVED'|'REJECTED';scheduledAt?:string;decisionNotes?:string}){return this.community.decideEngagementRequest(request.auth.accountId,requestId,body)}
}
