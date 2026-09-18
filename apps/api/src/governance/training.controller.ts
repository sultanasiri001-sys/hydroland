import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { TrainingEnrollmentStatus, TrainingRecordStatus, TrainingSessionStatus } from '@prisma/client';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { TrainingAuthorizationService } from './training-authorization.service';
import { TrainingRepositoryService } from './training-repository.service';

type AuthenticatedRequest = { auth: { accountId: string } };

@UseGuards(AccessTokenGuard)
@Controller('training')
export class TrainingController {
  constructor(
    private readonly training: TrainingRepositoryService,
    private readonly authorization: TrainingAuthorizationService,
  ) {}

  @Get('mine/enrollments')
  mine(@Req() request: AuthenticatedRequest) {
    return this.training.listStudentEnrollments(request.auth.accountId);
  }

  @Post('enrollments')
  enroll(@Req() request: AuthenticatedRequest, @Body() body: { courseCode: string; centerOrganizationId?: string; metadata?: any }) {
    return this.training.createEnrollment({ studentAccountId: request.auth.accountId, ...body });
  }

  @Get('enrollments/:id')
  async getEnrollment(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    await this.authorization.assertEnrollmentAccess(request.auth.accountId, id, true);
    return this.training.getEnrollment(id);
  }

  @Patch('enrollments/:id/instructor')
  async assignInstructor(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body: { instructorAccountId: string }) {
    await this.authorization.assertAdministrativeEnrollmentAccess(request.auth.accountId, id);
    return this.training.assignInstructor(id, body.instructorAccountId);
  }

  @Patch('enrollments/:id/status')
  async setEnrollmentStatus(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body: { status: TrainingEnrollmentStatus }) {
    await this.authorization.assertEnrollmentAccess(request.auth.accountId, id);
    return this.training.setEnrollmentStatus(id, body.status);
  }

  @Post('enrollments/:id/record')
  async createRecord(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body: { policyVersion?: string }) {
    await this.authorization.assertEnrollmentAccess(request.auth.accountId, id);
    return this.training.createRecord(id, body.policyVersion);
  }

  @Patch('records/:id/progress')
  async setProgress(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body: { progressPercent: number; status?: TrainingRecordStatus }) {
    await this.authorization.assertRecordAccess(request.auth.accountId, id);
    return this.training.setRecordProgress(id, body.progressPercent, body.status);
  }

  @Post('records/:id/stages')
  async addStage(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body: { stageType: string; deliveryMode: string; sequence: number }) {
    await this.authorization.assertRecordAccess(request.auth.accountId, id);
    return this.training.addStage(id, body.stageType, body.deliveryMode, body.sequence);
  }

  @Post('stages/:id/skills')
  async addSkill(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body: { skillCode: string; name: string }) {
    await this.authorization.assertStageAccess(request.auth.accountId, id);
    return this.training.addSkill(id, body.skillCode, body.name);
  }

  @Post('records/:id/sessions')
  async createSession(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body: { instructorAccountId: string; startsAt: string; trainingStageId?: string; facilityOrSiteId?: string; tripId?: string; vesselId?: string }) {
    await this.authorization.assertRecordAccess(request.auth.accountId, id);
    return this.training.createSession({ ...body, trainingRecordId: id, startsAt: new Date(body.startsAt) });
  }

  @Patch('sessions/:id/status')
  async setSessionStatus(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body: { status: TrainingSessionStatus; evidence?: any }) {
    await this.authorization.assertSessionAccess(request.auth.accountId, id);
    return this.training.setSessionStatus(id, body.status, body.evidence);
  }
}
