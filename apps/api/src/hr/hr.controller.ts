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
  @Post('employments/:id/movements') movement(@Req() r: AuthenticatedRequest, @Param('id') id: string, @Body() b: any) { return this.hr.createMovement(r.auth.accountId, id, b); }
  @Post('employments/:id/shifts') shift(@Req() r: AuthenticatedRequest, @Param('id') id: string, @Body() b: any) { return this.hr.scheduleShift(r.auth.accountId, id, b); }
  @Patch('leave/:id/decision') leaveDecision(@Req() r: AuthenticatedRequest, @Param('id') id: string, @Body() b: { approve: boolean }) { return this.hr.approveLeave(r.auth.accountId, id, b.approve); }
  @Post('employments/:id/compensation') compensation(@Req() r: AuthenticatedRequest, @Param('id') id: string, @Body() b: any) { return this.hr.addCompensation(r.auth.accountId, id, b); }
  @Post('employments/:id/performance') performance(@Req() r: AuthenticatedRequest, @Param('id') id: string, @Body() b: any) { return this.hr.createPerformanceCycle(r.auth.accountId, id, b); }
  @Post('employments/:id/relations-cases') relations(@Req() r: AuthenticatedRequest, @Param('id') id: string, @Body() b: any) { return this.hr.openRelationsCase(r.auth.accountId, id, b); }
  @Post('employments/:id/offboarding') offboarding(@Req() r: AuthenticatedRequest, @Param('id') id: string, @Body() b: any) { return this.hr.openOffboarding(r.auth.accountId, id, b); }

}
