import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { cooperationSources } from './cooperation-contract-sources';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { lockAccountIdentities, requireVerifiedAdmin } from '../admin/admin-authorization';
import { platformOrganization } from '../hr/staffing-catalog';
import { assertContractRevision, CONTRACT_DEPARTMENT, CONTRACT_FIELDS, CONTRACT_IDENTITY, contractHash, contractKeys, contractRecord, contractText, contractValues, COOPERATION_CODE, CooperationPayload, readCooperation } from './cooperation-contract.domain';
import { publishedCooperationTemplate } from './contract-library.domain';

const include = { template: true, lifecycleEvents: { orderBy: [{ occurredAt: 'asc' as const }, { id: 'asc' as const }] } };
type Contract = Prisma.ManagedDocumentGetPayload<{ include: typeof include }>;
type Tx = Prisma.TransactionClient;
const json = (value: unknown) => value as Prisma.InputJsonValue;
const signatureActions = ['CONTRACT_SIGN_CENTER', 'CONTRACT_SIGN_PROFESSIONAL'];

@Injectable()
export class CooperationContractService {
  constructor(private readonly db: DatabaseService) {}

  private async actor(tx: Tx, id: string) {
    const actor = await tx.account.findFirst({ where: { id, status: 'ACTIVE', emailVerifiedAt: { not: null } }, select: { id: true, personId: true, person: { select: { firstName: true, lastName: true } } } });
    if (!actor) throw new ForbiddenException('يلزم حساب نشط ببريد متحقق منه.');
    return actor;
  }
  private async isPlatformOwner(tx: Tx, id: string) {
    const org = await platformOrganization(tx);
    if (!org || org.ownerId !== id) return false;
    await requireVerifiedAdmin(tx, id);
    return true;
  }
  private async center(tx: Tx, id: string, accountId: string) {
    const member = await tx.organizationMember.findFirst({ where: { organizationId: id, accountId, status: 'ACTIVE', role: { in: ['OWNER', 'ADMIN'] }, organization: { status: 'ACTIVE', kind: 'DIVE_CENTER' } }, include: { organization: true } });
    if (!member) throw new ForbiddenException('يلزم ممثل مفوض بعضوية إدارة نشطة في مركز الغوص.');
    return member.organization;
  }
  private async professional(tx: Tx, id: string) {
    const actor = await this.actor(tx, id);
    const role = await tx.roleAssignment.findFirst({ where: { accountId: id, role: 'INSTRUCTOR', status: 'ACTIVE' } });
    if (!role) throw new ForbiddenException('حساب المحترف يحتاج صلاحية محترف غوص نشطة.');
    return actor;
  }
  private signatures(d: Contract) {
    const payload=readCooperation(d.payload);
    const result=d.lifecycleEvents.filter(e => e.version === d.version && signatureActions.includes(e.action)).map(e => {
      const m = contractRecord(e.metadata);
      const expected=e.action===signatureActions[0]?payload.centerAccountId:payload.professionalAccountId;
      if (e.actorAccountId!==expected||m.consent!==true||m.contentHash !== d.contentHash || typeof m.signedName !== 'string' || m.method !== 'AUTHENTICATED_ACKNOWLEDGEMENT') throw new ConflictException('أدلة توقيع العقد تحتاج مراجعة.');
      return { role: e.action === signatureActions[0] ? 'CENTER' : 'PROFESSIONAL', accountId: e.actorAccountId, name: m.signedName, at: e.occurredAt, contentHash: d.contentHash, method: m.method };
    });
    if(result.length>2||new Set(result.map(s=>s.role)).size!==result.length)throw new ConflictException('توجد أدلة توقيع متعارضة.');
    return result;
  }
  private async context(tx: Tx, actorId: string, id: string) {
    const actor = await this.actor(tx, actorId);
    const d = await tx.managedDocument.findUnique({ where: { id }, include });
    if (!d || d.template.code !== COOPERATION_CODE) throw new NotFoundException('العقد غير موجود.');
    const payload = readCooperation(d.payload), owner = await this.isPlatformOwner(tx, actorId);
    const isCenter = actorId === payload.centerAccountId;
    const isProfessional = actorId === payload.professionalAccountId;
    if (!owner && !isCenter && !isProfessional) throw new ForbiddenException('العقد متاح لطرفيه ومالك هيدرولاند فقط.');
    if (isCenter) await this.center(tx, d.organizationId, actorId);
    if (isProfessional) await this.professional(tx, actorId);
    if (!d.documentBrandVersion || contractHash(payload, d.templateId, d.documentBrandVersion) !== d.contentHash) throw new ConflictException('بصمة محتوى العقد غير متطابقة.');
    return { actor, d, payload, owner, isCenter, isProfessional };
  }
  private async lock(tx: Tx, actorId: string, id: string) {
    // Claim a document row in addition to serializable isolation: two signatures,
    // revision/issue, and approval/return cannot silently overwrite one another.
    const row = await tx.managedDocument.findUnique({ where: { id }, select: { payload: true, organizationId: true } });
    if (!row) throw new NotFoundException('العقد غير موجود.');
    const payload = readCooperation(row.payload), platform = await platformOrganization(tx);
    await lockAccountIdentities(tx, [actorId, payload.centerAccountId, payload.professionalAccountId, ...(platform ? [platform.ownerId] : [])]);
    await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id"::text=${row.organizationId} FOR SHARE`;
    if (platform) await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id"::text=${platform.id} FOR SHARE`;
    await tx.$queryRaw`SELECT "id" FROM "OrganizationMember" WHERE "organizationId"::text=${row.organizationId} AND "accountId"::text=${payload.centerAccountId} FOR SHARE`;
    await tx.$queryRaw`SELECT "id" FROM "RoleAssignment" WHERE "accountId"::text=${payload.professionalAccountId} AND "role"='INSTRUCTOR' FOR SHARE`;
    await tx.$queryRaw`SELECT "id" FROM "ManagedDocument" WHERE "id"::text=${id} FOR UPDATE`;
    return this.context(tx, actorId, id);
  }
  private async event(tx: Tx, d: Contract, actorId: string, action: string, toStatus = d.status, metadata: unknown = {}) {
    await tx.documentLifecycleEvent.create({ data: { documentId: d.id, actorAccountId: actorId, action, fromStatus: d.status, toStatus, version: d.version, metadata: json(metadata) } });
    const actor = await tx.account.findUniqueOrThrow({ where: { id: actorId }, select: { personId: true } });
    await tx.auditEvent.create({ data: { actorId: actor.personId, action, resource: 'ManagedDocument', resourceId: d.id, metadata: json({ organizationId: d.organizationId, version: d.version, contentHash: d.contentHash, ...contractRecord(metadata) }) } });
  }
  private async present(tx: Tx, c: Awaited<ReturnType<CooperationContractService['context']>>) {
    const { d, payload, actor, owner, isCenter, isProfessional } = c;
    const signatures = this.signatures(d);
    const source=d.status==='DRAFT'||d.status==='PENDING_APPROVAL'?await cooperationSources(tx,d.organizationId,payload.centerAccountId,payload.professionalAccountId):null;
    const sourceChanged=Boolean(source&&source.snapshot.fingerprint!==payload.sourceSnapshot?.fingerprint);
    const missingSourceFields=source?CONTRACT_FIELDS.filter(([section,key])=>section!=='terms'&&!source.values[section][key]).map(([section,key,label])=>({section,key,label})):[];
    const complete = signatures.length === 2 && new Set(signatures.map(s => s.role)).size === 2;
    const approval = d.lifecycleEvents.find(e => e.version === d.version && e.action === 'CONTRACT_PLATFORM_APPROVED');
    const approvalMetadata=approval?contractRecord(approval.metadata):null;
    if(approvalMetadata&&(approvalMetadata.contentHash!==d.contentHash||typeof approvalMetadata.decisionId!=='string'||approvalMetadata.kind!=='INTERNAL_PLATFORM_APPROVAL')||d.status==='SIGNED'&&(!approval||!complete))throw new ConflictException('دليل اعتماد العقد غير مكتمل.');
    const branding = await tx.documentBrandSnapshot.findUnique({ where: { organizationId_brandVersion: { organizationId: d.organizationId, brandVersion: d.documentBrandVersion! } } });
    if (!branding) throw new ConflictException('نسخة هوية المركز غير متاحة.');
    const centerActor = await tx.account.findUniqueOrThrow({ where: { id: payload.centerAccountId }, select: { person: { select: { firstName: true, lastName: true } } } });
    const professionalActor = await tx.account.findUniqueOrThrow({ where: { id: payload.professionalAccountId }, select: { person: { select: { firstName: true, lastName: true } } } });
    const name = (a: typeof centerActor) => [a.person.firstName, a.person.lastName].filter(Boolean).join(' ');
    return {
      id: d.id, organizationId: d.organizationId, referenceNumber: d.referenceNumber, version: d.version, contentHash: d.contentHash,
      status: d.status === 'ARCHIVED' ? 'REJECTED' : d.status === 'DRAFT' ? 'DRAFT' : d.status === 'SIGNED' ? 'APPROVED' : complete ? 'AWAITING_PLATFORM_APPROVAL' : 'AWAITING_SIGNATURES',
      sources:{automatic:true,capturedAt:payload.sourceSnapshot?.capturedAt??null,changed:sourceChanged,missing:missingSourceFields},
      librarySource:payload.librarySource??null,
      values: { center: payload.center, professional: payload.professional, terms: payload.terms }, clauses: payload.clauses,
      fields: CONTRACT_FIELDS.map(([section, key, label, max]) => ({ section, key, label, max })),
      branding: { brandVersion: branding.brandVersion, name: branding.brandNameAr || branding.brandNameEn, logoAssetId: branding.logoAssetId },
      participants: { centerAccountId: payload.centerAccountId, professionalAccountId: payload.professionalAccountId, centerName: name(centerActor), professionalName: name(professionalActor) },
      signatures, seal: approval&&approvalMetadata ? { accountId: approval.actorAccountId, at: approval.occurredAt, decisionId: approvalMetadata.decisionId as string, contentHash:d.contentHash, kind:'INTERNAL_PLATFORM_APPROVAL' } : null,
      signatureName: [actor.person.firstName, actor.person.lastName].filter(Boolean).join(' '),
      capabilities: {
        manageCenterProfile:isCenter,manageMemberProfile:isProfessional,editCenter:false, editProfessional:false, editTerms:d.status==='DRAFT'&&(isCenter||owner), sync:d.status==='DRAFT', review:(d.status==='DRAFT'||d.status==='PENDING_APPROVAL')&&owner&&!isCenter&&!isProfessional,
        issue: d.status === 'DRAFT' && isCenter,
        sign: d.status === 'PENDING_APPROVAL' && (isCenter || isProfessional) && !signatures.some(s => s.accountId === actor.id),
        approve: d.status === 'PENDING_APPROVAL' && complete && owner && !isCenter && !isProfessional,
        return: d.status === 'PENDING_APPROVAL' && (owner || isCenter || isProfessional),
      },
      history: d.lifecycleEvents.map(e => ({ action: e.action, version: e.version, at: e.occurredAt, accountId: e.actorAccountId, ...(['CONTRACT_RETURNED','CONTRACT_PLATFORM_REJECTED','CONTRACT_PLATFORM_COMMENTED','CONTRACT_PLATFORM_APPROVED'].includes(e.action) ? { reason: contractRecord(e.metadata).reason } : {}) })),
    };
  }

