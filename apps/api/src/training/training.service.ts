import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../database/database.service';

type Course = { id:string; title:string; description:string|null; level:string|null; capacity:number; status:string; instructorAccountId:string; createdAt:Date; updatedAt:Date };
type Enrollment = { id:string; courseId:string; accountId:string; status:string; createdAt:Date; updatedAt:Date; completedAt:Date|null };

@Injectable()
export class TrainingService {
  constructor(private readonly db:DatabaseService) {}

  courses() {
    return this.db.$queryRaw<Course[]>`SELECT * FROM "TrainingCourse" WHERE "status"::text = 'PUBLISHED' ORDER BY "createdAt" DESC`;
  }

  async mine(accountId:string) {
    return this.db.$queryRaw<Array<Enrollment & { course: Course }>>(Prisma.sql`
      SELECT e.*, json_build_object('id',c.id,'title',c.title,'description',c.description,'level',c.level,'capacity',c.capacity,'status',c.status) AS course
      FROM "TrainingEnrollment" e JOIN "TrainingCourse" c ON c.id=e."courseId"
      WHERE e."accountId"=${accountId}::uuid ORDER BY e."createdAt" DESC
    `);
  }

  async enroll(accountId:string, courseId:string) {
    const rows = await this.db.$queryRaw<Course[]>(Prisma.sql`SELECT * FROM "TrainingCourse" WHERE id=${courseId}::uuid LIMIT 1`);
    const course = rows[0];
    if (!course || course.status !== 'PUBLISHED') throw new NotFoundException('Course not available.');
    const counts = await this.db.$queryRaw<Array<{count:bigint}>>(Prisma.sql`SELECT COUNT(*)::bigint AS count FROM "TrainingEnrollment" WHERE "courseId"=${courseId}::uuid AND "status"::text IN ('ENROLLED','ACTIVE')`);
    if (Number(counts[0]?.count || 0) >= course.capacity) throw new BadRequestException('Course is full.');
    const id=randomUUID();
    const result=await this.db.$queryRaw<Enrollment[]>(Prisma.sql`
      INSERT INTO "TrainingEnrollment" (id,"courseId","accountId",status,"createdAt","updatedAt")
      VALUES (${id}::uuid,${courseId}::uuid,${accountId}::uuid,'ENROLLED',NOW(),NOW())
      ON CONFLICT ("courseId","accountId") DO UPDATE SET status='ENROLLED',"updatedAt"=NOW()
      RETURNING *
    `);
    return result[0];
  }

  async createCourse(accountId:string,input:{title:string;description?:string;level?:string;capacity?:number}) {
    const role=await this.db.roleAssignment.findFirst({where:{accountId,role:{in:['INSTRUCTOR','ADMIN']},status:'ACTIVE'}});
    if(!role) throw new ForbiddenException('Active instructor role required.');
    const title=input.title?.trim();
    if(!title) throw new BadRequestException('Course title required.');
    const capacity=Number.isInteger(input.capacity)&&Number(input.capacity)>0&&Number(input.capacity)<=500?Number(input.capacity):20;
    const id=randomUUID();
    const rows=await this.db.$queryRaw<Course[]>(Prisma.sql`
      INSERT INTO "TrainingCourse" (id,title,description,level,capacity,status,"instructorAccountId","createdAt","updatedAt")
      VALUES (${id}::uuid,${title},${input.description?.trim()||null},${input.level?.trim()||null},${capacity},'PUBLISHED',${accountId}::uuid,NOW(),NOW()) RETURNING *
    `);
    return rows[0];
  }
}
