import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { TrainingEnrollmentStatus, TrainingRecordStatus, TrainingSessionStatus } from '@prisma/client';
import { AdminGuard } from '../admin/admin.guard';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { TrainingRepositoryService } from './training-repository.service';

type AuthenticatedRequest = { auth: { accountId: string } };

@UseGuards(AccessTokenGuard)
@Controller('training')
export class TrainingController {
  constructor(private readonly training: TrainingRepositoryService) {}

  @Get('mine/enrollments')
  mine(@Req() request: AuthenticatedRequest) {
    return this.training.listStudentEnrollments(request.auth.accountId);
  }

  @Post('enrollments')
  enroll(@Req() request: AuthenticatedRequest, @Body() body: { courseCode: string; centerOrganizationId?: string; metadata?: any }) {
    return this.training.createEnrollment({ studentAccountId: request.auth.accountId, ...body });
  }

  @UseGuards(AdminGuard)
  @Get('enrollments/:id')
  getEnrollment(@Param('id') id: string) {
    return this.training.getEnrollment(id);
  }

  @UseGuards(AdminGuard)
  @Patch('enrollments/:id/instructor')
  assignInstructor(@Param('id') id: string, @Body() body: { instructorAccountId: string }) {
    return this.training.assignInstructor(id, body.instructorAccountId);
  }

  @UseGuards(AdminGuard)
  @Patch('enrollments/:id/status')
  setEnrollmentStatus(@Param('id') id: string, @Body() body: { status: TrainingEnrollmentStatus }) {
    return this.training.setEnrollmentStatus(id, body.status);
  }

  @UseGuards(AdminGuard)
  @Post('enrollments/:id/record')
  createRecord(@Param('id') id: string, @Body() body: { policyVersion?: string }) {
    return this.training.createRecord(id, body.policyVersion);
  }

  @UseGuards(AdminGuard)
  @Patch('records/:id/progress')
  setProgress(@Param('id') id: string, @Body() body: { progressPercent: number; status?: TrainingRecordStatus }) {
    return this.training.setRecordProgress(id, body.progressPercent, body.status);
  }

  @UseGuards(AdminGuard)
  @Post('records/:id/stages')
  addStage(@Param('id') id: string, @Body() body: { stageType: string; deliveryMode: string; sequence: number }) {
    return this.training.addStage(id, body.stageType, body.deliveryMode, body.sequence);
  }

  @UseGuards(AdminGuard)
  @Post('stages/:id/skills')
  addSkill(@Param('id') id: string, @Body() body: { skillCode: string; name: string }) {
    return this.training.addSkill(id, body.skillCode, body.name);
  }

  @UseGuards(AdminGuard)
  @Post('records/:id/sessions')
  createSession(@Param('id') id: string, @Body() body: { instructorAccountId: string; startsAt: string; trainingStageId?: string; facilityOrSiteId?: string; tripId?: string; vesselId?: string }) {
    return this.training.createSession({ ...body, trainingRecordId: id, startsAt: new Date(body.startsAt) });
  }

  @UseGuards(AdminGuard)
  @Patch('sessions/:id/status')
  setSessionStatus(@Param('id') id: string, @Body() body: { status: TrainingSessionStatus; evidence?: any }) {
    return this.training.setSessionStatus(id, body.status, body.evidence);
  }
}
