import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
@Injectable()
export class TrainingService {
 constructor(private readonly db:DatabaseService){}
 courses(){return this.db.trainingCourse.findMany({where:{status:'PUBLISHED'},orderBy:{createdAt:'desc'}})}
 mine(accountId:string){return this.db.trainingEnrollment.findMany({where:{accountId},include:{course:true},orderBy:{createdAt:'desc'}})}
 async enroll(accountId:string,courseId:string){const c=await this.db.trainingCourse.findUnique({where:{id:courseId}});if(!c||c.status!=='PUBLISHED')throw new NotFoundException('Course not available.');const count=await this.db.trainingEnrollment.count({where:{courseId,status:{in:['ENROLLED','ACTIVE']}}});if(count>=c.capacity)throw new BadRequestException('Course is full.');return this.db.trainingEnrollment.upsert({where:{courseId_accountId:{courseId,accountId}},create:{courseId,accountId},update:{status:'ENROLLED'}})}
 async createCourse(accountId:string,input:{title:string;description?:string;level?:string;capacity?:number}){const role=await this.db.roleAssignment.findFirst({where:{accountId,role:{in:['INSTRUCTOR','ADMIN']},status:'ACTIVE'}});if(!role)throw new ForbiddenException('Active instructor role required.');const title=input.title?.trim();if(!title)throw new BadRequestException('Course title required.');const capacity=Number.isInteger(input.capacity)&&Number(input.capacity)>0&&Number(input.capacity)<=500?Number(input.capacity):20;return this.db.trainingCourse.create({data:{title,description:input.description?.trim()||null,level:input.level?.trim()||null,capacity,instructorAccountId:accountId,status:'PUBLISHED'}})}
}
