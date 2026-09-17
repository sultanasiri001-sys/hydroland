import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { AdminGuard } from '../admin/admin.guard';
import { HrService } from './hr.service';
type AuthenticatedRequest = { auth: { accountId: string } };

@UseGuards(AccessTokenGuard, AdminGuard)
@Controller('hr')
export class HrController {
  constructor(private readonly hr: HrService) {}
  @Get('employments/:id') employment(@Param('id') id: string) { return this.hr.employment(id); }
  @Post('employments') create(@Req() r: AuthenticatedRequest, @Body() b: any) { return this.hr.createEmployment(r.auth.accountId, b); }
  @Patch('employments/:id/status') transition(@Req() r: AuthenticatedRequest, @Param('id') id: string, @Body() b: { status: any }) { return this.hr.transition(r.auth.accountId, id, b.status); }
  @Post('employments/:id/contracts') contract(@Req() r: AuthenticatedRequest, @Param('id') id: string, @Body() b: any) { return this.hr.addContract(r.auth.accountId, id, b); }
  @Post('employments/:id/leave') leave(@Req() r: AuthenticatedRequest, @Param('id') id: string, @Body() b: any) { return this.hr.requestLeave(r.auth.accountId, id, b); }
  @Post('employments/:id/attendance') attendance(@Req() r: AuthenticatedRequest, @Param('id') id: string, @Body() b: any) { return this.hr.attendance(r.auth.accountId, id, b); }
}
