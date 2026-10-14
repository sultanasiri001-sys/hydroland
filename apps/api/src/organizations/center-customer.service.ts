import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';

type CustomerRow = {customerId:string;displayName:string;bookingCount:bigint;pendingBookings:bigint;confirmedBookings:bigint;cancelledBookings:bigint;totalSeats:bigint;nonCancelledSeats:bigint;trainingCount:bigint;activeTraining:bigint;completedTraining:bigint;lastBookingAt:Date|null;lastTrainingAt:Date|null;lastActivityAt:Date};
@Injectable()
export class CenterCustomerService {
  constructor(private readonly db:DatabaseService) {}
  private async scope(tx:Prisma.TransactionClient,accountId:string){
    const role=await tx.roleAssignment.findFirst({where:{accountId,role:'DIVE_CENTER',status:'ACTIVE',account:{status:'ACTIVE'}}});
    if(!role)throw new ForbiddenException('يتطلب عرض العملاء دور مركز غوص نشطًا.');
    const member=await tx.organizationMember.findFirst({where:{accountId,status:'ACTIVE',role:{in:['OWNER','ADMIN']},organization:{kind:'DIVE_CENTER',status:'ACTIVE'}},orderBy:{createdAt:'asc'},select:{organizationId:true}});
    if(!member)throw new ForbiddenException('يتطلب عرض العملاء إدارة مركز غوص نشط.');return member.organizationId;
  }
  private page(value:unknown,fallback=1,max=100000){if(value===undefined)return fallback;if(typeof value!=='string'||!/^\d+$/.test(value)||!Number.isSafeInteger(Number(value))||Number(value)<1||Number(value)>max)throw new BadRequestException('رقم الصفحة أو حجمها غير صالح.');return Number(value);}
  private only(query:Record<string,unknown>,keys:string[]){if(Object.keys(query).some(key=>!keys.includes(key)))throw new BadRequestException('معايير عرض العملاء غير صالحة.');}
  // Aggregate all linked activity before paging. Native key joins work with both canonical TEXT and production UUID keys.
  private directory(organizationId:string){return Prisma.sql`
    WITH bookings AS (
      SELECT b."accountId"::text AS "customerId",COUNT(*)::bigint AS "bookingCount",
        COUNT(*) FILTER(WHERE b."status"='PENDING')::bigint AS "pendingBookings",
        COUNT(*) FILTER(WHERE b."status"='CONFIRMED')::bigint AS "confirmedBookings",
        COUNT(*) FILTER(WHERE b."status"='CANCELLED')::bigint AS "cancelledBookings",
        SUM(b."seats")::bigint AS "totalSeats",
        COALESCE(SUM(b."seats") FILTER(WHERE b."status"<>'CANCELLED' AND t."status"<>'CANCELLED'),0)::bigint AS "nonCancelledSeats",
        MAX(b."createdAt") AS "lastBookingAt"
      FROM "Booking" b JOIN "Trip" t ON t."id"=b."tripId"
      WHERE t."organizationId"::text=${organizationId} GROUP BY b."accountId"
    ),training AS (
      SELECT e."studentAccountId"::text AS "customerId",COUNT(*)::bigint AS "trainingCount",
        COUNT(*) FILTER(WHERE e."status" IN ('PENDING','ACTIVE','SUSPENDED'))::bigint AS "activeTraining",
        COUNT(*) FILTER(WHERE e."status"='COMPLETED')::bigint AS "completedTraining",MAX(e."enrolledAt") AS "lastTrainingAt"
      FROM "TrainingEnrollment" e WHERE e."centerOrganizationId"::text=${organizationId} GROUP BY e."studentAccountId"
    ),customers AS (
      SELECT COALESCE(b."customerId",e."customerId") AS "customerId",
        COALESCE(NULLIF(TRIM(CONCAT_WS(' ',p."firstName",p."lastName")),''),'عميل') AS "displayName",
        COALESCE(b."bookingCount",0)::bigint AS "bookingCount",COALESCE(b."pendingBookings",0)::bigint AS "pendingBookings",
        COALESCE(b."confirmedBookings",0)::bigint AS "confirmedBookings",COALESCE(b."cancelledBookings",0)::bigint AS "cancelledBookings",
        COALESCE(b."totalSeats",0)::bigint AS "totalSeats",COALESCE(b."nonCancelledSeats",0)::bigint AS "nonCancelledSeats",
        COALESCE(e."trainingCount",0)::bigint AS "trainingCount",COALESCE(e."activeTraining",0)::bigint AS "activeTraining",COALESCE(e."completedTraining",0)::bigint AS "completedTraining",
        b."lastBookingAt",e."lastTrainingAt",GREATEST(b."lastBookingAt",e."lastTrainingAt") AS "lastActivityAt"
      FROM bookings b FULL JOIN training e ON e."customerId"=b."customerId"
      JOIN "Account" a ON a."id"::text=COALESCE(b."customerId",e."customerId") JOIN "Person" p ON p."id"=a."personId"
    )`;
  }
  private output(row:CustomerRow){return {...row,bookingCount:Number(row.bookingCount),pendingBookings:Number(row.pendingBookings),confirmedBookings:Number(row.confirmedBookings),cancelledBookings:Number(row.cancelledBookings),totalSeats:Number(row.totalSeats),nonCancelledSeats:Number(row.nonCancelledSeats),trainingCount:Number(row.trainingCount),activeTraining:Number(row.activeTraining),completedTraining:Number(row.completedTraining)};}
  async list(accountId:string,query:Record<string,unknown>={}){
    this.only(query,['q','source','page','pageSize']);
    const requestedPage=this.page(query.page),pageSize=this.page(query.pageSize,20,50);
    if(query.q!==undefined&&(typeof query.q!=='string'||query.q.length>120))throw new BadRequestException('اكتب اسمًا لا يتجاوز 120 حرفًا.');
    const q=String(query.q??'').trim().replace(/\s+/g,' '),source=query.source??'ALL';
    if(typeof source!=='string'||!['ALL','BOOKING','TRAINING'].includes(source))throw new BadRequestException('مصدر العميل غير صالح.');
    const needle='%'+q.replace(/[\\%_]/g,'\\$&')+'%';
    return this.db.serializable(async tx=>{
      const organizationId=await this.scope(tx,accountId),cte=this.directory(organizationId);
      const filter=Prisma.sql`WHERE "displayName" ILIKE ${needle} AND (${source}='ALL' OR (${source}='BOOKING' AND "bookingCount">0) OR (${source}='TRAINING' AND "trainingCount">0))`;
      const counts=await tx.$queryRaw<Array<{total:bigint}>>`${cte} SELECT COUNT(*)::bigint AS total FROM customers ${filter}`;
      const total=Number(counts[0]?.total??0n),totalPages=Math.max(1,Math.ceil(total/pageSize)),page=Math.min(requestedPage,totalPages);
      const rows=total?await tx.$queryRaw<CustomerRow[]>`${cte} SELECT * FROM customers ${filter} ORDER BY "lastActivityAt" DESC,"customerId" ASC LIMIT ${pageSize} OFFSET ${(page-1)*pageSize}`:[];
      return {items:rows.map(row=>this.output(row)),total,page,pageSize,totalPages,q,source};
    });
  }
  async detail(accountId:string,customerId:string,query:Record<string,unknown>={}){
    this.only(query,['bookingsPage','trainingPage']);const requestedBookings=this.page(query.bookingsPage),requestedTraining=this.page(query.trainingPage),pageSize=20;
    return this.db.serializable(async tx=>{
      const organizationId=await this.scope(tx,accountId),cte=this.directory(organizationId);
      const rows=await tx.$queryRaw<CustomerRow[]>`${cte} SELECT * FROM customers WHERE "customerId"=${customerId} LIMIT 1`;
      if(!rows[0])throw new NotFoundException('العميل غير موجود ضمن حجوزات أو تدريب هذا المركز.');
      const customer=this.output(rows[0]),bookingsPages=Math.max(1,Math.ceil(customer.bookingCount/pageSize)),trainingPages=Math.max(1,Math.ceil(customer.trainingCount/pageSize)),bookingsPage=Math.min(requestedBookings,bookingsPages),trainingPage=Math.min(requestedTraining,trainingPages);
      const [bookings,training]=await Promise.all([
        tx.booking.findMany({where:{accountId:customerId,trip:{organizationId}},orderBy:[{createdAt:'desc'},{id:'asc'}],skip:(bookingsPage-1)*pageSize,take:pageSize,select:{id:true,status:true,seats:true,createdAt:true,trip:{select:{id:true,title:true,type:true,status:true,startsAt:true,endsAt:true}}}}),
        tx.trainingEnrollment.findMany({where:{studentAccountId:customerId,centerOrganizationId:organizationId},orderBy:[{enrolledAt:'desc'},{id:'asc'}],skip:(trainingPage-1)*pageSize,take:pageSize,select:{id:true,courseCode:true,status:true,enrolledAt:true,completedAt:true,record:{select:{status:true,progressPercent:true}}}}),
      ]);
      return {customer,bookings:{items:bookings,total:customer.bookingCount,page:bookingsPage,pageSize,totalPages:bookingsPages},training:{items:training,total:customer.trainingCount,page:trainingPage,pageSize,totalPages:trainingPages}};
    });
  }
}