  async workspace(actorId: string) {
    return this.db.serializable(async tx => {
      await this.actor(tx, actorId);
      const owner = await this.isPlatformOwner(tx, actorId);
      const memberships = await tx.organizationMember.findMany({ where: { accountId: actorId, status: 'ACTIVE', role: { in: ['OWNER', 'ADMIN'] }, organization: { kind: 'DIVE_CENTER', status: 'ACTIVE' } }, select: { organization: { select: { id: true, displayName: true } } } });
      return { owner, centers: memberships.map(m => m.organization), identityVersion: CONTRACT_IDENTITY };
    });
  }
  async list(actorId: string, cursor?: string) {
    if (cursor && !/^[a-zA-Z0-9-]{1,80}$/.test(cursor)) throw new BadRequestException('مؤشر القائمة غير صالح.');
    return this.db.serializable(async tx => {
      await this.actor(tx, actorId);
      const owner = await this.isPlatformOwner(tx, actorId);
      const rows = await tx.managedDocument.findMany({ where: { template: { code: COOPERATION_CODE }, ...(owner ? {} : { OR: [{ createdByAccountId: actorId }, { payload: { path: ['professionalAccountId'], equals: actorId } }] }), ...(cursor ? { id: { lt: cursor } } : {}) }, orderBy: { id: 'desc' }, take: 21, select: { id: true } });
      const items = [];
      for (const row of rows.slice(0, 20)) {
        try { items.push(await this.present(tx, await this.context(tx, actorId, row.id))); }
        catch (error) { if (!(error instanceof ForbiddenException)) throw error; }
      }
      return { items, nextCursor: rows.length > 20 ? rows[19].id : null };
    });
  }
  async get(actorId: string, id: string) { return this.db.serializable(async tx => this.present(tx, await this.context(tx, actorId, id))); }

