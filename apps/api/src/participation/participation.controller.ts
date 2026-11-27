import { Body, Controller, Get, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { ParticipationService } from './participation.service';
import { ParticipationSourcesService } from './participation-sources.service';

type ActorRequest = { auth: { accountId: string } };
@UseGuards(AccessTokenGuard)
@Controller('participation')
export class ParticipationController {
  constructor(private readonly participation: ParticipationService, private readonly sources: ParticipationSourcesService) {}
  @Get('workspace') workspace(@Req() request: ActorRequest) { return this.participation.workspace(request.auth.accountId); }
  @Get('accounts') accounts(@Req() request: ActorRequest, @Query('organizationId') organizationId: string, @Query('email') email: string) { return this.participation.accounts(request.auth.accountId, organizationId, email); }
  @Post('cases') create(@Req() request: ActorRequest, @Body() body: unknown) { return this.participation.create(request.auth.accountId, body); }
  @Get('cases/:id') detail(@Req() request: ActorRequest, @Param('id') id: string) { return this.participation.detail(request.auth.accountId, id); }
  @Post('cases/:id/actions') act(@Req() request: ActorRequest, @Param('id') id: string, @Body() body: unknown) { return this.participation.act(request.auth.accountId, id, body); }
  @Post('sources') createSource(@Req() request: ActorRequest, @Body() body: unknown) { return this.sources.create(request.auth.accountId, body); }
  @Get('sources/:id') source(@Req() request: ActorRequest, @Param('id') id: string) { return this.sources.detail(request.auth.accountId, id); }
  @Post('sources/:id/actions') sourceAction(@Req() request: ActorRequest, @Param('id') id: string, @Body() body: unknown) { return this.sources.act(request.auth.accountId, id, body); }
  @Get('sources/:id/attachments/:attachmentId')
  async attachment(@Req() request: ActorRequest, @Param('id') id: string, @Param('attachmentId') attachmentId: string,
    @Res() response: { setHeader(name: string, value: string): void; send(bytes: Buffer): void }) {
    const result = await this.sources.attachment(request.auth.accountId, id, attachmentId);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Disposition', "attachment; filename*=UTF-8''" + encodeURIComponent(result.filename));
    response.send(result.bytes);
  }
}
