import { BadRequestException, Body, Controller, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { AdministrativeAffairsPersistenceService } from './administrative-affairs-persistence.service';
import { AdministrativeAffairsOwnershipGuard } from './administrative-affairs-ownership.guard';

@Controller('administrative-affairs')
@UseGuards(AccessTokenGuard)
export class AdministrativeAffairsController {
  constructor(
    private readonly service: AdministrativeAffairsPersistenceService,
    private readonly ownership: AdministrativeAffairsOwnershipGuard,
  ) {}

  @Patch('records/:recordId/register')
  register(@Req() req:{auth:{accountId:string}}, @Param('recordId') recordId:string) {
    this.ownership.assertOwnMutation('ADMIN_RECORD');
    return this.service.registerRecord(recordId,req.auth.accountId);
  }

  @Patch('records/:recordId/archive')
  archive(@Req() req:{auth:{accountId:string}}, @Param('recordId') recordId:string) {
    this.ownership.assertOwnMutation('ADMIN_ARCHIVE');
    return this.service.archiveRecord(recordId,req.auth.accountId);
  }

  @Post('meetings')
  scheduleMeeting(@Req() req:{auth:{accountId:string}}, @Body() body:{organizationId?:string,unitId?:string,title?:string,startsAt?:string,endsAt?:string,participantAccountIds?:string[],resourceIds?:string[]}) {
    this.ownership.assertOwnMutation('MEETING');
    if(!body.organizationId||!body.unitId||!body.title||!body.startsAt||!body.endsAt) throw new BadRequestException('ADMIN_MEETING_REQUIRED_FIELDS');
    const startsAt=new Date(body.startsAt), endsAt=new Date(body.endsAt);
    if(Number.isNaN(startsAt.getTime())||Number.isNaN(endsAt.getTime())) throw new BadRequestException('ADMIN_MEETING_TIME_INVALID');
    return this.service.scheduleMeeting({organizationId:body.organizationId,unitId:body.unitId,title:body.title,startsAt,endsAt,participantAccountIds:body.participantAccountIds??[],resourceIds:body.resourceIds??[]},req.auth.accountId);
  }

  @Post('records/:recordId/routings')
  route(@Req() req:{auth:{accountId:string}}, @Param('recordId') recordId:string, @Body() body:{toUnitId?:string}) {
    this.ownership.assertOwnMutation('ADMIN_ROUTING');
    if(!body?.toUnitId) throw new BadRequestException('ADMIN_ROUTING_TARGET_REQUIRED');
    return this.service.route(recordId,body.toUnitId,req.auth.accountId);
  }

  @Patch('routings/:routingId/assign')
  assign(@Req() req:{auth:{accountId:string}}, @Param('routingId') routingId:string, @Body() body:{assigneeAccountId?:string}) {
    this.ownership.assertOwnMutation('ADMIN_ROUTING');
    if(!body?.assigneeAccountId) throw new BadRequestException('ADMIN_ASSIGNEE_REQUIRED');
    return this.service.assign(routingId,body.assigneeAccountId,req.auth.accountId);
  }

  @Patch('routings/:routingId/decision')
  decide(@Req() req:{auth:{accountId:string}}, @Param('routingId') routingId:string, @Body() body:{decision?:string}) {
    this.ownership.assertOwnMutation('ADMIN_ROUTING');
    if(body?.decision!=='APPROVE'&&body?.decision!=='REJECT') throw new BadRequestException('ADMIN_DECISION_INVALID');
    return this.service.decide(routingId,body.decision,req.auth.accountId);
  }
}
