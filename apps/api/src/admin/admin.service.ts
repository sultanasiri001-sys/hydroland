import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';

type AccountStatusValue='PENDING_VERIFICATION'|'ACTIVE'|'SUSPENDED'|'ARCHIVED';
const allowedStatuses:AccountStatusValue[]=['PENDING_VERIFICATION','ACTIVE','SUSPENDED','ARCHIVED'];

@Injectable()
export class AdminService {
  constructor(private readonly db:DatabaseService,private readonly audit:AuditService){}

  async overview(){const [accounts,pending,openTrips,bookings,pendingOrganizations]=await Promise.all([this.db.account.count(),this.db.activationRequest.count({where:{status:{in:['SUBMITTED','UNDER_REVIEW','RESUBMITTED']}}}),this.db.trip.count({where:{status:'OPEN'}}),this.db.booking.count({where:{status:{in:['PENDING','CONFIRMED']}}}),this.db.organization.count({where:{status:'PENDING_REVIEW'}})]);return{accounts,pendingReviews:pending,openTrips,activeBookings:bookings,pendingOrganizations}}

  queue(){return this.db.activationRequest.findMany({where:{status:{in:['SUBMITTED','UNDER_REVIEW','RESUBMITTED']}},include:{applicant:{select:{id:true,email:true}},roleAssignment:true},orderBy:{createdAt:'asc'}})}

  private async requireAdminRole(accountId:string){const role=await this.db.roleAssignment.findFirst({where:{accountId,role:'ADMIN',status:'ACTIVE'},select:{id:true}});if(!role)throw new ForbiddenException('Active ADMIN role required.');}

  async listAccounts(adminAccountId:string){await this.requireAdminRole(adminAccountId);return this.db.account.findMany({select:{id:true,email:true,status:true,emailVerifiedAt:true,lastLoginAt:true,createdAt:true,person:{select:{firstName:true,lastName:true}},roleAssignments:{select:{role:true,status:true}}},orderBy:{createdAt:'desc'},take:200})}

  async setAccountStatus(adminAccountId:string,accountId:string,status:AccountStatusValue,reason?:string){
    await this.requireAdminRole(adminAccountId);
    if(!allowedStatuses.includes(status))throw new BadRequestException('Invalid account status.');
    if(adminAccountId===accountId&&(status==='SUSPENDED'||status==='ARCHIVED'))throw new BadRequestException('Administrators cannot suspend or archive their own account.');
    const account=await this.db.account.findUnique({where:{id:accountId},select:{id:true,status:true,email:true}});
    if(!account)throw new NotFoundException('Account not found.');
    if(account.status===status)return account;
    if((status==='SUSPENDED'||status==='ARCHIVED')&&(!reason?.trim()||reason.trim().length<5))throw new BadRequestException('A reason of at least five characters is required.');
    const updated=await this.db.$transaction(async(tx:Prisma.TransactionClient)=>{
      const row=await tx.account.update({where:{id:accountId},data:{status:status as never}});
      if(status==='SUSPENDED'||status==='ARCHIVED')await tx.session.updateMany({where:{accountId,revokedAt:null},data:{revokedAt:new Date()}});
      return row;
    });
    await this.audit.record({actorId:adminAccountId,action:'ACCOUNT_STATUS_CHANGED',resource:'Account',resourceId:accountId,metadata:{adminAccountId,previousStatus:account.status,status,reason:reason?.trim()||null,email:account.email,sessionsRevoked:status==='SUSPENDED'||status==='ARCHIVED'}});
    return{...updated,sessionsRevoked:status==='SUSPENDED'||status==='ARCHIVED'};
  }
}
