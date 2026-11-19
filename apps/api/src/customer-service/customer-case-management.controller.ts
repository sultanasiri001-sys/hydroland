import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin/admin.guard';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { CustomerCaseManagementService } from './customer-case-management.service';

type ActorRequest = { auth: { accountId: string } };

@UseGuards(AccessTokenGuard, AdminGuard)
@Controller('customer-service/admin/cases')
export class CustomerCaseManagementController {
  constructor(private readonly cases: CustomerCaseManagementService) {}

  @Get() list(@Req() req: ActorRequest, @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number) { return this.cases.list(req.auth.accountId, page, pageSize); }

  @Get('assignees') assignees(@Req() req: ActorRequest) { return this.cases.assignees(req.auth.accountId); }

  @Get(':id') get(@Req() req: ActorRequest, @Param('id') id: string) { return this.cases.get(req.auth.accountId, id); }

  @Post(':id/assign') assign(@Req() req: ActorRequest, @Param('id') id: string, @Body() input: { assignedAccountId: string; dueAt?: string }) {
    return this.cases.act(req.auth.accountId, id, 'ASSIGN', input);
  }

  @Post(':id/wait') wait(@Req() req: ActorRequest, @Param('id') id: string, @Body() input: { message: string }) {
    return this.cases.act(req.auth.accountId, id, 'WAIT', input);
  }

  @Post(':id/escalate') escalate(@Req() req: ActorRequest, @Param('id') id: string, @Body() input: { assignedAccountId: string; message: string; dueAt?: string }) {
    return this.cases.act(req.auth.accountId, id, 'ESCALATE', input);
  }

  @Post(':id/resolve') resolve(@Req() req: ActorRequest, @Param('id') id: string, @Body() input: { message: string }) {
    return this.cases.act(req.auth.accountId, id, 'RESOLVE', input);
  }
}
