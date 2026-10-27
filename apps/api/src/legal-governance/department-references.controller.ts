import { Body, Controller, Get, Header, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { AdminGuard } from '../admin/admin.guard';
import { DepartmentClosureAssessmentService } from './department-closure-assessment.service';
import { DepartmentReferencesService } from './department-references.service';

@Controller('admin/department-references')
@UseGuards(AccessTokenGuard, AdminGuard)
export class DepartmentReferencesController {
  constructor(private readonly service: DepartmentReferencesService, private readonly assessments: DepartmentClosureAssessmentService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  list(@Req() request: { auth: { accountId: string } }, @Query('department') department?: unknown) {
    return this.service.list(request.auth.accountId, department);
  }
  @Get(':department/assessment')
  @Header('Cache-Control', 'private, no-store')
  assessment(@Req() request: { auth: { accountId: string } }, @Param('department') department: string) {
    return this.assessments.inspect(request.auth.accountId, department);
  }

  @Post(':department/assessment/preview')
  @Header('Cache-Control', 'private, no-store')
  preview(@Req() request: { auth: { accountId: string } }, @Param('department') department: string, @Body() body: unknown) {
    return this.assessments.preview(request.auth.accountId, department, body);
  }

  @Post(':department/assessment')
  @Header('Cache-Control', 'private, no-store')
  record(@Req() request: { auth: { accountId: string } }, @Param('department') department: string, @Body() body: unknown) {
    return this.assessments.record(request.auth.accountId, department, body);
  }
}
