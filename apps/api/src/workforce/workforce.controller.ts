import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin/admin.guard';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { WorkforceService } from './workforce.service';

type AuthenticatedRequest = { auth: { accountId: string } };

@UseGuards(AccessTokenGuard, AdminGuard)
@Controller('workforce')
export class WorkforceController {
  constructor(private readonly workforce: WorkforceService) {}

  @Get('structure')
  structure() { return this.workforce.structure(); }

  @Patch('departments/:id/status')
  setDepartmentStatus(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body: { status: 'ENABLED' | 'DISABLED' }) {
    return this.workforce.setDepartmentStatus(request.auth.accountId, id, body.status);
  }

  @Patch('positions/:id/mode')
  setPositionMode(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body: { aiEnabled?: boolean; humanEnabled?: boolean; mode?: 'DISABLED' | 'AI_ONLY' | 'HUMAN_ONLY' | 'HYBRID' }) {
    return this.workforce.setPositionMode(request.auth.accountId, id, body);
  }

  @Post('seats')
  createSeat(@Req() request: AuthenticatedRequest, @Body() body: { positionId?: string; accountId?: string | null; organizationId?: string | null; scope?: 'HEADQUARTERS' | 'EXTERNAL_CENTER'; label?: string; administrativeManagerSeatId?: string | null; technicalDepartmentId?: string | null }) {
    return this.workforce.createSeat(request.auth.accountId, body);
  }

  @Patch('seats/:id')
  updateSeat(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body: { accountId?: string | null; accessStatus?: 'LOCKED' | 'ENABLED' | 'SUSPENDED'; label?: string; administrativeManagerSeatId?: string | null; technicalDepartmentId?: string | null }) {
    return this.workforce.updateSeat(request.auth.accountId, id, body);
  }

  @Post('centers/:organizationId/initialize')
  initializeExternalCenter(@Req() request: AuthenticatedRequest, @Param('organizationId') organizationId: string) {
    return this.workforce.initializeExternalCenter(request.auth.accountId, organizationId);
  }

  @Patch('centers/:organizationId/departments/:departmentId')
  setCenterDepartmentAccess(@Req() request: AuthenticatedRequest, @Param('organizationId') organizationId: string, @Param('departmentId') departmentId: string, @Body() body: { status?: 'LOCKED' | 'ENABLED'; managerAccessEnabled?: boolean }) {
    return this.workforce.setCenterDepartmentAccess(request.auth.accountId, organizationId, departmentId, body);
  }

  @Patch('centers/:organizationId/departments')
  setAllCenterDepartmentAccess(@Req() request: AuthenticatedRequest, @Param('organizationId') organizationId: string, @Body() body: { status?: 'LOCKED' | 'ENABLED'; managerAccessEnabled?: boolean }) {
    return this.workforce.setAllCenterDepartmentAccess(request.auth.accountId, organizationId, body);
  }

  @Patch('hiring-requests/:requestId/review')
  reviewHiringRequest(@Req() request: AuthenticatedRequest, @Param('requestId') requestId: string, @Body() body: { decision: 'APPROVE' | 'REJECT'; reviewNote?: string }) {
    return this.workforce.reviewHiringRequest(request.auth.accountId, requestId, body.decision, body.reviewNote);
  }
}
