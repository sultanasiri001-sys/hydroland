import { ForbiddenException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { instructorCenterScope } from './training-center-scope';

@Injectable()
export class TrainingProfessionalProfileService {
  constructor(private readonly db: DatabaseService) {}

  private async requireActiveInstructor(accountId: string): Promise<{ status: string; activeAt: Date | null }> {
    const role = await this.db.roleAssignment.findUnique({
      where: { accountId_role: { accountId, role: 'INSTRUCTOR' } },
      select: { status: true, activeAt: true, account:{select:{status:true}} },
    });
    if (!role || role.status !== 'ACTIVE' || role.account.status !== 'ACTIVE') throw new ForbiddenException('Active instructor role required.');
    return role;
  }

  async earnings(accountId: string) {
    await this.requireActiveInstructor(accountId);
    const rows=await this.db.instructorEarning.findMany({
      where:{instructorAccountId:accountId},
      select:{id:true,amountMinor:true,currency:true,status:true,approvedAt:true,settledAt:true,createdAt:true,trainingEnrollment:{select:{courseCode:true}}},
      orderBy:{createdAt:'desc'},take:200,
    });
    const totals=rows.reduce((acc,row)=>{acc[row.status]=(acc[row.status]||0)+row.amountMinor;return acc;},{} as Record<string,number>);
    return {currency:'SAR',totals:{pendingMinor:totals.PENDING||0,approvedMinor:totals.APPROVED||0,settledMinor:totals.SETTLED||0},entries:rows.map(row=>({id:row.id,courseCode:row.trainingEnrollment.courseCode,amountMinor:row.amountMinor,currency:row.currency,status:row.status,approvedAt:row.approvedAt,settledAt:row.settledAt,createdAt:row.createdAt}))};
  }

  async listCertificateReadiness(accountId: string) {
    await this.requireActiveInstructor(accountId);
    const scope=await instructorCenterScope(this.db,accountId);
    const records = await this.db.trainingRecord.findMany({
      where: { enrollment: { instructorAccountId: accountId, ...scope } },
      select: { id:true,status:true,progressPercent:true,enrollment:{select:{courseCode:true,studentAccountId:true}},stages:{select:{skills:{select:{status:true,signedOffByInstructorId:true}}}},sessions:{select:{status:true}},certificate:{select:{id:true,status:true,recommendedAt:true,issuedAt:true,certificateNumber:true}} },
      orderBy:{updatedAt:'desc'},take:200,
    });
    const studentIds=[...new Set(records.map(row=>row.enrollment.studentAccountId))];
    const students=studentIds.length?await this.db.account.findMany({where:{id:{in:studentIds}},select:{id:true,person:{select:{firstName:true,lastName:true}}}}):[];
    const names=new Map(students.map(student=>[student.id,[student.person.firstName,student.person.lastName].filter(Boolean).join(' ').trim()||'طالب']));
    return records.map(record=>{const skills=record.stages.flatMap(stage=>stage.skills);const ready=record.status==='COMPLETED'&&record.progressPercent===100&&skills.length>0&&skills.every(skill=>skill.status==='COMPETENT'&&skill.signedOffByInstructorId===accountId)&&record.sessions.every(session=>['COMPLETED','CANCELLED'].includes(session.status));return {trainingRecordId:record.id,courseCode:record.enrollment.courseCode,student:{displayName:names.get(record.enrollment.studentAccountId)||'طالب'},readyForRecommendation:ready,certificate:record.certificate};});
  }

  async listSkills(accountId: string) {
    await this.requireActiveInstructor(accountId);
    const scope=await instructorCenterScope(this.db,accountId);
    const stages = await this.db.trainingStage.findMany({
      where: { trainingRecord: { enrollment: { instructorAccountId: accountId, ...scope } } },
      select: {
        id: true, stageType: true, sequence: true,
        trainingRecord: { select: { enrollment: { select: { courseCode: true, studentAccountId: true } } } },
        skills: { select: { id: true, skillCode: true, name: true, status: true, signedOffAt: true }, orderBy: { createdAt: 'asc' } },
      },
      orderBy: { sequence: 'asc' },
      take: 200,
    });
    const studentIds=[...new Set(stages.map(row=>row.trainingRecord.enrollment.studentAccountId))];
    const students=studentIds.length?await this.db.account.findMany({where:{id:{in:studentIds}},select:{id:true,person:{select:{firstName:true,lastName:true}}}}):[];
    const names=new Map(students.map(student=>[student.id,[student.person.firstName,student.person.lastName].filter(Boolean).join(' ').trim()||'طالب']));
    return stages.flatMap(stage=>stage.skills.map(skill=>({
      ...skill,stageType:stage.stageType,courseCode:stage.trainingRecord.enrollment.courseCode,
      student:{displayName:names.get(stage.trainingRecord.enrollment.studentAccountId)||'طالب'},
    })));
  }

  async listSchedule(accountId: string) {
    await this.requireActiveInstructor(accountId);
    const scope=await instructorCenterScope(this.db,accountId);
    const sessions = await this.db.trainingSession.findMany({
      where: { instructorAccountId: accountId, trainingRecord:{enrollment:scope} },
      select: {
        id: true, trainingRecordId: true, status: true, startsAt: true, endsAt: true,
        facilityOrSiteId: true, tripId: true, vesselId: true, evidence: true,
        trainingRecord: { select: { enrollment: { select: { courseCode: true, studentAccountId: true, instructorAccountId: true } } } },
      },
      orderBy: { startsAt: 'asc' },
      take: 200,
    });
    const studentIds=[...new Set(sessions.map(row=>row.trainingRecord.enrollment.studentAccountId))];
    const students=studentIds.length?await this.db.account.findMany({
      where:{id:{in:studentIds}},select:{id:true,person:{select:{firstName:true,lastName:true}}},
    }):[];
    const names=new Map(students.map(student=>[student.id,[student.person.firstName,student.person.lastName].filter(Boolean).join(' ').trim()||'طالب']));
    return sessions.map(row=>({
      id:row.id,courseCode:row.trainingRecord.enrollment.courseCode,
      student:{displayName:names.get(row.trainingRecord.enrollment.studentAccountId)||'طالب'},
      status:row.status,startsAt:row.startsAt,endsAt:row.endsAt,
      facilityOrSiteId:row.facilityOrSiteId,tripId:row.tripId,vesselId:row.vesselId,
      attendance:{
        instructorCheckedIn:Boolean(row.evidence&&typeof row.evidence==='object'&&!Array.isArray(row.evidence)&&(row.evidence as Record<string,unknown>).instructorCheckInAt),
        studentCheckedIn:Boolean(row.evidence&&typeof row.evidence==='object'&&!Array.isArray(row.evidence)&&(row.evidence as Record<string,unknown>).studentCheckInAt),
      },
    }));
  }

  async listAssignments(accountId: string) {
    await this.requireActiveInstructor(accountId);
    const scope=await instructorCenterScope(this.db,accountId);
    const rows = await this.db.trainingEnrollment.findMany({
      where: { instructorAccountId: accountId, ...scope },
      select: {
        id: true, studentAccountId: true, courseCode: true, status: true, enrolledAt: true, completedAt: true,
        record: { select: { status: true, progressPercent: true,
          sessions: { where: { instructorAccountId: accountId }, select: { id: true, startsAt: true, status: true }, orderBy: { startsAt: 'asc' }, take: 20 } } },
      },
      orderBy: { enrolledAt: 'desc' }, take: 200,
    });
    const studentIds=[...new Set(rows.map(row=>row.studentAccountId))];
    const students=studentIds.length?await this.db.account.findMany({
      where:{id:{in:studentIds}},select:{id:true,person:{select:{firstName:true,lastName:true}}}
    }):[];
    const names=new Map(students.map(student=>[student.id,[student.person.firstName,student.person.lastName].filter(Boolean).join(' ').trim()||'طالب']));
    return rows.map(row=>({
      enrollmentId:row.id,courseCode:row.courseCode,status:row.status,enrolledAt:row.enrolledAt,completedAt:row.completedAt,
      student:{displayName:names.get(row.studentAccountId)||'طالب'},
      record:row.record?{status:row.record.status,progressPercent:row.record.progressPercent,sessions:row.record.sessions}:null,
    }));
  }

  async get(accountId: string) {
    const role = await this.requireActiveInstructor(accountId);
    const scope=await instructorCenterScope(this.db,accountId);

    const account = await this.db.account.findUnique({
      where: { id: accountId },
      select: {
        status: true,
        person: {
          select: {
            firstName: true,
            lastName: true,
            professional: { select: { headline: true, bio: true, regionCode: true } },
            credentials: {
              select: { id: true, issuer: true, title: true, issuedAt: true, expiresAt: true, verificationStatus: true },
              orderBy: { updatedAt: 'desc' },
              take: 50,
            },
          },
        },
      },
    });
    if (!account || account.status !== 'ACTIVE') throw new ForbiddenException('Active account required.');

    const [studentRows, sessionsToday, completedSessions] = await Promise.all([
      this.db.trainingEnrollment.findMany({
        where: { instructorAccountId: accountId, ...scope, status: { in: ['ACTIVE', 'COMPLETED'] } },
        select: { studentAccountId: true },
        distinct: ['studentAccountId'],
      }),
      this.db.trainingSession.count({
        where: {
          instructorAccountId: accountId,
          trainingRecord:{enrollment:scope},
          startsAt: { gte: new Date(new Date().setHours(0,0,0,0)), lt: new Date(new Date().setHours(24,0,0,0)) },
          status: { in: ['SCHEDULED','CHECK_IN_OPEN','IN_PROGRESS'] },
        },
      }),
      this.db.trainingSession.count({ where: { instructorAccountId: accountId, status: 'COMPLETED', trainingRecord:{enrollment:scope} } }),
    ]);

    const credentials = account.person.credentials.map(item => ({
      id: item.id, issuer: item.issuer, title: item.title, issuedAt: item.issuedAt,
      expiresAt: item.expiresAt, verificationStatus: item.verificationStatus,
    }));
    return {
      profile: {
        displayName: [account.person.firstName, account.person.lastName].filter(Boolean).join(' ').trim(),
        headline: account.person.professional?.headline ?? null,
        bio: account.person.professional?.bio ?? null,
        regionCode: account.person.professional?.regionCode ?? null,
        instructorActiveAt: role.activeAt,
      },
      credentials,
      metrics: {
        activeStudents: studentRows.length,
        sessionsToday,
        completedSessions,
        verifiedCredentials: credentials.filter(item => ['VERIFIED','DOCUMENT_VERIFIED'].includes(item.verificationStatus)).length,
      },
      privacy: {
        excludesMedicalData: true,
        excludesIdentityData: true,
        excludesEmergencyContacts: true,
      },
    };
  }
}
