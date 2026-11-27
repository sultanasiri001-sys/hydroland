import { Body, Controller, Get, Header, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { AdminGuard } from '../admin/admin.guard';
import { CampaignLifecycleService } from './campaign-lifecycle.service';
type Request = { auth: { accountId: string } };

@Controller('admin/marketing-campaign-drafts')
@UseGuards(AccessTokenGuard, AdminGuard)
export class CampaignLifecycleController {
  constructor(private readonly campaigns: CampaignLifecycleService) {}
  @Get(':id/lifecycle') @Header('Cache-Control', 'private, no-store') detail(@Req() r: Request, @Param('id') id: string) { return this.campaigns.detail(r.auth.accountId, id); }
  @Get(':id/lifecycle/sources') @Header('Cache-Control', 'private, no-store') sources(@Req() r: Request, @Param('id') id: string) { return this.campaigns.sources(r.auth.accountId, id); }
  @Post('lifecycle/templates/install') @Header('Cache-Control', 'private, no-store') install(@Req() r: Request, @Body() body: unknown) { return this.campaigns.installTemplates(r.auth.accountId, body); }
  @Post(':id/lifecycle/prepare') @Header('Cache-Control', 'private, no-store') prepare(@Req() r: Request, @Param('id') id: string, @Body() body: unknown) { return this.campaigns.prepare(r.auth.accountId, id, body); }
  @Post(':id/lifecycle/decision') @Header('Cache-Control', 'private, no-store') decide(@Req() r: Request, @Param('id') id: string, @Body() body: unknown) { return this.campaigns.decide(r.auth.accountId, id, body); }
  @Post(':id/lifecycle/revoke') @Header('Cache-Control', 'private, no-store') revoke(@Req() r: Request, @Param('id') id: string, @Body() body: unknown) { return this.campaigns.revoke(r.auth.accountId, id, body); }
  @Post(':id/lifecycle/evidence') @Header('Cache-Control', 'private, no-store') evidence(@Req() r: Request, @Param('id') id: string, @Body() body: unknown) { return this.campaigns.bindEvidence(r.auth.accountId, id, body); }
}
