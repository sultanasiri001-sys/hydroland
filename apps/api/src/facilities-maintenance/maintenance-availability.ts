import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// Existing installations may not yet have C05. An absent table cannot hold a
// maintenance claim; a partially installed schema still fails closed below.
export async function blockingMaintenanceResources(tx:Prisma.TransactionClient,resourceIds:string[],excludeWorkOrderId?:string){
  if(!resourceIds.length)return [] as string[];
  const [schema]=await tx.$queryRaw<Array<{absent:boolean}>>`SELECT to_regclass('"MaintenanceWorkOrder"') IS NULL AS absent`;
  if(schema.absent)return [] as string[];
  const rows=await tx.$queryRaw<Array<{resourceId:string}>>(Prisma.sql`
    SELECT DISTINCT COALESCE(w."equipmentResourceId",m."calendarResourceId") AS "resourceId"
    FROM "MaintenanceWorkOrder" w LEFT JOIN "MarineAsset" m ON m."id"=w."marineAssetId"
    WHERE COALESCE(w."equipmentResourceId",m."calendarResourceId") IN (${Prisma.join([...new Set(resourceIds)])})
      AND (w."status" IN ('IN_PROGRESS','AWAITING_INSPECTION','INSPECTED') OR (w."status"='SCHEDULED' AND w."startsAt"<=clock_timestamp()))
      ${excludeWorkOrderId?Prisma.sql`AND w."id"<>${excludeWorkOrderId}`:Prisma.empty}`);
  return rows.map(row=>row.resourceId);
}
export async function assertMaintenanceAvailable(tx:Prisma.TransactionClient,resourceIds:string[],excludeWorkOrderId?:string){
  if((await blockingMaintenanceResources(tx,resourceIds,excludeWorkOrderId)).length)throw new ConflictException('الأصل قيد الصيانة ولم يعتمد فحصه وإقفاله.');
}
