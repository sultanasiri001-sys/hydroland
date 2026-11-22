import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { requirePlatformFinanceApprover } from '../finance/finance-operation-grant.service';

type Kind = 'INSTRUCTOR' | 'MARINE_OPERATOR';
type Target = {kind:Kind; targetId:string; targetName:string; scopeKey:string};
type Tx = Prisma.TransactionClient;
const reviewOrder = {sequence: 'desc'} as const;
const summary = {id:true, centerId:true, centerName:true, kind:true, targetId:true, targetName:true,
  enable:true, reason:true, requestedAt:true, status:true, decisionNote:true, decidedAt:true} as const;

function shortText(value: unknown, label: string) {
  if (typeof value !== 'string' || !value.trim() || value.length > 1000) throw new BadRequestException(label);
  return value.trim();
}

@Injectable()
export class InvoicePermissionsService {
  constructor(private readonly db: DatabaseService) {}

  private centers(tx: Tx, actor: string, id?: string) {
    return tx.organization.findMany({
      where:{id, kind:'DIVE_CENTER', status:'ACTIVE', members:{some:{
        accountId:actor, status:'ACTIVE',
        account:{status:'ACTIVE',roleAssignments:{some:{role:'DIVE_CENTER',status:'ACTIVE'}}},
        OR:[{role:'ADMIN'},{role:'OWNER',organization:{ownerId:actor}}],
      }}}, select:{id:true,displayName:true}, orderBy:[{displayName:'asc'},{id:'asc'}],
    });
  }

  listCenters(actor: string) { return this.centers(this.db,actor); }

  private async managedCenter(tx: Tx, actor: string, centerId: string) {
    const [center] = await this.centers(tx, actor, centerId);
    if (!center) throw new ForbiddenException('يتطلب الطلب صلاحية إدارة المركز.');
    return center;
  }

  private targets(center: {id:string; displayName:string}): Target[] {
    const activities: Kind[]=['INSTRUCTOR','MARINE_OPERATOR'];
    return activities.map(kind=>({kind,targetId:center.id,targetName:center.displayName,scopeKey:this.scope(kind,center.id)}));
  }

  async centerView(actor: string, centerId: string) {
    return this.db.$transaction(async tx=>{
      const center=await this.managedCenter(tx,actor,centerId);
      const targets=this.targets(center);
      const requests=await tx.invoicePermissionRequest.findMany({where:{centerId,targetId:centerId},select:summary,orderBy:reviewOrder});
      return {targets:targets.map(({scopeKey,...target})=>{
        const history=requests.filter(row=>row.kind===target.kind);
        return {...target,enabled:history.find(row=>row.status==='APPROVED')?.enable ?? true,
          pending:history.some(row=>row.status==='PENDING')};
      }),requests};
    },{isolationLevel:'RepeatableRead'});
  }

  private scope(kind:string,centerId:string) { return 'center:'+centerId+':'+kind; }

  private latest(tx: Tx, scopeKey: string) {
    return tx.invoicePermissionRequest.findFirst({where:{scopeKey,status:'APPROVED'},orderBy:reviewOrder});
  }

  async submit(actor: string, centerId: string, input: Record<string,unknown>) {
    const {kind,targetId,enable,requestId} = input ?? {};
    if ((kind!=='INSTRUCTOR' && kind!=='MARINE_OPERATOR') || typeof targetId!=='string' || !targetId ||
        typeof enable!=='boolean' || typeof requestId!=='string' || !/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(requestId)) {
      throw new BadRequestException('اختر نوع الخدمة والإجراء المطلوب.');
    }
    const reason=shortText(input.reason,'أدخل سبب طلب الفوترة.');
    return this.db.serializable(async tx=>{
      const center=await this.managedCenter(tx,actor,centerId);
      const previous=await tx.invoicePermissionRequest.findUnique({where:{id:requestId},select:{...summary,requestedBy:true}});
      if (previous) {
        if (previous.requestedBy===actor && previous.centerId===centerId && previous.kind===kind &&
          previous.targetId===targetId && previous.enable===enable && previous.reason===reason) return tx.invoicePermissionRequest.findUniqueOrThrow({where:{id:requestId},select:summary});
        throw new ConflictException('تغيّرت تفاصيل الطلب. أعد تحميل القائمة.');
      }
      const scopeKey=this.scope(kind,centerId);
      const last=await this.latest(tx,scopeKey);
      if(targetId!==centerId) throw new NotFoundException('تصدر الفاتورة باسم المركز فقط.');
      if((last?.enable??true)===enable) throw new ConflictException('الحالة المطلوبة مطبّقة بالفعل.');
      const result=await tx.invoicePermissionRequest.createMany({data:{id:requestId,pendingKey:scopeKey,scopeKey,centerId,
        centerName:center.displayName,kind,targetId,targetName:center.displayName,enable,reason,requestedBy:actor},skipDuplicates:true});
      if (!result.count) throw new ConflictException('يوجد طلب قيد المراجعة. حدّث القائمة.');
      return tx.invoicePermissionRequest.findUniqueOrThrow({where:{id:requestId},select:summary});
    });
  }

  async queue(actor: string) {
    return this.db.$transaction(async tx => {
      await requirePlatformFinanceApprover(tx, actor);
      return tx.invoicePermissionRequest.findMany({where:{status:'PENDING',scopeKey:{startsWith:'center:'}}, select:summary, orderBy:{sequence:'asc'}});
    }, {isolationLevel:'RepeatableRead'});
  }

  async decide(actor: string, id: string, input: Record<string,unknown>) {
    const decision=input?.decision;
    if (decision!=='APPROVED' && decision!=='REJECTED') throw new BadRequestException('اختر اعتماد أو رفض.');
    const decisionNote=decision==='REJECTED' ? shortText(input.note,'أدخل سبب الرفض.') :
      (input.note ? shortText(input.note,'تحقق من ملاحظة القرار.') : null);
    return this.db.serializable(async tx=>{
      const owner=await requirePlatformFinanceApprover(tx,actor);
      const row=await tx.invoicePermissionRequest.findUnique({where:{id}});
      if (!row) throw new NotFoundException();
      if (row.status!=='PENDING') {
        if (row.status===decision && row.decidedBy===owner.id && row.decisionNote===decisionNote) return tx.invoicePermissionRequest.findUniqueOrThrow({where:{id},select:summary});
        throw new ConflictException('سبق البت في الطلب.');
      }
      if(row.targetId!==row.centerId || row.scopeKey!==this.scope(row.kind,row.centerId)) throw new ConflictException('الطلب غير مرتبط بفوترة المركز.');
      if(decision==='APPROVED') await this.managedCenter(tx,row.requestedBy,row.centerId);
      const saved=await tx.invoicePermissionRequest.updateMany({where:{id,status:'PENDING'},data:{
        status:decision,decidedBy:owner.id,decidedAt:new Date(),pendingKey:null,decisionNote,
      }});
      if (!saved.count) throw new ConflictException('تغيّرت حالة الطلب.');
      await tx.auditEvent.create({data:{actorId:owner.personId,action:'INVOICE_PERMISSION_'+decision,resource:'InvoicePermissionRequest',resourceId:id,
        metadata:{centerId:row.centerId,targetId:row.targetId,kind:row.kind,enable:row.enable,requestedBy:row.requestedBy}}});
      return tx.invoicePermissionRequest.findUniqueOrThrow({where:{id},select:summary});
    });
  }
}
