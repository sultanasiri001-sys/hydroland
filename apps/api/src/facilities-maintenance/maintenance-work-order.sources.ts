import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Actor, AssetKind, AssetSource, identifier, MAINTENANCE_DEPARTMENT, WorkOrder } from './maintenance-work-order.domain';

export async function maintenanceActor(tx:Prisma.TransactionClient,organizationId:string,accountId:string):Promise<Actor> {
  const [org,account,member]=await Promise.all([
    tx.organization.findFirst({where:{id:organizationId,status:'ACTIVE'},select:{ownerId:true,kind:true}}),
    tx.account.findFirst({where:{id:accountId,status:'ACTIVE',emailVerifiedAt:{not:null},roleAssignments:{some:{status:'ACTIVE'}}},select:{personId:true}}),
    tx.organizationMember.findUnique({where:{organizationId_accountId:{organizationId,accountId}},select:{status:true,role:true}}),
  ]);
  if(!org||!account||member&&member.status!=='ACTIVE'||!member&&org.ownerId!==accountId)throw new ForbiddenException('لا توجد صلاحية صيانة نشطة لهذه الجهة.');
  const manager=org.ownerId===accountId||!!member&&['OWNER','ADMIN'].includes(member.role);
  if(!manager&&!member||member&&!['OWNER','ADMIN','OPERATOR','STAFF'].includes(member.role))throw new ForbiddenException('صلاحية تشغيل الأصول مطلوبة.');
  if(org.kind==='HYDROLAND_INTERNAL_PLATFORM'&&!manager){
    const employment=await tx.employment.findFirst({where:{accountId,organizationId,status:'ACTIVE',orgUnit:{code:MAINTENANCE_DEPARTMENT,type:'DEPARTMENT',active:true,organizationId},position:{active:true,orgUnit:{code:MAINTENANCE_DEPARTMENT,active:true,organizationId}}},select:{startsAt:true,endsAt:true,orgUnitId:true,position:{select:{orgUnitId:true}}}});
    if(!employment?.position||employment.position.orgUnitId!==employment.orgUnitId||employment.startsAt&&employment.startsAt>new Date()||employment.endsAt&&employment.endsAt<=new Date())throw new ForbiddenException('التكليف الحالي في إدارة المرافق والأصول والصيانة مطلوب.');
  }
  return{accountId,personId:account.personId,manager};
}
export function managerOnly(actor:Actor){if(!actor.manager)throw new ForbiddenException('اعتماد مدير الجهة أو مالكها مطلوب.');}

export async function maintenanceSource(tx:Prisma.TransactionClient,organizationId:string,kind:AssetKind,id:string):Promise<AssetSource>{
  if(kind==='MARINE'){
    const source=await tx.marineAsset.findFirst({where:{id,organizationId},select:{id:true,name:true,organizationId:true,status:true,calendarResourceId:true}});
    if(!source)throw new NotFoundException('الأصل غير متاح في هذه الجهة.');
    return{id:source.id,kind,name:source.name,organizationId,status:source.status,resourceId:source.calendarResourceId};
  }
  const rows=await tx.$queryRaw<Array<{id:string;name:string;organizationId:string;status:string}>>`
    SELECT r."id",r."name",b."organizationId"::text AS "organizationId",b."stockStatus" AS status
    FROM "EquipmentBarcode" b JOIN "CalendarResource" r ON r."id"=b."resourceId"
    WHERE b."resourceId"=${id} AND b."organizationId"::text=${organizationId} AND r."type"='EQUIPMENT'`;
  if(!rows[0])throw new NotFoundException('المعدة غير متاحة في هذه الجهة.');
  return{...rows[0],kind,resourceId:id};
}

export async function partSource(tx:Prisma.TransactionClient,row:WorkOrder,issueRequestId:string,allowReturns=false){
  const issue=await tx.warehouseIssuePosting.findUnique({where:{organizationId_requestId:{organizationId:row.organizationId,requestId:identifier(issueRequestId)}},include:{lot:true}});
  if(!issue||!issue.acknowledgedAt||(!allowReturns&&issue.returned!==0)||issue.quantity<1||issue.returned<0||issue.returned>issue.quantity)throw new ConflictException('يلزم صرف مخزون أصلي مستلم وغير مرتجع.');
  const request=await tx.warehouseDecisionRequest.findUnique({where:{organizationId_id:{organizationId:row.organizationId,id:issueRequestId}}});
  if(!request||request.kind!=='ISSUE'||request.finalDecision!=='APPROVE'||!request.finalizedAt||request.finalActorId!==issue.approvedBy)throw new ConflictException('أدلة اعتماد صرف المخزون غير مكتملة.');
  const details=request.details as Record<string,unknown>;
  if(details.lotId!==issue.lotId||details.quantity!==issue.quantity||details.custodianId!==issue.custodianId)throw new ConflictException('مرجع الصرف لا يطابق الكمية والعهدة الأصلية.');
  const quantity=issue.quantity-issue.returned,cost=quantity*issue.lot.unitCostMinor;
  if(!Number.isSafeInteger(cost)||cost<0)throw new ConflictException('تعذر تثبيت تكلفة القطع من المصدر.');
  return{issueRequestId,lotId:issue.lotId,quantity,issuedQuantity:issue.quantity,returnedQuantity:issue.returned,unitCostMinor:issue.lot.unitCostMinor,totalCostMinor:cost,currency:'SAR',custodianId:issue.custodianId,approvedBy:issue.approvedBy,postedBy:issue.postedBy,acknowledgedAt:issue.acknowledgedAt.toISOString(),itemId:issue.lot.itemId,purchaseReference:issue.lot.purchaseReference,receiptReference:issue.lot.receiptReference};
}

export async function optionalDocument(tx:Prisma.TransactionClient,organizationId:string,input:Record<string,unknown>){
  if(input.documentId===undefined&&input.documentVersion===undefined&&input.documentHash===undefined)return null;
  const id=identifier(input.documentId,'document'),row=await tx.managedDocument.findFirst({where:{id,organizationId,department:MAINTENANCE_DEPARTMENT,status:{in:['APPROVED','SIGNED']}},select:{id:true,version:true,contentHash:true,referenceNumber:true}});
  if(!row||row.version!==input.documentVersion||row.contentHash!==input.documentHash)throw new ConflictException('تغير المستند أو لم يعتمد ضمن نطاق صيانة الجهة.');
  return row;
}
