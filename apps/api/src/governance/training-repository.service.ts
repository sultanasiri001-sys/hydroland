import { trainingOperationalPolicy } from './training-operational-policy';
import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma, TrainingEnrollmentStatus, TrainingRecordStatus } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { TrainingAssignmentService } from './training-assignment.service';
import { TrainingSessionService } from './training-session.service';
import { TrainingCourseProgressService } from './training-course-progress.service';
import { trainingCompletion, trainingRecordEditable } from './training-completion-policy';
import { TrainingCertificateService } from './training-certificate.service';

export interface CreateTrainingEnrollmentInput {
  studentAccountId: string;
  courseCode: string;
  centerOrganizationId?: string;
  instructorAccountId?: string;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class TrainingRepositoryService {
  constructor(private readonly db: DatabaseService,private readonly sessions:TrainingSessionService,private readonly assignments:TrainingAssignmentService,private readonly progress:TrainingCourseProgressService,private readonly certificates:TrainingCertificateService) {}

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

  assignInstructor(enrollmentId:string,input:Record<string,unknown>,actorId:string){return this.assignments.assignEnrollment(actorId,enrollmentId,input);}

  setEnrollmentStatus(enrollmentId: string, status: TrainingEnrollmentStatus) {
    if(!Object.values(TrainingEnrollmentStatus).includes(status))throw new BadRequestException('حالة التسجيل غير صالحة.');
    return this.db.serializable(async tx=>{
      const current=await tx.trainingEnrollment.findUniqueOrThrow({where:{id:enrollmentId},include:{record:{include:{stages:{include:{skills:true}},sessions:true,certificate:true}}}});
      if(status==='COMPLETED'&&(!current.record||current.record.status!=='COMPLETED'||!trainingCompletion(current.record).ready))throw new ConflictException('أكمل سجل التدريب والمهارات والجلسات قبل إتمام التسجيل.');
      if(current.record?.certificate&&current.status!==status)throw new ConflictException('لا يمكن تغيير تسجيل مرتبط بشهادة.');
      if(current.record?.status==='COMPLETED'&&status!=='COMPLETED')throw new ConflictException('سجل التدريب مكتمل ولا يمكن إعادة فتح التسجيل بهذا الإجراء.');
      if(current.storeCourseOfferId&&current.status==='CANCELLED'&&status!=='CANCELLED'){
        const offer=await tx.storeCourseOffer.findFirst({where:{id:current.storeCourseOfferId,status:'ACTIVE',startsAt:{gt:new Date()},organization:{status:'ACTIVE'}}});
        if(!offer)throw new ConflictException('الدورة غير متاحة لإعادة التسجيل.');
        const duplicate=await tx.trainingEnrollment.findFirst({where:{storeCourseOfferId:offer.id,studentAccountId:current.studentAccountId,status:{not:'CANCELLED'}}});
        const seats=await tx.trainingEnrollment.count({where:{storeCourseOfferId:offer.id,status:{not:'CANCELLED'}}});
        if(duplicate||((await trainingOperationalPolicy(tx)).capacityLimit&&seats>=offer.capacity))throw new ConflictException('التسجيل مكرر أو اكتملت مقاعد الدورة.');
      }
      return tx.trainingEnrollment.update({where:{id:enrollmentId},data:{status,completedAt:status===TrainingEnrollmentStatus.COMPLETED?new Date():undefined}});
    });
  }

  createRecord(enrollmentId: string, policyVersion?: string) {
    return this.db.trainingRecord.create({
      data: { enrollmentId, policyVersion },
      include: { stages: true, sessions: true },
    });
  }

  async setRecordProgress(id: string, progressPercent: number, status?: TrainingRecordStatus) {
    if(!Number.isFinite(progressPercent))throw new BadRequestException('نسبة التقدم غير صالحة.');
    const progress = Math.max(0, Math.min(100, Math.round(progressPercent)));
    return this.db.serializable(async tx=>{
    const current=await tx.trainingRecord.findUniqueOrThrow({where:{id},include:{enrollment:true,stages:{include:{skills:true}},sessions:true,certificate:true}});
    if(!trainingRecordEditable(current))throw new ConflictException('السجل مغلق ولا يقبل تعديل التقدم.');
    if((progress===100||status==='COMPLETED')&&(!trainingCompletion(current).ready||progress!==100))throw new ConflictException('إتمام السجل يتطلب جميع المهارات الموقعة والجلسات المغلقة.');
    const updated=await tx.trainingRecord.update({
      where: { id },
      data: {
        progressPercent: progress,
        status,
        startedAt: status === TrainingRecordStatus.IN_PROGRESS ? new Date() : undefined,
        completedAt: status === TrainingRecordStatus.COMPLETED ? new Date() : undefined,
      },
    });
    if(status==='COMPLETED')await tx.trainingEnrollment.update({where:{id:current.enrollmentId},data:{status:'COMPLETED',completedAt:updated.completedAt}});
    return updated;});
  }

  addStage(trainingRecordId: string, stageType: string, deliveryMode: string, sequence: number) {
    return this.db.serializable(async tx=>{
    const record=await tx.trainingRecord.findUniqueOrThrow({where:{id:trainingRecordId},include:{enrollment:true,certificate:true}});
    if(!trainingRecordEditable(record))throw new ConflictException('السجل مغلق ولا يقبل تعديل الخطة.');
    const stage=await tx.trainingStage.create({
      data: { trainingRecordId, stageType, deliveryMode, sequence },
    });
    await tx.trainingRecord.update({where:{id:trainingRecordId},data:{updatedAt:new Date(Math.max(Date.now(),record.updatedAt.getTime()+1))}});return stage;});
  }

  addSkill(trainingStageId: string, skillCode: string, name: string) {
    return this.db.serializable(async tx=>{
    const stage=await tx.trainingStage.findUniqueOrThrow({where:{id:trainingStageId},include:{trainingRecord:{include:{enrollment:true,certificate:true}}}});
    if(!trainingRecordEditable(stage.trainingRecord))throw new ConflictException('السجل مغلق ولا يقبل تعديل الخطة.');
    const skill=await tx.trainingSkill.create({
      data: { trainingStageId, skillCode, name },
    });
    const record=await tx.trainingRecord.findUniqueOrThrow({where:{id:stage.trainingRecordId},include:{stages:{include:{skills:true}},sessions:true}});
    await tx.trainingRecord.update({where:{id:record.id},data:{progressPercent:trainingCompletion(record).progressPercent,updatedAt:new Date(Math.max(Date.now(),record.updatedAt.getTime()+1))}});return skill;});
  }

  async recommendCertificate(trainingRecordId: string, instructorAccountId: string) {
    return this.certificates.recommend(trainingRecordId,instructorAccountId);
  }

  assessSkill(id: string, status: string, instructorAccountId: string) {
    return this.progress.assessSkill(instructorAccountId,id,status);
  }

  createSession(id:string,input:Record<string,unknown>,actorId:string){return this.sessions.create(actorId,id,input,false);}

  setSessionAttendance(id:string,input:Record<string,unknown>,actorId:string){return this.sessions.act(actorId,id,input,'professional');}

  setSessionStatus(id:string,input:Record<string,unknown>,actorId:string){return this.sessions.legacyStatus(actorId,id,input);}
}

