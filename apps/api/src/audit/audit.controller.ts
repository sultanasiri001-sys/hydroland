import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { PermissionGuard } from '../access/permission.guard';
import { RequirePermissions } from '../access/require-permissions.decorator';
import { AuditService } from './audit.service';

@Controller('audit')
@UseGuards(AccessTokenGuard, PermissionGuard)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @RequirePermissions('audit.read')
  listRecent(@Query('limit') limit?: string) {
    const parsed = limit ? Number(limit) : 100;
    return this.audit.listRecent(Number.isFinite(parsed) ? parsed : 100);
  }
}
