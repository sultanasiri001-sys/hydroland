import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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

  async equipment(accountId:string){
    const center=await this.managedCenter(accountId);
    return this.db.$queryRaw<Array<{resourceId:string;assetCode:string;serialNumber:string|null;sku:string|null;location:string|null;stockStatus:string;resourceName:string;active:boolean}>>`
      SELECT b."resourceId",b."assetCode",b."serialNumber",b."sku",b."location",b."stockStatus",r."name" AS "resourceName",r."active"
      FROM "EquipmentBarcode" b JOIN "CalendarResource" r ON r."id"=b."resourceId"
      WHERE b."organizationId"=${center.id}::uuid AND r."type"='EQUIPMENT'
      ORDER BY r."name",b."assetCode"`;
  }

  async moveEquipment(accountId:string,resourceId:string,input:{movementType?:string;toLocation?:string|null;tripId?:string|null;notes?:string|null}){
    const center=await this.managedCenter(accountId);
    const owned=await this.db.$queryRaw<Array<{resourceId:string;stockStatus:string;location:string|null}>>`SELECT "resourceId","stockStatus","location" FROM "EquipmentBarcode" WHERE "resourceId"=${resourceId} AND "organizationId"=${center.id}::uuid LIMIT 1`;
    if(!owned.length)throw new NotFoundException('Equipment not found in managed dive center.');
    const allowed=['CHECK_IN','CHECK_OUT','TRANSFER','MAINTENANCE','QUARANTINE','RELEASE','RETIRE'];if(!input.movementType||!allowed.includes(input.movementType))throw new BadRequestException('Invalid equipment movement type.');
    if(input.tripId){const trip=await this.db.trip.findFirst({where:{id:input.tripId,organizationId:center.id},select:{id:true,status:true}});if(!trip)throw new NotFoundException('Trip not found in managed dive center.');if(['CANCELLED','COMPLETED'].includes(trip.status))throw new ConflictException('Equipment cannot be assigned to a closed trip.');}
    const current=owned[0];if(current.stockStatus==='RETIRED')throw new ConflictException('Retired equipment cannot return to circulation.');
    if(input.movementType==='CHECK_OUT'&&current.stockStatus!=='AVAILABLE')throw new ConflictException('Only available equipment can be checked out.');
    if(input.movementType==='CHECK_IN'&&current.stockStatus!=='CHECKED_OUT')throw new ConflictException('Only checked-out equipment can be checked in.');
    if(input.movementType==='RELEASE'&&!['MAINTENANCE','QUARANTINED'].includes(current.stockStatus))throw new ConflictException('Only maintained or quarantined equipment can be released.');
    const next=input.movementType==='TRANSFER'?current.stockStatus:input.movementType==='CHECK_OUT'?'CHECKED_OUT':input.movementType==='MAINTENANCE'?'MAINTENANCE':input.movementType==='QUARANTINE'?'QUARANTINED':input.movementType==='RETIRE'?'RETIRED':'AVAILABLE';
    return this.db.serializable(async tx=>{const latest=await tx.$queryRaw<Array<{stockStatus:string;location:string|null}>>`SELECT "stockStatus","location" FROM "EquipmentBarcode" WHERE "resourceId"=${resourceId} AND "organizationId"=${center.id}::uuid FOR UPDATE`;if(!latest.length||latest[0].stockStatus!==current.stockStatus)throw new ConflictException('Equipment state changed. Refresh and retry.');const rows=await tx.$queryRaw`INSERT INTO "EquipmentMovement"("id","resourceId","movementType","fromLocation","toLocation","tripId","assignedAccountId","notes","actorAccountId","occurredAt") VALUES(gen_random_uuid()::text,${resourceId},${input.movementType},${latest[0].location},${input.toLocation??null},${input.tripId??null},NULL,${input.notes??null},${accountId},NOW()) RETURNING *`;await tx.$executeRaw`UPDATE "EquipmentBarcode" SET "stockStatus"=${next},"location"=COALESCE(${input.toLocation??null},"location"),"updatedAt"=NOW() WHERE "resourceId"=${resourceId} AND "organizationId"=${center.id}::uuid`;return{movement:(rows as any[])[0],stockStatus:next}});
  }

  async equipmentHistory(accountId:string,resourceId:string){
    const center=await this.managedCenter(accountId);
    const owned=await this.db.$queryRaw<Array<{resourceId:string}>>`SELECT "resourceId" FROM "EquipmentBarcode" WHERE "resourceId"=${resourceId} AND "organizationId"=${center.id}::uuid LIMIT 1`;
    if(!owned.length)throw new NotFoundException('Equipment not found in managed dive center.');
    return this.db.$queryRaw`SELECT "id","movementType","fromLocation","toLocation","tripId","assignedAccountId","notes","occurredAt" FROM "EquipmentMovement" WHERE "resourceId"=${resourceId} ORDER BY "occurredAt" DESC LIMIT 200`;
  }

  async customers(accountId:string){
    const center=await this.managedCenter(accountId);
    const bookings=await this.db.booking.findMany({where:{trip:{organizationId:center.id}},select:{accountId:true,status:true,seats:true,createdAt:true,account:{select:{person:{select:{firstName:true,lastName:true}}}}},orderBy:{createdAt:'desc'},take:1000});
    const grouped=new Map<string,{displayName:string;bookingCount:number;confirmedBookings:number;totalSeats:number;lastBookingAt:Date}>();
    for(const booking of bookings){const current=grouped.get(booking.accountId)??{displayName:[booking.account.person.firstName,booking.account.person.lastName].filter(Boolean).join(' ').trim()||'عميل',bookingCount:0,confirmedBookings:0,totalSeats:0,lastBookingAt:booking.createdAt};current.bookingCount+=1;current.totalSeats+=booking.seats;if(booking.status==='CONFIRMED')current.confirmedBookings+=1;if(booking.createdAt>current.lastBookingAt)current.lastBookingAt=booking.createdAt;grouped.set(booking.accountId,current)}
    return [...grouped.values()].sort((a,b)=>b.lastBookingAt.getTime()-a.lastBookingAt.getTime());
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
