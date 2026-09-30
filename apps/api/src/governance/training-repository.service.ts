import { createHash, randomBytes } from 'node:crypto';
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

  async recommendCertificate(trainingRecordId: string, instructorAccountId: string) {
    const record = await this.db.trainingRecord.findUniqueOrThrow({
      where: { id: trainingRecordId },
      include: { enrollment: true, stages: { include: { skills: true } }, sessions: true, certificate: true },
    });
    if (record.enrollment.instructorAccountId !== instructorAccountId) throw new Error('Instructor is not assigned to this training record.');
    if (record.status !== 'COMPLETED' || record.progressPercent !== 100) throw new Error('Training record must be completed at 100%.');
    const skills=record.stages.flatMap(stage=>stage.skills);
    if (!skills.length || skills.some(skill=>skill.status!=='COMPETENT'||skill.signedOffByInstructorId!==instructorAccountId)) throw new Error('All required skills must be competent and signed off by the assigned instructor.');
    if (record.sessions.some(session=>session.status!=='COMPLETED'&&session.status!=='CANCELLED')) throw new Error('All training sessions must be completed or cancelled before recommendation.');
    if (record.certificate) return record.certificate;
    return this.db.trainingCertificate.create({data:{trainingRecordId,studentAccountId:record.enrollment.studentAccountId,courseCode:record.enrollment.courseCode,recommendedByInstructorId:instructorAccountId}});
  }

  async decideCertificate(id: string, outcome: 'APPROVED'|'REJECTED', reviewerId: string, reason?: string) {
    const certificate=await this.db.trainingCertificate.findUniqueOrThrow({where:{id}});
    if (certificate.recommendedByInstructorId===reviewerId) throw new Error('Instructor cannot approve their own certificate recommendation.');
    if (certificate.status!=='RECOMMENDED') throw new Error('Certificate recommendation is no longer pending review.');
    if (outcome==='REJECTED') return this.db.trainingCertificate.update({where:{id},data:{status:'REJECTED',reviewedByAccountId:reviewerId,reviewedAt:new Date(),reviewReason:reason||null}});
    const raw=randomBytes(24).toString('base64url'),hash=createHash('sha256').update(raw).digest('hex');
    const number='HYD-TRN-'+new Date().getUTCFullYear()+'-'+randomBytes(5).toString('hex').toUpperCase();
    const approved=await this.db.trainingCertificate.update({where:{id},data:{status:'APPROVED',reviewedByAccountId:reviewerId,reviewedAt:new Date(),reviewReason:reason||null,certificateNumber:number,verificationTokenHash:hash,issuedAt:new Date()}});
    return {...approved,verificationToken:raw};
  }

  assessSkill(id: string, status: string, instructorAccountId: string) {
    return this.db.trainingSkill.update({
      where: { id },
      data: {
        status,
        signedOffByInstructorId: status === 'COMPETENT' ? instructorAccountId : null,
        signedOffAt: status === 'COMPETENT' ? new Date() : null,
      },
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

  getSession(id: string) {
    return this.db.trainingSession.findUniqueOrThrow({ where: { id } });
  }

  setSessionStatus(id: string, status: TrainingSessionStatus, evidence?: Prisma.InputJsonValue) {
    return this.db.trainingSession.update({
      where: { id },
      data: { status, evidence },
    });
  }
}
