import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
// Center scope is explicit: unassigned legacy trips remain outside every center portal.\nexport class DiveCenterPortalService {
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
