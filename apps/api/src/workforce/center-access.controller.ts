import { BadRequestException, Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin/admin.guard';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { CenterPermissionLevel } from '../centers/center-permissions.domain';
import { CenterAccessService } from './center-access.service';

type AuthenticatedRequest = { auth: { accountId: string } };

@UseGuards(AccessTokenGuard, AdminGuard)
@Controller('workforce/centers')
export class CenterAccessController {
  constructor(private readonly access: CenterAccessService) {}

  @Get(':organizationId/access-matrix')
  matrix(@Param('organizationId') organizationId: string) {
    return this.access.matrix(organizationId);
  }

  @Patch(':organizationId/departments/:departmentId/level')
  setLevel(
    @Req() request: AuthenticatedRequest,
    @Param('organizationId') organizationId: string,
    @Param('departmentId') departmentId: string,
    @Body() body: { maxLevel?: CenterPermissionLevel },
  ) {
    if (!body.maxLevel) throw new BadRequestException('maxLevel is required.');
    if (!['L1', 'L2', 'L3', 'L4'].includes(body.maxLevel)) throw new BadRequestException('maxLevel must be one of L1, L2, L3, or L4.');
    return this.access.setLevel(request.auth.accountId, organizationId, departmentId, body.maxLevel);
  }
}