  async create(actorId: string, body: unknown) {
    const x = contractKeys(body, ['organizationId', 'professionalEmail']);
    const organizationId = contractText(x.organizationId, 80), email = contractText(x.professionalEmail, 254).toLowerCase();
    if (!organizationId || !/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(email)) throw new BadRequestException('حدد المركز والبريد المسجل للمحترف.');
    return this.db.serializable(async tx => {
      const actor = await this.actor(tx, actorId), org = await this.center(tx, organizationId, actorId);
      const professional = await tx.account.findFirst({ where: { email: { equals: email, mode: 'insensitive' }, status: 'ACTIVE', emailVerifiedAt: { not: null }, roleAssignments: { some: { role: 'INSTRUCTOR', status: 'ACTIVE' } } }, select: { id: true, person: { select: { firstName: true, lastName: true } } } });
      if (!professional) throw new NotFoundException('تعذر إنشاء العقد؛ تحقق من أهلية الحساب والبريد المسجل للمحترف.');
      if (actorId === professional.id) throw new BadRequestException('يجب أن يكون ممثل المركز والمحترف حسابين مستقلين.');
      await lockAccountIdentities(tx, [actorId, professional.id]);
      await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id"::text=${organizationId} FOR SHARE`;
      // Recheck authority after identity locks, within the write transaction.
      await this.actor(tx, actorId); await this.center(tx, organizationId, actorId); await this.professional(tx, professional.id);
      const library=await publishedCooperationTemplate(tx);
      // A small organization-scoped binding retains the existing document FK;
      // the central library owns the clauses and their approval/version history.
      let template=await tx.documentTemplate.findFirst({where:{organizationId,code:COOPERATION_CODE,fields:{path:['libraryTemplateId'],equals:library.row.id}}});
      if(!template){
        const latest=await tx.documentTemplate.findFirst({where:{organizationId,code:COOPERATION_CODE},orderBy:{version:'desc'},select:{version:true}});
        template=await tx.documentTemplate.create({data:{organizationId,code:COOPERATION_CODE,version:(latest?.version??0)+1,titleAr:library.row.titleAr,titleEn:library.row.titleEn,department:CONTRACT_DEPARTMENT,fields:{kind:'CONTRACT_LIBRARY_BINDING_V1',libraryTemplateId:library.row.id,libraryVersion:library.row.version,libraryContentHash:library.envelope.contentHash}}});
      }
      if (template.status !== 'ACTIVE') throw new ConflictException('نموذج العقد غير متاح.');
      await tx.documentBrandSnapshot.upsert({ where: { organizationId_brandVersion: { organizationId, brandVersion: org.documentBrandVersion } }, create: { organizationId, brandVersion: org.documentBrandVersion, logoAssetId: org.documentLogoAssetId, brandNameAr: org.documentBrandNameAr || org.displayName, brandNameEn: org.documentBrandNameEn, footerAr: org.documentFooterAr, footerEn: org.documentFooterEn }, update: {} });
      const source=await cooperationSources(tx,organizationId,actorId,professional.id);
      const values=source.values;
      const payload: CooperationPayload = { ...values, workflow: 'DIVE_COOPERATION_V1', identityVersion: CONTRACT_IDENTITY, centerAccountId: actorId, professionalAccountId: professional.id, sourceSnapshot:source.snapshot, librarySource:{templateId:library.row.id,version:library.row.version,contentHash:library.envelope.contentHash}, clauses: [...library.envelope.content.clauses] };
      const year = new Date().getUTCFullYear();
      const counter = await tx.documentReferenceCounter.upsert({ where: { organizationId_department_year: { organizationId, department: CONTRACT_DEPARTMENT, year } }, create: { organizationId, department: CONTRACT_DEPARTMENT, year, lastNumber: 1 }, update: { lastNumber: { increment: 1 } } });
      const document = await tx.managedDocument.create({ data: { organizationId, templateId: template.id, department: CONTRACT_DEPARTMENT, referenceNumber: `HYD-LEG-${year}-${String(counter.lastNumber).padStart(6, '0')}`, documentBrandVersion: org.documentBrandVersion, createdByAccountId: actorId, contentHash: contractHash(payload, template.id, org.documentBrandVersion), payload: json(payload) }, include });
      await tx.documentRevision.create({ data: { documentId: document.id, version: 1, contentHash: document.contentHash, payload: json(payload), createdByAccountId: actorId } });
      await this.event(tx, document, actorId, 'CONTRACT_CREATED');
      await tx.notification.create({ data: { accountId: professional.id, type: 'CONTRACT_FIELDS_REQUIRED', payload: { documentId: document.id, referenceNumber: document.referenceNumber } } });
      return this.present(tx, await this.context(tx, actorId, document.id));
    });
  }
  async sync(actorId:string,id:string,body:unknown){
    const x=contractKeys(body,['expectedVersion','expectedContentHash']);
    return this.db.serializable(async tx=>{
      const c=await this.lock(tx,actorId,id),{d,payload}=c;
      assertContractRevision(x,d);
      if(d.status!=='DRAFT')throw new ConflictException('تعاد النسخة للتعديل قبل تحديث بيانات العضوية.');
      const source=await cooperationSources(tx,d.organizationId,payload.centerAccountId,payload.professionalAccountId);
      if(source.snapshot.fingerprint===payload.sourceSnapshot?.fingerprint)return this.present(tx,c);
      const org=await tx.organization.findUniqueOrThrow({where:{id:d.organizationId}});
      await tx.documentBrandSnapshot.upsert({where:{organizationId_brandVersion:{organizationId:d.organizationId,brandVersion:org.documentBrandVersion}},create:{organizationId:d.organizationId,brandVersion:org.documentBrandVersion,logoAssetId:org.documentLogoAssetId,brandNameAr:org.documentBrandNameAr||org.displayName,brandNameEn:org.documentBrandNameEn,footerAr:org.documentFooterAr,footerEn:org.documentFooterEn},update:{}});
      const next:CooperationPayload={...payload,center:source.values.center,professional:source.values.professional,sourceSnapshot:source.snapshot};
      const hash=contractHash(next,d.templateId,org.documentBrandVersion);
      const updated=await tx.managedDocument.update({where:{id},data:{version:{increment:1},payload:json(next),contentHash:hash,documentBrandVersion:org.documentBrandVersion},include});
      await tx.documentRevision.create({data:{documentId:id,version:updated.version,contentHash:hash,payload:json(next),createdByAccountId:actorId}});
      await this.event(tx,updated,actorId,'CONTRACT_SOURCES_SYNCED');
      return this.present(tx,await this.context(tx,actorId,id));
    });
  }
  async save(actorId: string, id: string, body: unknown) {
    const x = contractKeys(body, ['expectedVersion', 'expectedContentHash', 'values']);
    const values = contractKeys(x.values, ['terms','center','professional']);
    return this.db.serializable(async tx => {
      const c = await this.lock(tx, actorId, id), { d, payload } = c;
      assertContractRevision(x, d);
      if (d.status !== 'DRAFT') throw new ConflictException('أعد العقد للتعديل أولًا؛ لا يمكن تغيير نسخة قيد التوقيع أو معتمدة.');
      if ((!c.isCenter&&!c.owner)||Object.keys(values).some(k=>k!=='terms')) throw new ForbiddenException('بيانات الطرفين تسحب من ملفاتهما فقط؛ تعديل شروط العقد للمركز أو هيدرولاند.');
      const next: CooperationPayload = { ...payload, ...contractValues({ center: payload.center, professional: payload.professional, terms: values.terms??payload.terms }) };
      const contentHash = contractHash(next, d.templateId, d.documentBrandVersion!);
      if (contentHash === d.contentHash) return this.present(tx, c);
      const updated = await tx.managedDocument.update({ where: { id }, data: { version: { increment: 1 }, payload: json(next), contentHash }, include });
      await tx.documentRevision.create({ data: { documentId: id, version: updated.version, contentHash, payload: json(next), createdByAccountId: actorId } });
      await this.event(tx, updated, actorId, 'CONTRACT_FIELDS_SAVED');
      return this.present(tx, await this.context(tx, actorId, id));
    });
  }
  private async assertSourcesCurrent(tx:Tx,d:Contract,payload:CooperationPayload){
    const source=await cooperationSources(tx,d.organizationId,payload.centerAccountId,payload.professionalAccountId);
    if(source.snapshot.fingerprint!==payload.sourceSnapshot?.fingerprint)throw new ConflictException('تغيرت بيانات العضوية أو المركز؛ أعد العقد للتعديل وحدّث بياناته ثم راجع الإصدار الجديد.');
    return source;
  }
  async issue(actorId: string, id: string, body: unknown) {
    const x = contractKeys(body, ['expectedVersion', 'expectedContentHash']);
    return this.db.serializable(async tx => {
      const c = await this.lock(tx, actorId, id), { d, payload } = c;
      assertContractRevision(x, d);
      if (!c.isCenter) throw new ForbiddenException('إرسال العقد للتوقيع من صلاحية ممثل المركز.');
      if (d.status !== 'DRAFT') throw new ConflictException('العقد ليس في حالة تعبئة.');
      await this.assertSourcesCurrent(tx,d,payload);
      if (CONTRACT_FIELDS.some(([section, key]) => !payload[section][key])) throw new BadRequestException('استكمل بيانات الطرفين والشروط قبل إرسال العقد للتوقيع.');
      await this.professional(tx, payload.professionalAccountId);
      await tx.managedDocument.update({ where: { id }, data: { status: 'PENDING_APPROVAL' } });
      await this.event(tx, d, actorId, 'CONTRACT_ISSUED', 'PENDING_APPROVAL');
      for (const accountId of [payload.centerAccountId, payload.professionalAccountId]) await tx.notification.create({ data: { accountId, type: 'CONTRACT_SIGNATURE_REQUIRED', payload: { documentId: id, version: d.version } } });
      return this.present(tx, await this.context(tx, actorId, id));
    });
  }
  async sign(actorId: string, id: string, body: unknown) {
    const x = contractKeys(body, ['expectedVersion', 'expectedContentHash', 'signatureName', 'consent']);
    const signedName = contractText(x.signatureName, 240);
    if (x.consent !== true || !signedName) throw new BadRequestException('راجع العقد وأقر بالتوقيع الإلكتروني باسمك.');
    return this.db.serializable(async tx => {
      const c = await this.lock(tx, actorId, id), { d, payload } = c;
      assertContractRevision(x, d);
      if (!c.isCenter && !c.isProfessional) throw new ForbiddenException('لا يمكن التوقيع نيابة عن أحد الطرفين.');
      const accountName = [c.actor.person.firstName, c.actor.person.lastName].filter(Boolean).join(' ').trim().normalize('NFC');
      if (signedName !== accountName) throw new BadRequestException('استخدم اسمك المسجل الظاهر في خانة التوقيع.');
      if (d.status !== 'PENDING_APPROVAL') throw new ConflictException('العقد غير متاح للتوقيع.');
      await this.assertSourcesCurrent(tx,d,payload);
      const signatures = this.signatures(d);
      if (signatures.some(s => s.accountId === actorId)) return this.present(tx, c); // Safe lost-response retry.
      const action = c.isCenter ? signatureActions[0] : signatureActions[1];
      await this.event(tx, d, actorId, action, d.status, { signedName, contentHash: d.contentHash, method: 'AUTHENTICATED_ACKNOWLEDGEMENT', consent: true });
      // Touch the record so serializable waiters retry against the new evidence.
      await tx.managedDocument.update({ where: { id }, data: { updatedAt: new Date() } });
      if (signatures.length === 1) {
        const platform = await platformOrganization(tx);
        if (platform) await tx.notification.create({ data: { accountId: platform.ownerId, type: 'CONTRACT_PLATFORM_APPROVAL_REQUIRED', payload: { documentId: id, version: d.version } } });
      }
      return this.present(tx, await this.context(tx, actorId, id));
    });
  }
  async decide(actorId: string, id: string, body: unknown) {
    const x = contractKeys(body, ['expectedVersion', 'expectedContentHash', 'action', 'reason', 'reviewed']);
    const reason = contractText(x.reason, 1000);
    if (!['APPROVE', 'RETURN','REJECT','COMMENT'].includes(String(x.action)) || x.reviewed !== true || reason.length < 5) throw new BadRequestException('راجع العقد وحدد الإجراء وسببه.');
    return this.db.serializable(async tx => {
      const c = await this.lock(tx, actorId, id), { d, payload } = c;
      assertContractRevision(x, d);
      if(!['DRAFT','PENDING_APPROVAL'].includes(d.status))throw new ConflictException('هذا العقد مغلق؛ لا يمكن تغيير قراره.');
      if(x.action!=='RETURN'&&(!c.owner||c.isCenter||c.isProfessional))throw new ForbiddenException('قرار هيدرولاند من صلاحية مالك المنصة المستقل عن الطرفين.');
      if(x.action==='COMMENT'){
        await this.event(tx,d,actorId,'CONTRACT_PLATFORM_COMMENTED',d.status,{reason});
        await tx.managedDocument.update({where:{id},data:{updatedAt:new Date()}});
      }else if(x.action==='REJECT'){
        await tx.managedDocument.update({where:{id},data:{status:'ARCHIVED'}});
        await this.event(tx,d,actorId,'CONTRACT_PLATFORM_REJECTED','ARCHIVED',{reason});
      }else if (x.action === 'RETURN') {
        if(d.status!=='PENDING_APPROVAL')throw new ConflictException('العقد مفتوح للتعديل بالفعل.');
        const nextVersion = d.version + 1;
        await tx.managedDocument.update({ where: { id }, data: { status: 'DRAFT', version: nextVersion } });
        await tx.documentRevision.create({ data: { documentId: id, version: nextVersion, contentHash: d.contentHash, payload: json(payload), createdByAccountId: actorId } });
        await this.event(tx, { ...d, version: nextVersion }, actorId, 'CONTRACT_RETURNED', 'DRAFT', { reason, invalidatedVersion: d.version });
      } else {
        if(d.status!=='PENDING_APPROVAL')throw new ConflictException('يلزم إرسال العقد وتوقيع الطرفين قبل الاعتماد.');
        await this.assertSourcesCurrent(tx,d,payload);
        const signatures = this.signatures(d);
        if (signatures.length !== 2 || new Set(signatures.map(s => s.role)).size !== 2) throw new ConflictException('يلزم توقيع الطرفين على الإصدار نفسه أولًا.');
        await this.actor(tx, payload.centerAccountId); await this.center(tx, d.organizationId, payload.centerAccountId); await this.professional(tx, payload.professionalAccountId);
        const at = new Date();
        await tx.managedDocument.update({ where: { id }, data: { status: 'SIGNED', approvedByAccountId: actorId, approvedAt: at, signedByAccountId: signatures[1].accountId, signedAt: signatures[1].at } });
        await this.event(tx, d, actorId, 'CONTRACT_PLATFORM_APPROVED', 'SIGNED', { decisionId: randomUUID(), contentHash: d.contentHash, reason, label: 'اعتماد هيدرولاند', kind: 'INTERNAL_PLATFORM_APPROVAL' });
      }
      for (const accountId of [payload.centerAccountId, payload.professionalAccountId]) await tx.notification.create({ data: { accountId, type: ({RETURN:'CONTRACT_RETURNED',APPROVE:'CONTRACT_APPROVED',REJECT:'CONTRACT_REJECTED',COMMENT:'CONTRACT_COMMENTED'} as Record<string,string>)[String(x.action)], payload: { documentId: id } } });
      return this.present(tx, await this.context(tx, actorId, id));
    });
  }
}
