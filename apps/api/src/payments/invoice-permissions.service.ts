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

  private async targets(tx: Tx, centerId: string): Promise<Target[]> {
    const now = new Date();
    const professionals = await tx.employment.findMany({
      where:{organizationId:centerId, status:'ACTIVE', workerClass:{in:['INDEPENDENT_PROFESSIONAL','CONTRACTOR']},
        AND:[{OR:[{startsAt:null},{startsAt:{lte:now}}]},{OR:[{endsAt:null},{endsAt:{gte:now}}]}],
        account:{status:'ACTIVE',roleAssignments:{some:{role:'INSTRUCTOR',status:'ACTIVE'}}}},
      select:{accountId:true, account:{select:{person:{select:{firstName:true,lastName:true}}}}}, distinct:['accountId'],
    });
    const agreements = await tx.instructorCompensationAgreement.findMany({where:{organizationId:centerId,
      instructorAccountId:{in:professionals.map(p=>p.accountId)}}, orderBy:{revision:'desc'},
      distinct:['instructorAccountId'], select:{instructorAccountId:true,mode:true}});
    const terms = new Map(agreements.map(agreement => [agreement.instructorAccountId, agreement.mode]));
    const eligible = professionals.filter(person => {
      const mode = terms.get(person.accountId);
      return !mode || ['FIXED', 'PERCENTAGE', 'FIXED_PLUS_PERCENTAGE'].includes(mode);
    });
    const boats = await tx.marineAsset.findMany({where:{reviewCenterId:centerId, status:{not:'RETIRED'}},
      distinct:['organizationId'], select:{organizationId:true}});
    const operators = await tx.organization.findMany({where:{id:{in:boats.map(b=>b.organizationId)},kind:'MARINE_OPERATOR',status:'ACTIVE'},
      select:{id:true,displayName:true},orderBy:{displayName:'asc'}});
    return [
      ...eligible.map(p=>({kind:'INSTRUCTOR' as const,targetId:p.accountId,
        targetName:[p.account.person.firstName,p.account.person.lastName].join(' ').trim(),scopeKey:this.scope('INSTRUCTOR',centerId,p.accountId)})),
      ...operators.map(o=>({kind:'MARINE_OPERATOR' as const,targetId:o.id,targetName:o.displayName,scopeKey:this.scope('MARINE_OPERATOR',centerId,o.id)})),
    ];
  }

  async centerView(actor: string, centerId: string) {
    return this.db.$transaction(async tx=>{
      await this.managedCenter(tx,actor,centerId);
      const eligible = await this.targets(tx, centerId);
      const targets = new Map(eligible.map(target => [target.scopeKey, target]));
      const requests = await tx.invoicePermissionRequest.findMany({
        where: {centerId}, select: summary, orderBy: reviewOrder,
      });
      const historicalScopes = requests.filter(row => row.status === 'APPROVED' && row.enable)
        .map(row => this.scope(row.kind, centerId, row.targetId));
      const scopes = [...new Set([...targets.keys(), ...historicalScopes])];
      const approvals = await tx.invoicePermissionRequest.findMany({
        where: {scopeKey: {in: scopes}, status: 'APPROVED'}, distinct: ['scopeKey'], orderBy: reviewOrder,
        select: {scopeKey: true, kind: true, targetId: true, targetName: true, centerId: true, enable: true},
      });
      // The authorizing center can still request closure after an affiliation ends.
      for (const row of approvals) {
        if (row.centerId === centerId && row.enable && !targets.has(row.scopeKey)) {
          targets.set(row.scopeKey, {kind: row.kind as Kind, targetId: row.targetId, targetName: row.targetName, scopeKey: row.scopeKey});
        }
      }
      const pending = await tx.invoicePermissionRequest.findMany({where: {pendingKey: {in: scopes}}, select: {scopeKey: true}});
      const waiting = new Set(pending.map(row => row.scopeKey));
      const enabled = new Map(approvals.map(row => [row.scopeKey, row.enable]));
      return {targets: [...targets.values()].map(({scopeKey, ...target}) => ({
        ...target, enabled: enabled.get(scopeKey) ?? false, pending: waiting.has(scopeKey),
      })), requests};
    },{isolationLevel:'RepeatableRead'});
  }

  private scope(kind: string, centerId: string, targetId: string) {
    return kind === 'INSTRUCTOR' ? 'instructor:' + centerId + ':' + targetId : 'marine:' + targetId;
  }

  private latest(tx: Tx, scopeKey: string) {
    return tx.invoicePermissionRequest.findFirst({where:{scopeKey,status:'APPROVED'},orderBy:reviewOrder});
  }

  async submit(actor: string, centerId: string, input: Record<string,unknown>) {
    const {kind,targetId,enable,requestId} = input ?? {};
    if ((kind!=='INSTRUCTOR' && kind!=='MARINE_OPERATOR') || typeof targetId!=='string' || !targetId ||
        typeof enable!=='boolean' || typeof requestId!=='string' || !/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(requestId)) {
      throw new BadRequestException('اختر صاحب الفاتورة والإجراء المطلوب.');
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
      const scopeKey=this.scope(kind,centerId,targetId);
      const last=await this.latest(tx,scopeKey);
      const target=(await this.targets(tx,centerId)).find(t=>t.scopeKey===scopeKey);
      if (!target && (enable || !last?.enable || last.centerId!==centerId)) throw new NotFoundException('صاحب الفاتورة غير متاح لهذا المركز.');
      if ((last?.enable??false)===enable) throw new ConflictException('الحالة المطلوبة مطبّقة بالفعل.');
      const result=await tx.invoicePermissionRequest.createMany({data:{id:requestId,pendingKey:scopeKey,scopeKey,centerId,
        centerName:center.displayName,kind,targetId,targetName:target?.targetName??last!.targetName,enable,reason,requestedBy:actor},skipDuplicates:true});
      if (!result.count) throw new ConflictException('يوجد طلب قيد المراجعة. حدّث القائمة.');
      return tx.invoicePermissionRequest.findUniqueOrThrow({where:{id:requestId},select:summary});
    });
  }

  async queue(actor: string) {
    return this.db.$transaction(async tx => {
      await requirePlatformFinanceApprover(tx, actor);
      return tx.invoicePermissionRequest.findMany({where:{status:'PENDING'}, select:summary, orderBy:{sequence:'asc'}});
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
      if (decision==='APPROVED' && row.enable) {
        await this.managedCenter(tx,row.requestedBy,row.centerId);
        if (!(await this.targets(tx,row.centerId)).some(t=>t.scopeKey===row.scopeKey))
          throw new ConflictException('تغيّر ارتباط صاحب الفاتورة بالمركز.');
      }
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
