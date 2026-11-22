import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';

export async function completedTripHistory(db:DatabaseService, accountId:string, role:string, page:number) {
  if (!['instructor','boat'].includes(role) || !Number.isSafeInteger(page) || page<1 || page>100000)
    throw new BadRequestException('طلب سجل الرحلات غير صالح.');
  const instructor=role==='instructor';
  return db.$transaction(async tx=>{
    const active=await tx.roleAssignment.findFirst({where:{accountId,role:instructor?'INSTRUCTOR':'BOAT_OWNER',status:'ACTIVE',account:{status:'ACTIVE'}},select:{id:true}});
    if(!active) throw new ForbiddenException();
    const taught=Prisma.sql`SELECT DISTINCT e."studentAccountId",s."tripId" FROM "TrainingSession" s
      JOIN "TrainingRecord" r ON r.id=s."trainingRecordId" JOIN "TrainingEnrollment" e ON e.id=r."enrollmentId"
      WHERE s."instructorAccountId"=${accountId} AND s.status='COMPLETED'`;
    const tripScope=instructor?Prisma.sql`
      EXISTS (SELECT 1 FROM taught WHERE taught."tripId"=t.id::text)
      OR EXISTS (SELECT 1 FROM "CrewAssignment" c WHERE c."tripId"=t.id AND c."accountId"::text=${accountId}
        AND c."roleType"='INSTRUCTOR' AND c.status='ACCEPTED')`:Prisma.sql`
      EXISTS (SELECT 1 FROM "OrganizationMember" m JOIN "Organization" op ON op.id=m."organizationId"
        WHERE m."accountId"::text=${accountId} AND m.status='ACTIVE' AND m.role IN ('OWNER','ADMIN','OPERATOR','STAFF') AND op.status='ACTIVE' AND op.kind='MARINE_OPERATOR'
          AND (v."organizationId"::text=op.id::text OR (t."marineAssetId" IS NULL AND t."organizationId"=op.id)))`;
    const counts=instructor?Prisma.sql`SELECT "tripId",count(DISTINCT "studentAccountId")::int AS n FROM taught GROUP BY "tripId"`:
      Prisma.sql`SELECT d."sourceTripId" AS "tripId",count(DISTINCT d."sourceParticipantId")::int AS n
        FROM "DiveLog" d JOIN eligible t ON t.id=d."sourceTripId" WHERE d."sourceParticipantId" IS NOT NULL GROUP BY d."sourceTripId"`;
    const overall=instructor?Prisma.sql`SELECT count(DISTINCT "studentAccountId") FROM taught`:
      Prisma.sql`SELECT COALESCE(sum(n),0) FROM counts`;
    const [result]=await tx.$queryRaw<Array<{tripCount:number;peopleCount:number;items:Array<{id:string;title:string;startsAt:string;peopleCount:number}>}>>`
      WITH taught AS (${instructor?taught:Prisma.sql`SELECT NULL::text AS "studentAccountId",NULL::text AS "tripId" WHERE FALSE`}),
      eligible AS (SELECT t.id,t.title,t."startsAt" FROM "Trip" t LEFT JOIN "MarineAsset" v ON v.id=t."marineAssetId"
        WHERE t.status='COMPLETED' AND (${tripScope})), counts AS (${counts}),
      page_rows AS (SELECT t.id,t.title,t."startsAt" AT TIME ZONE 'UTC' AS "startsAt",COALESCE(c.n,0) AS "peopleCount" FROM eligible t LEFT JOIN counts c ON c."tripId"::text=t.id::text
        ORDER BY t."startsAt" DESC,t.id LIMIT 20 OFFSET ${(page-1)*20})
      SELECT (SELECT count(*) FROM eligible)::int AS "tripCount",(${overall})::int AS "peopleCount",
        COALESCE((SELECT json_agg(page_rows ORDER BY "startsAt" DESC,id) FROM page_rows),'[]'::json) AS items`;
    return {...result,page,pageSize:20};
  },{isolationLevel:'RepeatableRead'});
}
