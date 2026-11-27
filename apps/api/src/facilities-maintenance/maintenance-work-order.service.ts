import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { decisionDigest } from '../document-forms/owner-administrative-decision.domain';
import { assertTripFitsEquipmentRentals } from '../trips/equipment-rental-calendar';
import { Actor, assetKind, AssetSource, date, envelope, identifier, integer, MAINTENANCE_DEPARTMENT, note, object, PreventivePlan, sourceOf, WorkOrder } from './maintenance-work-order.domain';
import { maintenanceActor, maintenanceSource, managerOnly, optionalDocument, partSource } from './maintenance-work-order.sources';

type Command={requestId:string;subjectId:string;action:string;actorId:string;requestDigest:string;result:Record<string,unknown>};
const proofKeys=['documentId','documentVersion','documentHash'];

@Injectable()
export class MaintenanceWorkOrderService {
  constructor(private readonly db:DatabaseService,private readonly audit:AuditService){}

  async organizations(accountId:string){
    const rows=await this.db.organization.findMany({where:{status:'ACTIVE',OR:[{ownerId:accountId},{members:{some:{accountId,status:'ACTIVE'}}}]},select:{id:true,displayName:true},orderBy:{displayName:'asc'}});
    const result:Array<{id:string;displayName:string}>=[];
    for(const row of rows){try{await maintenanceActor(this.db,row.id,accountId);result.push(row);}catch(error){if(!(error instanceof ForbiddenException))throw error;}}
    return result;
  }
  private async row(tx:Prisma.TransactionClient,org:string,id:string){
    const rows=await tx.$queryRaw<WorkOrder[]>`SELECT * FROM "MaintenanceWorkOrder" WHERE "organizationId"::text=${org} AND "id"=${id}`;
    if(!rows[0])throw new NotFoundException('أمر العمل غير متاح.');return rows[0];
  }
  private async plan(tx:Prisma.TransactionClient,org:string,id:string){
    const rows=await tx.$queryRaw<PreventivePlan[]>`SELECT * FROM "MaintenancePreventivePlan" WHERE "organizationId"::text=${org} AND "id"=${id}`;
    if(!rows[0])throw new NotFoundException('خطة الصيانة غير متاحة.');return rows[0];
  }
  private async replay(tx:Prisma.TransactionClient,org:string,actor:Actor,requestId:string,subjectId:string,action:string,input:unknown){
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`c05-command:${org}:${requestId}`},0))`;
    const rows=await tx.$queryRaw<Command[]>`SELECT * FROM "MaintenanceCommand" WHERE "organizationId"::text=${org} AND "requestId"=${requestId}`;
    const digest=decisionDigest(input),old=rows[0];
    if(old&&(old.subjectId!==subjectId||old.action!==action||old.actorId!==actor.accountId||old.requestDigest!==digest))throw new ConflictException('مرجع المحاولة مستخدم ببيانات أخرى.');
    return{old,digest};
  }
  private async mutate<T>(work:(tx:Prisma.TransactionClient)=>Promise<T>):Promise<T>{
    // Legacy native calendar/inventory columns are UTC TIMESTAMP(3). Normalize
    // this transaction only; TIMESTAMPTZ work-order dates preserve their instant.
    return this.db.serializable(async tx=>{await tx.$executeRaw`SET LOCAL TIME ZONE 'UTC'`;return work(tx);});
  }
  private async commandWrite<T>(org:string,requestId:string,work:()=>Promise<T>):Promise<T>{
    try{return await work();}catch(error){
      const failure=error as {code?:string;meta?:{code?:string}};
      // A serializable snapshot may predate an advisory-lock wait. A competing
      // insert can then surface as 23505; retry only when this exact command now
      // exists, so replay still validates actor, subject, action and input digest.
      if(failure?.code==='P2002'||failure?.code==='P2010'&&failure?.meta?.code==='23505'){
        const existing=await this.db.$queryRaw<Array<{requestId:string}>>`SELECT "requestId" FROM "MaintenanceCommand" WHERE "organizationId"::text=${org} AND "requestId"=${requestId}`;
        if(existing.length)return work();
      }
      throw error;
    }
  }
  private async record(tx:Prisma.TransactionClient,org:string,actor:Actor,requestId:string,subjectId:string,action:string,digest:string,result:unknown){
    const payload={organizationId:org,requestId,subjectId,action,actorId:actor.accountId,actorPersonId:actor.personId,requestDigest:digest,result};
    await tx.$executeRaw`INSERT INTO "MaintenanceCommand"("organizationId","requestId","subjectId","action","actorId","actorPersonId","requestDigest","result") SELECT x."organizationId",x."requestId",x."subjectId",x."action",x."actorId",x."actorPersonId",x."requestDigest",x."result" FROM jsonb_populate_record(NULL::"MaintenanceCommand",${JSON.stringify(payload)}::jsonb) x`;
    await this.audit.record({actorId:actor.accountId,action:'C05_'+action,resource:'MaintenanceWorkOrder',resourceId:subjectId,metadata:{organizationId:org,requestId,requestDigest:digest}},tx);
  }
  private async parts(tx:Prisma.TransactionClient,row:WorkOrder){
    const rows=await tx.$queryRaw<Array<{issueRequestId:string;snapshot:Record<string,any>}>>`SELECT "issueRequestId","snapshot" FROM "MaintenancePartUsage" WHERE "organizationId"::text=${row.organizationId} AND "workOrderId"=${row.id} ORDER BY "createdAt","issueRequestId"`;
    let valid=true;
    const result:Array<Record<string,any>&{sourceCurrent:boolean}>=[];
    for(const usage of rows){const snapshot=row.metadata.partsReconciliation?.[usage.issueRequestId]?.snapshot??usage.snapshot;let current=true;try{current=decisionDigest(await partSource(tx,row,usage.issueRequestId,true))===decisionDigest(snapshot);}catch(error){if(error instanceof ConflictException||error instanceof NotFoundException)current=false;else throw error;}valid=valid&&current;result.push({...snapshot,sourceCurrent:current});}
    const totalCostMinor=result.reduce((sum,x)=>sum+Number(x.totalCostMinor),0);if(!Number.isSafeInteger(totalCostMinor))throw new ConflictException('إجمالي تكلفة القطع يتجاوز الدقة المسموحة.');return{items:result,sourceCurrent:valid,totalCostMinor};
  }
  private capabilities(row:WorkOrder,actor:Actor){
    const m=row.metadata,tech=m.technician?.accountId===actor.accountId&&m.technician?.personId===actor.personId,inspector=m.inspector?.accountId===actor.accountId&&m.inspector?.personId===actor.personId;
    return{approve:actor.manager&&row.status==='REQUESTED'&&m.requester.personId!==actor.personId,reject:actor.manager&&['REQUESTED','APPROVED','SCHEDULED'].includes(row.status),schedule:actor.manager&&row.status==='APPROVED',start:tech&&row.status==='SCHEDULED',parts:tech&&row.status==='IN_PROGRESS','reconcile-parts':tech&&row.status==='IN_PROGRESS',complete:tech&&row.status==='IN_PROGRESS',inspect:inspector&&['AWAITING_INSPECTION','INSPECTED'].includes(row.status),close:actor.manager&&row.status==='INSPECTED'&&m.technician?.personId!==actor.personId,reopen:actor.manager&&['CLOSED','REJECTED'].includes(row.status)};
  }
  private async view(tx:Prisma.TransactionClient,row:WorkOrder,actor:Actor){
    const source=sourceOf(row),asset=await maintenanceSource(tx,row.organizationId,source.kind,source.id),parts=await this.parts(tx,row);
    const totalCostMinor=parts.totalCostMinor+Number(row.metadata.execution?.laborCostMinor??0);if(!Number.isSafeInteger(totalCostMinor))throw new ConflictException('إجمالي التكلفة يتجاوز الدقة المسموحة.');return{...row,asset,parts,totalCostMinor,currency:'SAR',capabilities:this.capabilities(row,actor)};
  }
  async workspace(accountId:string,org:string){return this.db.serializable(async tx=>{
    const actor=await maintenanceActor(tx,org,accountId),marine=await tx.marineAsset.findMany({where:{organizationId:org},select:{id:true,name:true,status:true},orderBy:{name:'asc'},take:300});
    const equipment=await tx.$queryRaw<Array<{id:string;name:string;status:string}>>`SELECT b."resourceId" AS id,r."name",b."stockStatus" AS status FROM "EquipmentBarcode" b JOIN "CalendarResource" r ON r."id"=b."resourceId" WHERE b."organizationId"::text=${org} AND r."type"='EQUIPMENT' ORDER BY r."name",b."resourceId" LIMIT 300`;
    const orders=await tx.$queryRaw<WorkOrder[]>`SELECT * FROM "MaintenanceWorkOrder" WHERE "organizationId"::text=${org} ORDER BY "createdAt" DESC,"id" LIMIT 100`;
    const plans=await tx.$queryRaw<PreventivePlan[]>`SELECT * FROM "MaintenancePreventivePlan" WHERE "organizationId"::text=${org} ORDER BY "nextDueAt","id" LIMIT 300`;
    const members=await tx.organizationMember.findMany({where:{organizationId:org,status:'ACTIVE'},select:{accountId:true,account:{select:{person:{select:{firstName:true,lastName:true}}}}},take:300});
    const participants=[];
    for(const member of members){try{const binding=await maintenanceActor(tx,org,member.accountId);participants.push({...binding,name:[member.account.person.firstName,member.account.person.lastName].join(' ')});}catch(error){if(!(error instanceof ForbiddenException))throw error;}}
    const documents=await tx.managedDocument.findMany({where:{organizationId:org,department:MAINTENANCE_DEPARTMENT,status:{in:['APPROVED','SIGNED']}},select:{id:true,referenceNumber:true,template:{select:{titleAr:true,titleEn:true}},version:true,contentHash:true},orderBy:{updatedAt:'desc'},take:100});
    const stockIssues=await tx.warehouseIssuePosting.findMany({where:{organizationId:org,custodianId:accountId,acknowledgedAt:{not:null},returned:0},select:{requestId:true,lotId:true,quantity:true},orderBy:{createdAt:'desc'},take:100});
    return{organizationId:org,actor,assets:[...marine.map(a=>({...a,kind:'MARINE'})),...equipment.map(a=>({...a,kind:'EQUIPMENT'}))],participants,plans,documents,stockIssues,orders:orders.map(row=>({...row,capabilities:this.capabilities(row,actor)}))};
  });}
  async detail(accountId:string,org:string,id:string){return this.db.serializable(async tx=>{
    const actor=await maintenanceActor(tx,org,accountId),row=await this.row(tx,org,identifier(id));
    const history=await tx.$queryRaw<Array<{requestId:string;action:string;actorId:string;actorPersonId:string;result:unknown;createdAt:Date}>>`SELECT "requestId","action","actorId","actorPersonId","result","createdAt" FROM "MaintenanceCommand" WHERE "organizationId"::text=${org} AND "subjectId"=${id} ORDER BY "createdAt","requestId"`;
    return{...await this.view(tx,row,actor),history};
  });}
  async create(accountId:string,org:string,input:unknown){
    const body=object(input,['requestId','assetKind','assetId','description','planId']),id=identifier(body.requestId),kind=assetKind(body.assetKind),assetId=identifier(body.assetId),description=note(body.description,5),planId=body.planId?identifier(body.planId):null;
    return this.commandWrite(org,id,()=>this.mutate(async tx=>{
      const actor=await maintenanceActor(tx,org,accountId),command=await this.replay(tx,org,actor,id,id,'REQUESTED',body);
      if(command.old)return this.view(tx,await this.row(tx,org,id),actor);
      const asset=await maintenanceSource(tx,org,kind,assetId);
      if(asset.status==='RETIRED')throw new ConflictException('لا يقبل الأصل المستبعد أمر صيانة.');
      const plan=planId?await this.plan(tx,org,planId):null;
      if(plan&&(!plan.active||sourceOf(plan).id!==asset.id||sourceOf(plan).kind!==kind))throw new ConflictException('الخطة غير نشطة أو تتبع أصلًا آخر.');
      const existing=await tx.$queryRaw<Array<{id:string}>>`SELECT "id" FROM "MaintenanceWorkOrder" WHERE "planId"=${planId} AND ("planDueAt"=${plan?.nextDueAt??null} OR "status" NOT IN ('CLOSED','REJECTED'))`;
      if(existing.length)throw new ConflictException('يوجد أمر مسجل لهذه الدورة الوقائية.');
      const native=kind==='MARINE'?await tx.marineMaintenanceRecord.create({data:{marineAssetId:asset.id,maintenanceType:plan?'C05:PREVENTIVE':'C05:CORRECTIVE',notes:description,dueAt:plan?.nextDueAt??null}}):null;
      const metadata={description,requester:{accountId,personId:actor.personId},planSnapshot:plan?{id:plan.id,revision:plan.revision,intervalDays:plan.intervalDays,sourceReference:plan.metadata.sourceReference,nextDueAt:plan.nextDueAt.toISOString()}:null};
      const payload={id,organizationId:org,marineAssetId:kind==='MARINE'?asset.id:null,equipmentResourceId:kind==='EQUIPMENT'?asset.id:null,maintenanceRecordId:native?.id??null,planId,planDueAt:plan?.nextDueAt??null,status:'REQUESTED',metadata};
      await tx.$executeRaw`INSERT INTO "MaintenanceWorkOrder"("id","organizationId","marineAssetId","equipmentResourceId","maintenanceRecordId","planId","planDueAt","status","metadata") SELECT x."id",x."organizationId",x."marineAssetId",x."equipmentResourceId",x."maintenanceRecordId",x."planId",x."planDueAt",x."status",x."metadata" FROM jsonb_populate_record(NULL::"MaintenanceWorkOrder",${JSON.stringify(payload)}::jsonb) x`;
      const row=await this.row(tx,org,id);await this.record(tx,org,actor,id,id,'REQUESTED',command.digest,row);return this.view(tx,row,actor);
    })).catch(error=>{if(error?.code==='P2002'||error?.code==='P2010'&&error?.meta?.code==='23505')throw new ConflictException('مرجع الطلب أو دورة الخطة مسجلان.');throw error;});
  }
  private async reserve(tx:Prisma.TransactionClient,row:WorkOrder,source:AssetSource,startsAt:Date,endsAt:Date){
    await tx.$executeRaw`SET LOCAL TIME ZONE 'UTC'`;
    if(source.kind==='MARINE')await tx.$queryRaw`SELECT "id" FROM "MarineAsset" WHERE "id"::text=${source.id} FOR UPDATE`;
    else await tx.$queryRaw`SELECT "id" FROM "CalendarResource" WHERE "id"::text=${source.id} FOR UPDATE`;
    let resourceId=source.resourceId;
    if(!resourceId){
      const resource=await tx.calendarResource.create({data:{type:'BOAT',name:source.name,referenceId:source.id}});resourceId=resource.id;
      await tx.marineAsset.update({where:{id:source.id},data:{calendarResourceId:resourceId}});
    }
    const resource=await tx.calendarResource.findUnique({where:{id:resourceId},select:{active:true}});
    if(!resource?.active||source.status==='RETIRED')throw new ConflictException('المورد غير نشط أو مستبعد.');
    const same=await tx.calendarEvent.findUnique({where:{referenceType_referenceId:{referenceType:'MAINTENANCE',referenceId:row.id}}});
    const conflict=await tx.calendarAllocation.findFirst({where:{resourceId,status:'ACTIVE',startsAt:{lt:endsAt},endsAt:{gt:startsAt},event:{status:'ACTIVE'},...(same?{eventId:{not:same.id}}:{})},select:{id:true}});
    if(conflict)throw new ConflictException('موعد الصيانة يتعارض مع حجز الأصل في التقويم.');
    await assertTripFitsEquipmentRentals(tx,[resourceId],startsAt,endsAt,row.id);
    if(source.kind==='MARINE'){
      const trip=await tx.trip.findFirst({where:{marineAssetId:source.id,status:{in:['DRAFT','OPEN','CLOSED']},startsAt:{lt:endsAt},endsAt:{gt:startsAt}},select:{id:true}});
      if(trip)throw new ConflictException('موعد الصيانة يتعارض مع رحلة مرتبطة بالأصل.');
    }
    const event=await tx.calendarEvent.upsert({where:{referenceType_referenceId:{referenceType:'MAINTENANCE',referenceId:row.id}},create:{organizationId:row.organizationId,type:'MAINTENANCE',referenceType:'MAINTENANCE',referenceId:row.id,title:'Maintenance: '+source.name,startsAt,endsAt,status:'ACTIVE'},update:{startsAt,endsAt,status:'ACTIVE'}});
    await tx.calendarAllocation.updateMany({where:{eventId:event.id,status:'ACTIVE'},data:{status:'INACTIVE'}});
    await tx.calendarAllocation.create({data:{eventId:event.id,resourceId,startsAt,endsAt,status:'ACTIVE'}});
    return resourceId;
  }
  private async release(tx:Prisma.TransactionClient,row:WorkOrder){
    const event=await tx.calendarEvent.findUnique({where:{referenceType_referenceId:{referenceType:'MAINTENANCE',referenceId:row.id}},select:{id:true}});
    if(event){await tx.calendarAllocation.updateMany({where:{eventId:event.id,status:'ACTIVE'},data:{status:'INACTIVE'}});await tx.calendarEvent.update({where:{id:event.id},data:{status:'INACTIVE'}});}
  }
  private async sameTechnician(tx:Prisma.TransactionClient,row:WorkOrder,actor:Actor){
    const saved=row.metadata.technician;
    if(!saved||saved.accountId!==actor.accountId||saved.personId!==actor.personId)throw new ForbiddenException('الفني المكلّف حاليًا هو من ينفذ هذا الإجراء.');
    await this.currentApproval(tx,row);
  }
  private async currentApproval(tx:Prisma.TransactionClient,row:WorkOrder){
    const approved=row.metadata.approver;
    if(!approved)throw new ConflictException('اعتماد أمر العمل مفقود.');
    const current=await maintenanceActor(tx,row.organizationId,approved.accountId);managerOnly(current);
    if(current.personId!==approved.personId)throw new ForbiddenException('تغيرت هوية صاحب الاعتماد.');
  }
  private async validateParts(tx:Prisma.TransactionClient,row:WorkOrder){const parts=await this.parts(tx,row);if(!parts.sourceCurrent)throw new ConflictException('تغير مصدر صرف القطع؛ يلزم معالجة مرجع المخزون.');return parts;}

  private async validateProofs(tx:Prisma.TransactionClient,row:WorkOrder){
    for(const proof of [row.metadata.execution?.document,row.metadata.inspection?.document])if(proof)await optionalDocument(tx,row.organizationId,{documentId:proof.id,documentVersion:proof.version,documentHash:proof.contentHash});
  }

  async action(accountId:string,org:string,id:string,action:string,input:unknown){
    identifier(id);
    const allowed:Record<string,string[]>={approve:['note'],reject:['note'],schedule:['technicianId','inspectorId','startsAt','endsAt','note'],start:['note'],parts:['issueRequestId','note'],'reconcile-parts':['issueRequestId','note'],complete:['workPerformed','evidenceReference','laborCostMinor',...proofKeys],inspect:['result','inspectionNotes','evidenceReference',...proofKeys],close:['note'],reopen:['note']};
    if(!allowed[action])throw new BadRequestException('Unknown maintenance action.');
    const body=object(input,['requestId','expectedRevision',...allowed[action]]),commandInput=envelope(body);
    return this.commandWrite(org,commandInput.requestId,()=>this.mutate(async tx=>{
      const actor=await maintenanceActor(tx,org,accountId),command=await this.replay(tx,org,actor,commandInput.requestId,id,action.toUpperCase(),body);
      if(command.old)return this.view(tx,await this.row(tx,org,id),actor);
      await tx.$queryRaw`SELECT "id" FROM "MaintenanceWorkOrder" WHERE "organizationId"::text=${org} AND "id"=${id} FOR UPDATE`;
      const row=await this.row(tx,org,id),m={...row.metadata},source=sourceOf(row),asset=await maintenanceSource(tx,org,source.kind,source.id);
      if(row.revision!==commandInput.expectedRevision)throw new ConflictException('تغير أمر العمل؛ حدّث التفاصيل قبل اتخاذ القرار.');
      const capabilities=this.capabilities(row,actor);
      if(!capabilities[action as keyof typeof capabilities])throw new ForbiddenException('الحالة أو الصلاحية الحالية لا تسمح بهذا الإجراء.');
      let status=row.status,startsAt=row.startsAt,endsAt=row.endsAt;
      if(action==='approve'){managerOnly(actor);m.approver={accountId,personId:actor.personId,note:note(body.note),at:new Date().toISOString()};status='APPROVED';}
      if(action==='reject'){managerOnly(actor);m.rejection={accountId,note:note(body.note),at:new Date().toISOString()};status='REJECTED';await this.release(tx,row);if(row.maintenanceRecordId)await tx.marineMaintenanceRecord.update({where:{id:row.maintenanceRecordId},data:{status:'CANCELLED',completedAt:null}});}
      if(action==='schedule'){
        managerOnly(actor);await this.currentApproval(tx,row);const technician=await maintenanceActor(tx,org,identifier(body.technicianId)),inspector=await maintenanceActor(tx,org,identifier(body.inspectorId));
        if(technician.personId===inspector.personId||inspector.personId===m.requester.personId)throw new ForbiddenException('يلزم فاحص مستقل عن الفني ومقدم الطلب.');
        startsAt=date(body.startsAt);endsAt=date(body.endsAt);
        if(endsAt<=startsAt||endsAt<=new Date()||endsAt.getTime()-startsAt.getTime()>31*86400000||startsAt.getTime()<Date.now()-86400000)throw new BadRequestException('مدة الصيانة غير صالحة.');
        m.calendarResourceId=await this.reserve(tx,row,asset,startsAt,endsAt);m.technician={accountId:technician.accountId,personId:technician.personId};m.inspector={accountId:inspector.accountId,personId:inspector.personId};m.scheduleNote=note(body.note);status='SCHEDULED';
        if(row.maintenanceRecordId)await tx.marineMaintenanceRecord.update({where:{id:row.maintenanceRecordId},data:{dueAt:startsAt,status:'OPEN',completedAt:null}});
      }
      if(action==='start'){
        await this.sameTechnician(tx,row,actor);if(!startsAt||startsAt>new Date())throw new ConflictException('لم يبدأ موعد الصيانة المجدول.');
        await this.reserve(tx,row,asset,startsAt,new Date(Math.max(endsAt!.getTime(),Date.now()+60000)));
        if(asset.kind==='EQUIPMENT'){
          if(!['AVAILABLE','MAINTENANCE'].includes(asset.status))throw new ConflictException('المعدة مسلّمة أو محجوزة أو مستبعدة.');
          m.previousStockStatus=asset.status;
          await tx.$executeRaw`UPDATE "EquipmentBarcode" SET "stockStatus"='MAINTENANCE',"updatedAt"=NOW() WHERE "resourceId"=${asset.id}`;
          await tx.$executeRaw`INSERT INTO "EquipmentMovement"("id","resourceId","movementType","fromLocation","toLocation","notes","actorAccountId","occurredAt") SELECT gen_random_uuid()::text,"resourceId",'MAINTENANCE',"location","location",${'C05 '+id},${accountId},NOW() FROM "EquipmentBarcode" WHERE "resourceId"=${asset.id}`;
        }
        m.started={accountId,note:note(body.note),at:new Date().toISOString()};status='IN_PROGRESS';
      }
      if(action==='parts'){
        await this.sameTechnician(tx,row,actor);const snapshot=await partSource(tx,row,identifier(body.issueRequestId));
        if(snapshot.custodianId!==accountId)throw new ForbiddenException('القطع يجب أن تكون مصروفة ومستلمة بعهدة الفني المكلف.');
        const exists=await tx.$queryRaw<Array<{workOrderId:string}>>`SELECT "workOrderId" FROM "MaintenancePartUsage" WHERE "organizationId"::text=${org} AND "issueRequestId"=${snapshot.issueRequestId}`;
        if(exists.length)throw new ConflictException('مرجع الصرف مربوط بأمر صيانة بالفعل.');
        await tx.$executeRaw`INSERT INTO "MaintenancePartUsage"("organizationId","issueRequestId","workOrderId","snapshot") SELECT x."organizationId",x."issueRequestId",x."workOrderId",x."snapshot" FROM jsonb_populate_record(NULL::"MaintenancePartUsage",${JSON.stringify({organizationId:org,issueRequestId:snapshot.issueRequestId,workOrderId:id,snapshot})}::jsonb) x`;
        m.lastPartsNote=note(body.note);
      }
      if(action==='reconcile-parts'){
        await this.sameTechnician(tx,row,actor);const issueRequestId=identifier(body.issueRequestId);
        const usages=await tx.$queryRaw<Array<{snapshot:Record<string,any>}>>`SELECT "snapshot" FROM "MaintenancePartUsage" WHERE "organizationId"::text=${org} AND "workOrderId"=${id} AND "issueRequestId"=${issueRequestId}`;
        if(!usages[0])throw new NotFoundException('مرجع القطع غير مربوط بأمر العمل.');
        const snapshot=await partSource(tx,row,issueRequestId,true);
        if(snapshot.custodianId!==accountId)throw new ForbiddenException('الفني مستلم العهدة هو من يطابق المرتجع.');
        const previous=m.partsReconciliation?.[issueRequestId]?.snapshot??usages[0].snapshot;
        if(snapshot.issuedQuantity!==previous.issuedQuantity||snapshot.unitCostMinor!==previous.unitCostMinor||snapshot.lotId!==previous.lotId||snapshot.returnedQuantity<=previous.returnedQuantity)throw new ConflictException('تقبل المطابقة زيادة المرتجع الأصلي فقط، ولا تغيّر أصل الصرف أو سعره.');
        m.partsReconciliation={...m.partsReconciliation,[issueRequestId]:{snapshot,note:note(body.note),accountId,at:new Date().toISOString()}};
      }
      if(action==='complete'){
        await this.sameTechnician(tx,row,actor);await this.validateParts(tx,row);
        m.execution={accountId,personId:actor.personId,at:new Date().toISOString(),workPerformed:note(body.workPerformed,10),evidenceReference:note(body.evidenceReference),laborCostMinor:integer(body.laborCostMinor),document:await optionalDocument(tx,org,body)};delete m.inspection;status='AWAITING_INSPECTION';
      }
      if(action==='inspect'){
        await this.currentApproval(tx,row);const technician=await maintenanceActor(tx,org,m.technician.accountId);
        if(technician.personId!==m.technician.personId||actor.personId===technician.personId||actor.personId===m.requester.personId)throw new ForbiddenException('لم يتحقق استقلال الفحص.');
        if(body.result!=='PASS'&&body.result!=='FAIL')throw new BadRequestException('اختر نجاح الفحص أو إعادته للفني.');if(body.result==='PASS'){await this.validateParts(tx,row);await this.validateProofs(tx,row);}
        m.inspection={accountId,personId:actor.personId,result:body.result,at:new Date().toISOString(),inspectionNotes:note(body.inspectionNotes,10),evidenceReference:note(body.evidenceReference),document:await optionalDocument(tx,org,body)};
        status=body.result==='PASS'?'INSPECTED':'IN_PROGRESS';
      }
      if(action==='close'){
        managerOnly(actor);await this.currentApproval(tx,row);await this.validateParts(tx,row);await this.validateProofs(tx,row);const inspector=await maintenanceActor(tx,org,m.inspector.accountId);
        if(!m.inspection||m.inspection.result!=='PASS'||m.inspection.personId!==inspector.personId||inspector.personId===m.technician.personId)throw new ConflictException('الفحص المستقل الحالي غير مكتمل.');
        m.closure={accountId,personId:actor.personId,note:note(body.note),at:new Date().toISOString()};status='CLOSED';await this.release(tx,row);
        if(row.maintenanceRecordId)await tx.marineMaintenanceRecord.update({where:{id:row.maintenanceRecordId},data:{status:'COMPLETED',completedAt:new Date()}});
        if(asset.kind==='EQUIPMENT'&&asset.status==='MAINTENANCE'&&m.previousStockStatus==='AVAILABLE'){
          const other=await tx.$queryRaw<Array<{id:string}>>`SELECT "id" FROM "MaintenanceWorkOrder" WHERE "equipmentResourceId"::text=${asset.id} AND "id"<>${id} AND "status" IN ('IN_PROGRESS','AWAITING_INSPECTION','INSPECTED') LIMIT 1`;
          if(!other.length){await tx.$executeRaw`UPDATE "EquipmentBarcode" SET "stockStatus"='AVAILABLE',"updatedAt"=NOW() WHERE "resourceId"=${asset.id} AND "stockStatus"='MAINTENANCE'`;await tx.$executeRaw`INSERT INTO "EquipmentMovement"("id","resourceId","movementType","fromLocation","toLocation","notes","actorAccountId","occurredAt") SELECT gen_random_uuid()::text,"resourceId",'RELEASE',"location","location",${'C05 '+id},${accountId},NOW() FROM "EquipmentBarcode" WHERE "resourceId"=${asset.id}`;}
        }
        if(row.planId){const plan=await this.plan(tx,org,row.planId),nextDueAt=new Date(Date.now()+plan.intervalDays*86400000);await tx.$executeRaw`UPDATE "MaintenancePreventivePlan" SET "nextDueAt"=${nextDueAt},"revision"="revision"+1,"metadata"="metadata"||${JSON.stringify({lastClosedWorkOrderId:id,lastClosedAt:m.closure.at})}::jsonb,"updatedAt"=NOW() WHERE "id"=${plan.id}`;}
      }
      if(action==='reopen'){
        managerOnly(actor);m.reopened={accountId,note:note(body.note),at:new Date().toISOString()};delete m.approver;delete m.technician;delete m.inspector;delete m.execution;delete m.inspection;delete m.closure;status='REQUESTED';startsAt=null;endsAt=null;
        if(row.maintenanceRecordId)await tx.marineMaintenanceRecord.update({where:{id:row.maintenanceRecordId},data:{status:'OPEN',completedAt:null,dueAt:null}});
        if(row.planId){const newer=await tx.$queryRaw<Array<{id:string}>>`SELECT "id" FROM "MaintenanceWorkOrder" WHERE "planId"=${row.planId} AND "createdAt">${row.createdAt} LIMIT 1`;if(newer.length)throw new ConflictException('بدأت دورة وقائية تالية؛ افتح أمرًا تصحيحيًا مستقلًا.');await tx.$executeRaw`UPDATE "MaintenancePreventivePlan" SET "nextDueAt"=NOW(),"revision"="revision"+1,"metadata"="metadata"||${JSON.stringify({reopenedWorkOrderId:id})}::jsonb,"updatedAt"=NOW() WHERE "id"=${row.planId}`;}
      }
      await tx.$executeRaw`UPDATE "MaintenanceWorkOrder" SET "status"=${status},"revision"="revision"+1,"startsAt"=${startsAt},"endsAt"=${endsAt},"metadata"=${JSON.stringify(m)}::jsonb,"updatedAt"=NOW() WHERE "organizationId"::text=${org} AND "id"=${id} AND "revision"=${row.revision}`;
      const after=await this.row(tx,org,id);await this.record(tx,org,actor,commandInput.requestId,id,action.toUpperCase(),command.digest,after);return this.view(tx,after,actor);
    })).catch(error=>{if(error?.code==='P2010'&&error?.meta?.code==='23505')throw new ConflictException('مرجع القطع أو المحاولة مسجل بالفعل.');throw error;});
  }
  async createPlan(accountId:string,org:string,input:unknown){
    const body=object(input,['requestId','assetKind','assetId','intervalDays','nextDueAt','instructions','sourceReference']),id=identifier(body.requestId),kind=assetKind(body.assetKind),assetId=identifier(body.assetId),intervalDays=integer(body.intervalDays,1,3650),nextDueAt=date(body.nextDueAt),instructions=note(body.instructions,5),sourceReference=note(body.sourceReference);
    return this.commandWrite(org,id,()=>this.mutate(async tx=>{
      const actor=await maintenanceActor(tx,org,accountId);managerOnly(actor);const command=await this.replay(tx,org,actor,id,id,'PLAN_CREATED',body);
      if(command.old)return this.plan(tx,org,id);
      const asset=await maintenanceSource(tx,org,kind,assetId);if(asset.status==='RETIRED')throw new ConflictException('الأصل مستبعد.');
      const payload={id,organizationId:org,marineAssetId:kind==='MARINE'?assetId:null,equipmentResourceId:kind==='EQUIPMENT'?assetId:null,intervalDays,nextDueAt,metadata:{instructions,sourceReference,createdBy:accountId}};
      await tx.$executeRaw`INSERT INTO "MaintenancePreventivePlan"("id","organizationId","marineAssetId","equipmentResourceId","intervalDays","nextDueAt","metadata") SELECT x."id",x."organizationId",x."marineAssetId",x."equipmentResourceId",x."intervalDays",x."nextDueAt",x."metadata" FROM jsonb_populate_record(NULL::"MaintenancePreventivePlan",${JSON.stringify(payload)}::jsonb) x`;
      const result=await this.plan(tx,org,id);await this.record(tx,org,actor,id,id,'PLAN_CREATED',command.digest,result);return result;
    }));
  }
  async planState(accountId:string,org:string,id:string,input:unknown){
    const body=object(input,['requestId','expectedRevision','active','note']),env=envelope(body);if(typeof body.active!=='boolean')throw new BadRequestException('حالة الخطة غير صحيحة.');const reason=note(body.note);
    return this.commandWrite(org,env.requestId,()=>this.mutate(async tx=>{
      const actor=await maintenanceActor(tx,org,accountId);managerOnly(actor);const command=await this.replay(tx,org,actor,env.requestId,id,'PLAN_STATE',body);if(command.old)return this.plan(tx,org,id);
      const plan=await this.plan(tx,org,identifier(id));if(plan.revision!==env.expectedRevision)throw new ConflictException('تغيرت خطة الصيانة.');
      await tx.$executeRaw`UPDATE "MaintenancePreventivePlan" SET "active"=${body.active},"revision"="revision"+1,"metadata"="metadata"||${JSON.stringify({stateReason:reason,stateChangedBy:accountId})}::jsonb,"updatedAt"=NOW() WHERE "id"=${id} AND "revision"=${env.expectedRevision}`;
      const result=await this.plan(tx,org,id);await this.record(tx,org,actor,env.requestId,id,'PLAN_STATE',command.digest,result);return result;
    }));
  }
}
