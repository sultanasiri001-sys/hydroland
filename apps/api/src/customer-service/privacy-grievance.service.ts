import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { HYDROLAND_DEPARTMENTS } from '../governance/department-ownership.domain';
import { platformOrganization } from '../hr/staffing-catalog';
import { NotificationsService } from '../notifications/notifications.service';

type Tx = Prisma.TransactionClient;
const week = 7 * 24 * 60 * 60 * 1000;
const topics = [
  { domain: 'technical-identity', ar: 'خصوصية الحساب وصلاحيات الوصول', en: 'Account data and access' },
  { domain: 'bookings', ar: 'بيانات الحجوزات والرحلات', en: 'Booking and trip data' },
  { domain: 'payments', ar: 'بيانات المدفوعات', en: 'Payment data' },
  { domain: 'complaints', ar: 'طلبات بيانات أخرى', en: 'Other personal data requests' },
].map(topic => ({ ...topic, departmentCode: HYDROLAND_DEPARTMENTS.find(d => d.canonicalDomains.includes(topic.domain))!.code }));
const activeAccount = { status: 'ACTIVE', emailVerifiedAt: { not: null } } as const;
const center = { kind: 'DIVE_CENTER', status: 'ACTIVE' } as const;

function affiliation(actor: string): Prisma.OrganizationWhereInput {
  return { ...center, OR: [
    { members: { some: { accountId: actor, status: 'ACTIVE' } } },
    { trips: { some: { bookings: { some: { accountId: actor, status: 'CONFIRMED' } } } } },
  ] };
}
function managedCenters(actor: string): Prisma.OrganizationWhereInput {
  return { ...center, owner: { ...activeAccount }, OR: [
    { ownerId: actor }, { members: { some: { accountId: actor, status: 'ACTIVE', role: { in: ['ADMIN','OWNER'] } } } },
  ] };
}
function field(value: unknown, max = 3000) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new BadRequestException('راجع الحقول المطلوبة وطول النص.');
  return value.trim();
}
function validateKeys(body: Record<string, unknown>, allowed: string[]) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(k => !allowed.includes(k))) throw new BadRequestException('حقول غير معتمدة.');
}

@Injectable()
export class PrivacyGrievanceService {
  constructor(private readonly db: DatabaseService, private readonly audit: AuditService, private readonly alerts: NotificationsService) {}

  private async roles(tx: Tx, actor: string) {
    const account = await tx.account.findFirst({ where: { id: actor, ...activeAccount }, select: { roleAssignments: { where: { status:'ACTIVE' }, select: { role:true } } } });
    if (!account) throw new ForbiddenException();
    const hasStaff = account.roleAssignments.some(r => r.role === 'STAFF');
    const platform = hasStaff ? await platformOrganization(tx) : null;
    const now = new Date();
    const assignments = platform ? await tx.employment.findMany({ where: { accountId:actor, organizationId:platform.id, status:'ACTIVE',
      organization:{ members:{ some:{ accountId:actor, status:'ACTIVE' } } }, orgUnit:{ organizationId:platform.id, type:'DEPARTMENT', active:true },
      AND:[{ OR:[{ startsAt:null }, { startsAt:{ lte:now } }] }, { OR:[{ endsAt:null }, { endsAt:{ gt:now } }] }] }, select:{ orgUnit:{ select:{ code:true } } } }) : [];
    return assignments.map(a => a.orgUnit.code);
  }

  async inbox(actor: string, page: number) {
    if (!Number.isInteger(page) || page < 1 || page > 100000) throw new BadRequestException('رقم الصفحة غير صالح.');
    return this.db.serializable(async tx => {
      const departments = await this.roles(tx, actor);
      const centers = await tx.organization.findMany({ where:affiliation(actor), select:{ id:true, displayName:true }, orderBy:{ displayName:'asc' } });
      const managed = await tx.organization.findMany({ where:managedCenters(actor), select:{ id:true } });
      const managedIds = managed.map(c => c.id);
      const rows = await tx.privacyGrievance.findMany({ where:{ OR:[{ customerId:actor }, { organizationId:{ in:managedIds } },
        { departmentCode:{ in:departments }, escalatedAt:{ not:null } }] }, orderBy:[{ createdAt:'desc' }, { id:'asc' }], skip:(page-1)*25, take:26,
        select:{ id:true, customerId:true, organizationId:true, organization:{ select:{ displayName:true } }, departmentCode:true, description:true,
          state:true, createdAt:true, dueAt:true, escalatedAt:true, centerAction:true, outcome:true } });
      return { centers, topics, page, more:rows.length>25, items:rows.slice(0,25).map(({customerId, organizationId, ...item}) => ({
        ...item, mine:customerId===actor, canCenter:managedIds.includes(organizationId) && (item.state==='CENTER_HANDLING' || item.state==='CENTER_PENDING' && item.dueAt>new Date()),
        canDepartment:item.state==='DEPARTMENT_PENDING' && departments.includes(item.departmentCode),
      })) };
    });
  }

