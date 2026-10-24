import { Controller, Get, Header, Query, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { AdminGuard } from '../admin/admin.guard';
import { DepartmentReferencesService } from './department-references.service';

@Controller('admin/department-references')
@UseGuards(AccessTokenGuard, AdminGuard)
export class DepartmentReferencesController {
  constructor(private readonly service: DepartmentReferencesService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  list(@Req() request: { auth: { accountId: string } }, @Query('department') department?: unknown) {
    return this.service.list(request.auth.accountId, department);
  }
}
