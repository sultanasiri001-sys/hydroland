import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin/admin.guard';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { CrewAssignmentService } from './crew-assignment.service';

@UseGuards(AccessTokenGuard)
@Controller('trips/crew/assignments')
export class CrewAssignmentController {
  constructor(private readonly crew: CrewAssignmentService) {}

  @Get('mine')
  mine(@Req() req: { auth: { accountId: string } }) {
    return this.crew.mine(req.auth.accountId);
  }

  @Get('workspace')
  workspace(@Req() req: { auth: { accountId: string } }, @Query('tripId') tripId?: string) {
    return this.crew.workspace(req.auth.accountId, tripId);
  }

  @Post('qualification-template')
  prepareTemplate(@Req() req: { auth: { accountId: string } }, @Body() body: unknown) {
    return this.crew.prepareTemplate(req.auth.accountId, body);
  }

  @Post('trips/:tripId/proposals')
  propose(@Req() req: { auth: { accountId: string } }, @Param('tripId') tripId: string, @Body() body: unknown) {
    return this.crew.propose(req.auth.accountId, tripId, body);
  }

  @Post(':id/commands')
  command(@Req() req: { auth: { accountId: string } }, @Param('id') id: string, @Body() body: unknown) {
    return this.crew.command(req.auth.accountId, id, body);
  }

  @UseGuards(AdminGuard)
  @Post('admin/escalate-pending')
  escalatePending(@Query('hoursBefore') hoursBefore?: string) {
    const parsed = Number(hoursBefore ?? 24);
    return this.crew.escalatePending(Number.isFinite(parsed) ? parsed : 24);
  }

  @Patch(':id/respond')
  respond(
    @Req() req: { auth: { accountId: string } },
    @Param('id') id: string,
    @Body() body: { response?: 'ACCEPTED' | 'REJECTED'; requestId?: string; expectedRevision?: number; reason?: string },
  ) {
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !['response','requestId','expectedRevision','reason'].includes(key))) throw new BadRequestException('F02_INVALID_FIELDS');
    if (body.response !== 'ACCEPTED' && body.response !== 'REJECTED') {
      throw new BadRequestException('response must be ACCEPTED or REJECTED.');
    }
    const {response, ...command} = body;
    return this.crew.respond(req.auth.accountId, id, response!, command);
  }
}
