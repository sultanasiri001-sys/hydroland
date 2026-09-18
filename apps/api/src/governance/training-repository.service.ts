import { Injectable } from '@nestjs/common';
import { Prisma, TrainingEnrollmentStatus, TrainingRecordStatus, TrainingSessionStatus } from '@prisma/client';
import { DatabaseService } from '../database/database.service';

export interface CreateTrainingEnrollmentInput {
  studentAccountId: string;
  courseCode: string;
  centerOrganizationId?: string;
  instructorAccountId?: string;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class TrainingRepositoryService {
  constructor(private readonly db: DatabaseService) {}

  createEnrollment(input: CreateTrainingEnrollmentInput) {
    return this.db.trainingEnrollment.create({
      data: {
        studentAccountId: input.studentAccountId,
        courseCode: input.courseCode,
        centerOrganizationId: input.centerOrganizationId,
        instructorAccountId: input.instructorAccountId,
        metadata: input.metadata,
      },
      include: { record: true },
    });
  }

  getEnrollment(id: string) {
    return this.db.trainingEnrollment.findUnique({
      where: { id },
      include: { record: { include: { stages: { include: { skills: true } }, sessions: true } } },
    });
  }

  listStudentEnrollments(studentAccountId: string) {
    return this.db.trainingEnrollment.findMany({
      where: { studentAccountId },
      include: { record: true },
      orderBy: { enrolledAt: 'desc' },
    });
  }

  assignInstructor(enrollmentId: string, instructorAccountId: string) {
    return this.db.trainingEnrollment.update({
      where: { id: enrollmentId },
      data: { instructorAccountId },
    });
  }

  setEnrollmentStatus(enrollmentId: string, status: TrainingEnrollmentStatus) {
    return this.db.trainingEnrollment.update({
      where: { id: enrollmentId },
      data: { status, completedAt: status === TrainingEnrollmentStatus.COMPLETED ? new Date() : undefined },
    });
  }

  createRecord(enrollmentId: string, policyVersion?: string) {
    return this.db.trainingRecord.create({
      data: { enrollmentId, policyVersion },
      include: { stages: true, sessions: true },
    });
  }

  setRecordProgress(id: string, progressPercent: number, status?: TrainingRecordStatus) {
    const progress = Math.max(0, Math.min(100, Math.round(progressPercent)));
    return this.db.trainingRecord.update({
      where: { id },
      data: {
        progressPercent: progress,
        status,
        startedAt: status === TrainingRecordStatus.IN_PROGRESS ? new Date() : undefined,
        completedAt: status === TrainingRecordStatus.COMPLETED ? new Date() : undefined,
      },
    });
  }

  addStage(trainingRecordId: string, stageType: string, deliveryMode: string, sequence: number) {
    return this.db.trainingStage.create({
      data: { trainingRecordId, stageType, deliveryMode, sequence },
    });
  }

  addSkill(trainingStageId: string, skillCode: string, name: string) {
    return this.db.trainingSkill.create({
      data: { trainingStageId, skillCode, name },
    });
  }

  createSession(input: {
    trainingRecordId: string;
    instructorAccountId: string;
    startsAt: Date;
    trainingStageId?: string;
    facilityOrSiteId?: string;
    tripId?: string;
    vesselId?: string;
  }) {
    return this.db.trainingSession.create({ data: input });
  }

  setSessionStatus(id: string, status: TrainingSessionStatus, evidence?: Prisma.InputJsonValue) {
    return this.db.trainingSession.update({
      where: { id },
      data: { status, evidence },
    });
  }
}
