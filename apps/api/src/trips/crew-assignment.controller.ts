import { Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
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