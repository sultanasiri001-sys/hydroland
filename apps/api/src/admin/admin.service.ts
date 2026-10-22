import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';

type AccountStatusValue='ACTIVE'|'SUSPENDED';
// Never return the account record itself: it also contains authentication secrets.
const accountView = {id:true,email:true,status:true,emailVerifiedAt:true,lastLoginAt:true,createdAt:true,updatedAt:true,
  person:{select:{firstName:true,lastName:true}},roleAssignments:{select:{role:true,status:true}}} as const;

@Injectable()
export class AdminService {
  constructor(private readonly db:DatabaseService,private readonly audit:AuditService){}

  async overview(){const [accounts,pending,openTrips,bookings,pendingOrganizations]=await Promise.all([this.db.account.count(),this.db.activationRequest.count({where:{status:{in:['SUBMITTED','UNDER_REVIEW','RESUBMITTED']}}}),this.db.trip.count({where:{status:'OPEN'}}),this.db.booking.count({where:{status:{in:['PENDING','CONFIRMED']}}}),this.db.organization.count({where:{status:'PENDING_REVIEW'}})]);return{accounts,pendingReviews:pending,openTrips,activeBookings:bookings,pendingOrganizations}}

  queue(){return this.db.activationRequest.findMany({where:{status:{in:['SUBMITTED','UNDER_REVIEW','RESUBMITTED']}},include:{applicant:{select:{id:true,email:true}},roleAssignment:true},orderBy:{createdAt:'asc'}})}

  private async requireAdminRole(accountId:string,tx:Prisma.TransactionClient=this.db){
    const account=await tx.account.findFirst({where:{id:accountId,status:'ACTIVE',emailVerifiedAt:{not:null},roleAssignments:{some:{role:'ADMIN',status:'ACTIVE'}}},select:{id:true,personId:true}});
    if(!account)throw new ForbiddenException('Active verified ADMIN account required.');
    return account;
  }

  async listAccounts(adminAccountId:string,input:{cursor?:string;search?:string}={}){
    if(input.search!==undefined&&typeof input.search!=='string'||input.cursor!==undefined&&typeof input.cursor!=='string')throw new BadRequestException('Invalid account search.');
    const search=typeof input.search==='string'?input.search.trim():'';
    if(search.length>120||input.cursor&&(!/^[a-zA-Z0-9-]{1,100}$/.test(input.cursor)))throw new BadRequestException('Invalid account search.');
    return this.db.serializable(async tx=>{
      await this.requireAdminRole(adminAccountId,tx);
      const rows=await tx.account.findMany({where:search?{OR:[{email:{contains:search,mode:'insensitive'}},{person:{firstName:{contains:search,mode:'insensitive'}}},{person:{lastName:{contains:search,mode:'insensitive'}}}]}:undefined,
        select:accountView,orderBy:{id:'asc'},take:51,...(input.cursor?{cursor:{id:input.cursor},skip:1}:{})});
      return {items:rows.slice(0,50).map(row=>({...row,isCurrentAccount:row.id===adminAccountId})),nextCursor:rows.length>50?rows[49].id:null};
    });
  }

  async setAccountStatus(adminAccountId:string,accountId:string,status:AccountStatusValue,reason:unknown,expectedUpdatedAt:unknown,reviewed:unknown){
    if(!['ACTIVE','SUSPENDED'].includes(status))throw new BadRequestException('Only suspension and reactivation are supported here.');
    if(typeof reason!=='string'||reason.trim().length<5||reason.trim().length>1000||reviewed!==true)throw new BadRequestException('Confirm the decision and provide a reason of 5–1000 characters.');
    if(typeof expectedUpdatedAt!=='string'||expectedUpdatedAt.length>40||!Number.isFinite(Date.parse(expectedUpdatedAt)))throw new BadRequestException('Current account revision required.');
    if(adminAccountId===accountId&&status==='SUSPENDED')throw new BadRequestException('Administrators cannot suspend their own account.');
    return this.db.serializable(async tx=>{
      // Serialize status decisions and lock identities/roles before rechecking authority.
      // Cast identifiers for both legacy TEXT and native UUID production schemas.
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext('hydroland.admin.account-status')::bigint)`;
      await tx.$queryRaw`SELECT "id" FROM "Account" WHERE "id"::text IN (${adminAccountId},${accountId}) ORDER BY "id" FOR UPDATE`;
      await tx.$queryRaw`SELECT "id" FROM "RoleAssignment" WHERE "accountId"::text IN (${adminAccountId},${accountId}) AND "role"='ADMIN' ORDER BY "id" FOR UPDATE`;
      const actor=await this.requireAdminRole(adminAccountId,tx);
      const account=await tx.account.findUnique({where:{id:accountId},select:accountView});
      if(!account)throw new NotFoundException('Account not found.');
      if(account.updatedAt.getTime()!==Date.parse(expectedUpdatedAt))throw new ConflictException('تغير الحساب؛ حدّث البيانات وراجع القرار مجددًا.');
      if(!['ACTIVE','SUSPENDED'].includes(account.status)||!account.emailVerifiedAt)throw new ConflictException('لا يمكن تجاوز التحقق من البريد أو إعادة حساب مؤرشف من هذه الشاشة.');
      if(account.status===status)return {...account,isCurrentAccount:accountId===adminAccountId,sessionsRevoked:false,revokedSessionCount:0};
      if(status==='SUSPENDED'&&account.roleAssignments.some(role=>role.role==='ADMIN'&&role.status==='ACTIVE')){
        const activeAdmins=await tx.account.count({where:{status:'ACTIVE',emailVerifiedAt:{not:null},roleAssignments:{some:{role:'ADMIN',status:'ACTIVE'}}}});
        if(activeAdmins<=1)throw new ConflictException('لا يمكن تعليق آخر حساب إدارة نشط.');
      }
      const updated=await tx.account.update({where:{id:accountId},data:{status},select:accountView});
      const revoked=await tx.session.updateMany({where:{accountId,revokedAt:null},data:{revokedAt:new Date()}});
      // Reactivation also invalidates any residual sessions; it requires a new login.
      await this.audit.record({actorId:actor.personId,action:'ACCOUNT_STATUS_CHANGED',resource:'Account',resourceId:accountId,metadata:{adminAccountId,previousStatus:account.status,status,reason:reason.trim(),sessionsRevoked:true,revokedSessionCount:revoked.count}},tx);
      return {...updated,isCurrentAccount:accountId===adminAccountId,sessionsRevoked:true,revokedSessionCount:revoked.count};
    });
  }
}
