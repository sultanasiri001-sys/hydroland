import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ReviewGuard } from '../admin/review.guard';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { OrganizationsService } from './organizations.service';

type AuthenticatedRequest = { auth: { accountId: string } };

@UseGuards(AccessTokenGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Post()
  create(@Req() request: AuthenticatedRequest, @Body() body: { displayName: string; legalName?: string; kind: string; registrationNumber?: string; regionCode?: string }) {
    return this.organizations.create(request.auth.accountId, body);
  }

  @Get('mine')
  mine(@Req() request: AuthenticatedRequest) {
    return this.organizations.mine(request.auth.accountId);
  }

  @Get(':id/members')
  members(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.organizations.members(request.auth.accountId, id);
  }

  @Patch(':id')
  update(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body: { displayName?: string; legalName?: string; kind?: string; registrationNumber?: string; regionCode?: string }) {
    return this.organizations.update(request.auth.accountId, id, body);
  }

  @Post(':id/members')
  addMember(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body: { accountId: string; role: 'ADMIN' | 'OPERATOR' | 'INSTRUCTOR' | 'STAFF' | 'VIEWER' }) {
    return this.organizations.addMember(request.auth.accountId, id, body);
  }

  @Post(':id/membership-response')
  respondToInvitation(@Req() request: AuthenticatedRequest,@Param('id') id:string,@Body() body:{accept:boolean}){
    return this.organizations.respondToInvitation(request.auth.accountId,id,Boolean(body.accept));
  }

  @UseGuards(ReviewGuard)
  @Get()
  listForAdmin() {
    return this.organizations.listForAdmin();
  }

  @UseGuards(ReviewGuard)
  @Post(':id/decision')
  decide(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body: { outcome: 'APPROVED' | 'REJECTED'; reason?: string }) {
    return this.organizations.decide(request.auth.accountId, id, body);
  }
}
