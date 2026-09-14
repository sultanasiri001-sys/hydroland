import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
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
    @Body() body: { response?: 'ACCEPTED' | 'REJECTED' },
  ) {
    const response = body.response === 'REJECTED' ? 'REJECTED' : 'ACCEPTED';
    return this.crew.respond(req.auth.accountId, id, response);
  }
}