  async submit(actor: string, body: Record<string, unknown>) {
    validateKeys(body, ['centerId','topic','description','requestKey']);
    const organizationId = field(body.centerId,100), description = field(body.description), requestKey = field(body.requestKey,64);
    if (!/^[\w-]{16,64}$/.test(requestKey)) throw new BadRequestException('مفتاح الطلب غير صالح.');
    const topic = topics.find(t => t.domain === body.topic);
    if (!topic) throw new BadRequestException('اختر موضوع الطلب.');
    try {
      return await this.db.serializable(async tx => {
        if (!await tx.account.count({ where:{ id:actor, ...activeAccount } })) throw new ForbiddenException();
        const existing = await tx.privacyGrievance.findUnique({ where:{ customerId_requestKey:{ customerId:actor,requestKey } } });
        if (existing) {
          if (existing.organizationId!==organizationId || existing.description!==description || existing.departmentCode!==topic.departmentCode) throw new ConflictException('مفتاح الإرسال مستخدم لطلب آخر.');
          return { id:existing.id, state:existing.state };
        }
        const org = await tx.organization.findFirst({ where:{ id:organizationId, ...affiliation(actor) }, select:{ ownerId:true } });
        if (!org) throw new ForbiddenException('اختر مركزًا مرتبطًا بحسابك.');
        const now = new Date();
        const row = await tx.privacyGrievance.create({ data:{ customerId:actor, organizationId, requestKey, description,
          departmentCode:topic.departmentCode, createdAt:now, dueAt:new Date(now.getTime()+week) } });
        await this.audit.record({ actorId:actor, resource:'PrivacyGrievance', resourceId:row.id, action:'privacy_grievance.submitted', metadata:{ organizationId, departmentCode:topic.departmentCode } },tx);
        await this.alerts.notify(org.ownerId,'PRIVACY_GRIEVANCE_RECEIVED',{ caseId:row.id, title:'تظلّم جديد لدى المركز', message:'راجع تظلّم المشترك في مهلة أسبوع.' },tx);
        return { id:row.id, state:row.state };
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code!=='P2002') throw error;
      const row = await this.db.privacyGrievance.findUnique({ where:{ customerId_requestKey:{ customerId:actor,requestKey } } });
      if (!row || row.organizationId!==organizationId || row.description!==description || row.departmentCode!==topic.departmentCode) throw new ConflictException();
      return { id:row.id,state:row.state };
    }
  }

  async escalateDue() {
    const cutoff = new Date();
    const due = await this.db.privacyGrievance.findMany({ where:{ state:'CENTER_PENDING', dueAt:{ lte:cutoff } }, select:{ id:true }, orderBy:[{ dueAt:'asc' },{id:'asc'}], take:100 });
    for (const {id} of due) await this.db.serializable(async tx => {
      const result = await tx.privacyGrievance.updateMany({ where:{ id, state:'CENTER_PENDING', dueAt:{ lte:cutoff } }, data:{ state:'DEPARTMENT_PENDING', escalatedAt:cutoff } });
      if (result.count) await this.audit.record({ resource:'PrivacyGrievance', resourceId:id, action:'privacy_grievance.escalated' }, tx);
    });
    return due.length;
  }

  async act(actor: string, id: string, body: Record<string, unknown>) {
    validateKeys(body,['action','message','report']);
    const action=body.action;
    if (action!=='CENTER_HANDLE' && action!=='CENTER_RESOLVE' && action!=='DEPARTMENT_RESOLVE') throw new BadRequestException('اختر إجراءً صالحًا.');
    const message=field(body.message);
    const department = action==='DEPARTMENT_RESOLVE';
    if (!department && body.report!==undefined) throw new BadRequestException('التقرير خاص بالإدارة المختصة.');
    const report=department ? field(body.report) : null;
    return this.db.serializable(async tx => {
      const departments = await this.roles(tx,actor);
      const scoped: Prisma.PrivacyGrievanceWhereInput = department ? { departmentCode:{in:departments},escalatedAt:{not:null} } : { organization:managedCenters(actor) };
      const row = await tx.privacyGrievance.findFirst({ where:{ id,...scoped }, include:{ organization:{ select:{ ownerId:true } } } });
      if (!row) throw new NotFoundException();
      const now = new Date();
      if (department ? row.state!=='DEPARTMENT_PENDING' : !(row.state==='CENTER_HANDLING' || row.state==='CENTER_PENDING' && now<row.dueAt)) throw new ConflictException('تغيرت مرحلة الطلب. حدّث القائمة.');
      if (action==='CENTER_HANDLE') {
        if (row.state!=='CENTER_PENDING') throw new ConflictException('سُجّل إجراء المركز.');
        await tx.privacyGrievance.update({ where:{id},data:{state:'CENTER_HANDLING',centerAction:message} });
      } else {
        if (department) {
          const office = await platformOrganization(tx);
          if (!office || !await tx.account.count({ where:{ id:office.ownerId,...activeAccount,roleAssignments:{some:{role:'ADMIN',status:'ACTIVE'}} } })) throw new ConflictException('تعذّر تحديد مستلم التقرير في الإدارة العليا.');
          await this.alerts.notify(office.ownerId,'PRIVACY_GRIEVANCE_REPORT',{caseId:id,title:'تقرير معالجة تظلّم',message:report,departmentCode:row.departmentCode},tx);
        }
        await tx.privacyGrievance.update({where:{id},data:{state:'RESOLVED',outcome:message,resolvedAt:now}});
        for (const [accountId,type] of [[row.customerId,'PRIVACY_GRIEVANCE_MEMBER_RESULT'],[row.organization.ownerId,'PRIVACY_GRIEVANCE_CENTER_RESULT']])
          await this.alerts.notify(accountId,type,{caseId:id,title:'نتيجة معالجة التظلّم',message},tx);
      }
      await this.audit.record({actorId:actor,resource:'PrivacyGrievance',resourceId:id,action:'privacy_grievance.'+action.toLowerCase()},tx);
      return {id,state:action==='CENTER_HANDLE'?'CENTER_HANDLING':'RESOLVED'};
    });
  }
}
