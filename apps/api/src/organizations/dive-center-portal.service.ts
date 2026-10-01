import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class DiveCenterPortalService {
  constructor(private readonly db: DatabaseService) {}

  private async managedCenter(accountId: string) {
    const membership=await this.db.organizationMember.findFirst({
      where:{accountId,status:'ACTIVE',role:{in:['OWNER','ADMIN']},organization:{kind:{contains:'DIVE',mode:'insensitive'},status:'ACTIVE'}},
      select:{organization:{select:{id:true,displayName:true,legalName:true,registrationNumber:true,regionCode:true,status:true,documentBrandNameAr:true,documentBrandNameEn:true}}},
      orderBy:{createdAt:'asc'},
    });
    if(!membership)throw new ForbiddenException('Active dive-center manager membership required.');
    return membership.organization;
  }

  async overview(accountId:string){
    const center=await this.managedCenter(accountId);
    const [newBookings,tripsToday,memberCount,tripCount]=await Promise.all([
      this.db.booking.count({where:{trip:{organizationId:center.id},status:'PENDING'}}),
      this.db.trip.count({where:{organizationId:center.id,startsAt:{gte:new Date(new Date().setHours(0,0,0,0)),lt:new Date(new Date().setHours(24,0,0,0))},status:{in:['DRAFT','OPEN','CLOSED']}}}),
      this.db.organizationMember.count({where:{organizationId:center.id,status:'ACTIVE'}}),
      this.db.trip.count({where:{organizationId:center.id}}),
    ]);
    return {center,metrics:{newBookings,tripsToday,activeMembers:memberCount,totalTrips:tripCount}};
  }

  async team(accountId:string){
    const center=await this.managedCenter(accountId);
    const members=await this.db.organizationMember.findMany({where:{organizationId:center.id,status:{in:['ACTIVE','PENDING','SUSPENDED']}},select:{id:true,role:true,status:true,createdAt:true,account:{select:{person:{select:{firstName:true,lastName:true,professional:{select:{headline:true,regionCode:true}},credentials:{select:{verificationStatus:true},take:20}}},roleAssignments:{where:{role:'INSTRUCTOR'},select:{status:true,activeAt:true}}}}},orderBy:{createdAt:'asc'}});
    return members.map(member=>({membershipId:member.id,role:member.role,status:member.status,person:{displayName:[member.account.person.firstName,member.account.person.lastName].filter(Boolean).join(' ').trim()||'عضو',headline:member.account.person.professional?.headline??null,regionCode:member.account.person.professional?.regionCode??null},professional:{instructorStatus:member.account.roleAssignments[0]?.status??null,instructorActiveAt:member.account.roleAssignments[0]?.activeAt??null,verifiedCredentials:member.account.person.credentials.filter(item=>['VERIFIED','DOCUMENT_VERIFIED'].includes(item.verificationStatus)).length}}));
  }

  async professionals(accountId:string){
    const center=await this.managedCenter(accountId);
    const memberships=await this.db.organizationMember.findMany({where:{organizationId:center.id,status:'ACTIVE',role:'INSTRUCTOR',account:{roleAssignments:{some:{role:'INSTRUCTOR',status:'ACTIVE'}}}},select:{accountId:true,account:{select:{person:{select:{firstName:true,lastName:true,professional:{select:{headline:true,regionCode:true}},credentials:{select:{verificationStatus:true},take:20}}}}}}});
    const ids=memberships.map(row=>row.accountId);
    const assignmentCounts=ids.length?await this.db.trainingEnrollment.groupBy({by:['instructorAccountId'],where:{centerOrganizationId:center.id,instructorAccountId:{in:ids},status:{in:['ACTIVE','COMPLETED']}},_count:{_all:true}}):[];
    const counts=new Map(assignmentCounts.map(row=>[row.instructorAccountId,row._count._all]));
    return memberships.map(row=>({accountId:row.accountId,displayName:[row.account.person.firstName,row.account.person.lastName].filter(Boolean).join(' ').trim()||'محترف غوص',headline:row.account.person.professional?.headline??null,regionCode:row.account.person.professional?.regionCode??null,verifiedCredentials:row.account.person.credentials.filter(item=>['VERIFIED','DOCUMENT_VERIFIED'].includes(item.verificationStatus)).length,assignedTrainingCount:counts.get(row.accountId)||0}));
  }

  async trips(accountId:string){
    const center=await this.managedCenter(accountId);
    return this.db.trip.findMany({
      where:{organizationId:center.id},
      select:{id:true,title:true,type:true,startsAt:true,endsAt:true,capacity:true,status:true,_count:{select:{bookings:true}}},
      orderBy:{startsAt:'desc'},take:200,
    });
  }

  async bookings(accountId:string,tripId:string){
    const center=await this.managedCenter(accountId);
    const trip=await this.db.trip.findFirst({where:{id:tripId,organizationId:center.id},select:{id:true}});
    if(!trip)throw new NotFoundException('Trip not found in managed dive center.');
    return this.db.booking.findMany({where:{tripId},select:{id:true,status:true,seats:true,createdAt:true,account:{select:{person:{select:{firstName:true,lastName:true}}}},participants:{select:{id:true,fullName:true,eligibilityStatus:true}}},orderBy:{createdAt:'desc'}});
  }
}
