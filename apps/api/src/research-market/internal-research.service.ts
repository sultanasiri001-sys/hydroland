import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InternalResearchInitiative, InternalResearchReview, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { lockAccountIdentities } from '../admin/admin-authorization';
import { boundedNote, eligibleReviewParticipant, reviewPlatform, reviewSource, validExpiry } from '../document-forms/internal-document-review.domain';
import { scopeId } from '../document-forms/owner-administrative-decision.domain';
import { templateObject } from '../document-forms/document-template-input';
import { validateDocumentPayload } from '../document-forms/document-payload';
import { jsonDigest, RESEARCH_DEPARTMENT, RESEARCH_NOTICE, RESEARCH_POLICY, researchAssignmentInput, researchContent, ResearchContent, researchCreateInput, ResearchPhase, researchRecordDigest, researchRevisionDigest, researchRevisionInput, ResearchSection, researchTransitionInput, researchVersion, SavedResearchSection } from './internal-research.domain';

type Tx = Prisma.TransactionClient;
type Platform = Awaited<ReturnType<typeof reviewPlatform>>;
type Row = InternalResearchInitiative;
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const reviewDigest = (value: Omit<InternalResearchReview,'recordDigest'>) => jsonDigest(value);
const phaseState = (phase: ResearchPhase) => phase === 'PROPOSAL' ? 'PROPOSAL_REVIEW' : 'RESULT_REVIEW';
const returnState = (phase: ResearchPhase) => phase === 'PROPOSAL' ? 'PROPOSED' : 'ACTIVE';

@Injectable()
export class InternalResearchService {
  constructor(private readonly db: DatabaseService) {}

  private async owner(tx: Tx, actorId: string) {
    const p = await reviewPlatform(tx);
    if (p.ownerId !== actorId) throw new ForbiddenException('سجل البحث الداخلي لمالك الجهة المتحقق؛ المراجع يطّلع على تكليفه المحدد فقط.');
    return p;
  }
  private async row(tx: Tx, org: string, id: string) {
    const row = await tx.internalResearchInitiative.findFirst({ where: { id, organizationId: org } });
    if (!row) throw new NotFoundException('سجل البحث غير متاح.');
    researchContent(row);
    if (researchRecordDigest(row) !== row.recordDigest) throw new ConflictException('بصمة سجل البحث غير متسقة.');
    const revision = await tx.internalResearchRevision.findUnique({ where: { initiativeId_revision: { initiativeId: id, revision: row.revision } } });
    if (!revision) throw new ConflictException('إصدار سجل البحث غير متاح.');
    const { recordDigest, ...snapshot } = revision;
    if (researchRevisionDigest(snapshot) !== recordDigest || (revision.snapshot as unknown as Row).recordDigest !== row.recordDigest) throw new ConflictException('تاريخ إصدار سجل البحث غير متسق.');
    return row;
  }
  private reviewRecord(row: InternalResearchReview) {
    const { recordDigest, ...v } = row;
    if (reviewDigest(v) !== recordDigest || !['PROPOSAL','RESULT'].includes(row.phase) || !['ACTIVE','REVOKED','APPROVED','RETURNED','REJECTED'].includes(row.state)) throw new ConflictException('سجل مراجعة البحث غير متسق.');
    return row;
  }
  private async resolve(tx: Tx, org: string, section: ResearchSection) {
    const references = [], views = [], authorPersonIds: string[] = [];
    for (const e of section.evidence) {
      const source = await reviewSource(tx, org, e.documentId), d = source.d;
      if (d.department !== RESEARCH_DEPARTMENT) throw new ForbiddenException('مرجع البحث خارج إدارة الأبحاث والتطوير.');
      if (d.version !== e.version) throw new ConflictException('تغير إصدار أحد مراجع البحث؛ راجع النسخة المحددة.');
      validateDocumentPayload(d.template.fields, d.payload);
      const revision = await tx.documentRevision.findUniqueOrThrow({where:{documentId_version:{documentId:d.id,version:d.version}},select:{createdBy:{select:{personId:true}}}});
      const authors = [d.createdBy.personId,revision.createdBy.personId];authorPersonIds.push(...authors);
      const sourceHash = jsonDigest({ source: source.sourceHash, authors, status: d.status, approvedByAccountId: d.approvedByAccountId, approvedAt: d.approvedAt, signedByAccountId: d.signedByAccountId, signedAt: d.signedAt, archivedByAccountId: d.archivedByAccountId, archivedAt: d.archivedAt });
      references.push({ documentId: d.id, version: d.version, referenceNumber: d.referenceNumber, contentHash: d.contentHash, sourceHash });
      views.push({ documentId:d.id, version:d.version, referenceNumber:d.referenceNumber, status:d.status, titleAr:d.template.titleAr, contentHash:d.contentHash,
        fields:(d.template.fields as unknown as Array<{key:string;labelAr:string}>).map(f => ({key:f.key,labelAr:f.labelAr,value:(d.payload as Record<string,unknown>)[f.key] ?? null})) });
    }
    if (Buffer.byteLength(JSON.stringify(views)) > 160000) throw new BadRequestException('حجم أدلة المراجعة أكبر من الحد؛ قسّم دراسة البحث إلى نطاقات أصغر.');
    return { section: { ...section, evidence: references } as SavedResearchSection, views, authorPersonIds };
  }
  private async source(tx: Tx, row: Row, phase: ResearchPhase) {
    const content = researchContent(row), proposal = await this.resolve(tx,row.organizationId,content.proposal);
    if (jsonDigest(proposal.section) !== jsonDigest(content.proposal)) throw new ConflictException('تغير مصدر المقترح؛ يلزم إصدار ومراجعة جديدان.');
    const result = phase === 'RESULT' && content.result ? await this.resolve(tx,row.organizationId,content.result) : null;
    if (phase === 'RESULT' && (!result || jsonDigest(result.section) !== jsonDigest(content.result))) throw new ConflictException('أدلة النتيجة غير مكتملة أو تغيرت.');
    const sourceHash = jsonDigest({ policy:RESEARCH_POLICY, organizationId:row.organizationId, initiativeId:row.id, phase, createdByPersonId:row.createdByPersonId, proposalAuthorPersonId:content.proposalAuthorPersonId, proposal:proposal.section,
      ...(phase === 'RESULT' ? { resultAuthorPersonId:content.resultAuthorPersonId, result:result!.section } : {}) });
    return { authorPersonIds:[...new Set([...proposal.authorPersonIds,...(result?.authorPersonIds??[])])], sourceHash, proposal:proposal.section, result:result?.section ?? null, evidence:[...proposal.views,...(result?.views ?? [])] };
  }
  private async participant(tx:Tx,org:string,accountId:string) {
    const participant=await eligibleReviewParticipant(tx,org,RESEARCH_DEPARTMENT,accountId,'EMPLOYEE');
    const employment=await tx.employment.findUnique({where:{id:participant.binding.employmentId},select:{workerClass:true}});
    if(employment?.workerClass!=='EMPLOYEE')throw new ForbiddenException('المراجعة الداخلية تتطلب موظفًا فعليًا؛ لا يكفي تكليف متعاقد أو منتسب.');
    return participant;
  }
  private publicSource(source: Awaited<ReturnType<InternalResearchService['source']>>) {
    const {authorPersonIds,...view}=source;return view;
  }
  private independent(row: Row, p: Platform, personId: string, sourceAuthors: string[] = []) {
    const content = researchContent(row);
    if ([row.createdByPersonId, content.proposalAuthorPersonId, content.resultAuthorPersonId, p.ownerPersonId,...sourceAuthors].includes(personId)) throw new ForbiddenException('يلزم مراجع فعلي مستقل عن المنشئ ومعد المحتوى والمالك الحالي.');
  }
  private async audit(tx: Tx, personId: string, actorId: string, row: Row, action: string, metadata: object = {}) {
    await tx.auditEvent.create({ data: { actorId: personId, action, resource:'InternalResearchInitiative', resourceId:row.id,
      metadata: json({ policy:RESEARCH_POLICY, organizationId:row.organizationId, accountId:actorId, revision:row.revision, status:row.status, recordDigest:row.recordDigest, ...metadata }) } });
  }
  private async append(tx: Tx, actorId: string, personId: string, row: Row, action: string, reason: string) {
    const previous = row.revision > 1 ? await tx.internalResearchRevision.findUniqueOrThrow({ where:{initiativeId_revision:{initiativeId:row.id,revision:row.revision - 1}} }) : null;
    const snapshot = { id:randomUUID(), initiativeId:row.id, revision:row.revision, snapshot:json(row) as Prisma.JsonValue, action, reason, actorAccountId:actorId, previousDigest:previous?.recordDigest ?? null, createdAt:new Date() };
    await tx.internalResearchRevision.create({ data:{...snapshot,snapshot:snapshot.snapshot as Prisma.InputJsonValue,recordDigest:researchRevisionDigest(snapshot)} });
    await this.audit(tx,personId,actorId,row,action,{reason});
  }
  private async update(tx: Tx, actorId: string, personId: string, old: Row, data: Partial<Pick<Row,'status'|'content'|'currentReviewId'|'proposalReviewId'|'resultReviewId'>>, action: string, reason: string) {
    const next = { ...old, ...data, revision:old.revision + 1 }, digest = researchRecordDigest(next);
    const count = await tx.internalResearchInitiative.updateMany({ where:{id:old.id,organizationId:old.organizationId,revision:old.revision,recordDigest:old.recordDigest},data:{...data,content:data.content as Prisma.InputJsonValue | undefined,revision:next.revision,recordDigest:digest} });
    if (count.count !== 1) throw new ConflictException('تغير سجل البحث أثناء الإجراء؛ أعد القراءة.');
    const row = await tx.internalResearchInitiative.findUniqueOrThrow({where:{id:old.id}});
    await this.append(tx,actorId,personId,row,action,reason);
    return row;
  }
  private async lock(tx: Tx, org: string, id: string | null, actors: string[]) {
    await tx.$queryRaw`SELECT "key" FROM "OperationalSetting" WHERE "key"='PLATFORM_STAFFING_ORGANIZATION:v1' FOR SHARE`;
    await lockAccountIdentities(tx,actors);
    await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id"::text=${org} FOR SHARE`;
    if (id) await tx.$queryRaw`SELECT "id" FROM "InternalResearchInitiative" WHERE "id"=${id} AND "organizationId"::text=${org} FOR UPDATE`;
  }
  private expected(row: Row, revision: number) { if (row.revision !== revision) throw new ConflictException('تغير إصدار البحث؛ أعد القراءة والمعاينة.'); }
  private async conflicts<T>(fn: () => Promise<T>): Promise<T> {
    try { return await fn(); } catch (e) {
      if (e && typeof e === 'object' && 'code' in e && ['P2002','P2034'].includes(String(e.code))) throw new ConflictException('تكرر الطلب أو تغير السجل؛ أعد القراءة دون إعادة التأكيد القديم.');
      throw e;
    }
  }
  private async ownerMutation<T>(actorId: string, id: string, fn: (tx:Tx,p:Platform,row:Row)=>Promise<T>, extraAccounts: string[] = []) {
    scopeId(id);
    return this.conflicts(() => this.db.serializable(async tx => {
      const initial = await this.owner(tx,actorId), before = await this.row(tx,initial.id,id);
      const reviews = await tx.internalResearchReview.findMany({where:{id:{in:[before.currentReviewId,before.proposalReviewId,before.resultReviewId].filter((v):v is string=>Boolean(v))}},select:{reviewerAccountId:true}});
      await this.lock(tx,initial.id,id,[actorId,before.createdByAccountId,...extraAccounts,...reviews.map(r=>r.reviewerAccountId)]);
      const p = await this.owner(tx,actorId), row = await this.row(tx,p.id,id);
      return fn(tx,p,row);
    }));
  }
  private async detail(tx: Tx, p: Platform, row: Row) {
    const history = await tx.internalResearchRevision.findMany({where:{initiativeId:row.id},orderBy:{revision:'desc'},take:51,select:{id:true,revision:true,action:true,createdAt:true,recordDigest:true}});
    const reviews = await tx.internalResearchReview.findMany({where:{initiativeId:row.id,organizationId:p.id},orderBy:{issuedAt:'desc'},take:51});
    const current = async (phase:ResearchPhase) => {try {await this.source(tx,row,phase);return true;} catch(e) {if(e instanceof ForbiddenException||e instanceof ConflictException||e instanceof NotFoundException)return false;throw e;}};
    const sourceCurrent = {proposal:await current('PROPOSAL'),result:researchContent(row).result?await current('RESULT'):null};
    return {schemaVersion:1,policy:RESEARCH_POLICY,department:RESEARCH_DEPARTMENT,organizationId:p.id,record:{id:row.id,revision:row.revision,status:row.status,content:researchContent(row),recordDigest:row.recordDigest,createdAt:row.createdAt.toISOString(),updatedAt:row.updatedAt.toISOString()},
      history:history.slice(0,50),hasMoreHistory:history.length>50,reviews:reviews.slice(0,50).map(r=>({id:r.id,phase:r.phase,state:r.state,assignedRevision:r.assignedRevision,reviewerAccountId:r.reviewerAccountId,issuedAt:r.issuedAt,expiresAt:r.expiresAt,decidedAt:r.decidedAt,decisionNote:r.decisionNote,receiptHash:r.receiptHash})),hasMoreReviews:reviews.length>50,
      sourceCurrent,externalExecutionAuthorized:false,departmentClosed:false,notice:RESEARCH_NOTICE};
  }
  async list(actorId: string, before?: unknown) {
    if (before !== undefined) scopeId(before);
    return this.db.serializable(async tx => {
      const p = await this.owner(tx,actorId);
      const cursor = typeof before === 'string' ? await tx.internalResearchInitiative.findFirst({where:{id:before,organizationId:p.id},select:{createdAt:true,id:true}}) : null;
      if (before !== undefined && !cursor) throw new BadRequestException('مؤشر قائمة البحث خارج النطاق.');
      const items = await tx.internalResearchInitiative.findMany({where:{organizationId:p.id,...(cursor?{OR:[{createdAt:{lt:cursor.createdAt}},{createdAt:cursor.createdAt,id:{lt:cursor.id}}]}:{})},orderBy:[{createdAt:'desc'},{id:'desc'}],take:21});
      return {schemaVersion:1,policy:RESEARCH_POLICY,organizationId:p.id,items:items.slice(0,20).map(row=>({id:row.id,revision:row.revision,status:row.status,title:researchContent(row).proposal.title,createdAt:row.createdAt,updatedAt:row.updatedAt})),nextCursor:items.length>20?items[19].id:null,notice:RESEARCH_NOTICE};
    });
  }
  async inspect(actorId: string, id: string) {
    scopeId(id); return this.db.serializable(async tx => {const p=await this.owner(tx,actorId);return this.detail(tx,p,await this.row(tx,p.id,id));});
  }
  async create(actorId: string, body: unknown) {
    const input = researchCreateInput(body);
    return this.conflicts(() => this.db.serializable(async tx => {
      const initial=await this.owner(tx,actorId);await this.lock(tx,initial.id,null,[actorId]);const p=await this.owner(tx,actorId);
      const source=await this.resolve(tx,p.id,input.proposal),content:ResearchContent={proposal:source.section,result:null,proposalAuthorPersonId:p.ownerPersonId,resultAuthorPersonId:null};
      const next={id:randomUUID(),organizationId:p.id,requestKey:input.requestKey,policyVersion:RESEARCH_POLICY,revision:1,status:'PROPOSED',content:json(content) as Prisma.JsonValue,createdByAccountId:actorId,createdByPersonId:p.ownerPersonId,currentReviewId:null,proposalReviewId:null,resultReviewId:null};
      const row=await tx.internalResearchInitiative.create({data:{...next,content:next.content as Prisma.InputJsonValue,recordDigest:researchRecordDigest(next)}});
      await this.append(tx,actorId,p.ownerPersonId,row,'INTERNAL_RESEARCH_PROPOSED','إنشاء مقترح بحث مكتبي داخلي دون تصريح تنفيذ خارجي.');return this.detail(tx,p,row);
    }));
  }
  async revise(actorId: string, id: string, body: unknown) {
    const input=researchRevisionInput(body);
    return this.ownerMutation(actorId,id,async(tx,p,row)=>{
      this.expected(row,input.expectedRevision);
      if(row.currentReviewId||['COMPLETED','ARCHIVED','CANCELLED'].includes(row.status)||input.phase==='RESULT'&&!['ACTIVE','VERIFIED'].includes(row.status))throw new ConflictException('ألغِ التكليف المعلق أولًا؛ لا تعدّل سجلًا نهائيًا أو نتيجة قبل بدء البحث.');
      const source=await this.resolve(tx,p.id,input.section),previous=researchContent(row);
      const content:ResearchContent=input.phase==='PROPOSAL'?{proposal:source.section,result:null,proposalAuthorPersonId:p.ownerPersonId,resultAuthorPersonId:null}:{...previous,result:source.section,resultAuthorPersonId:p.ownerPersonId};
      const next=await this.update(tx,actorId,p.ownerPersonId,row,{content:json(content) as Prisma.JsonValue,status:input.phase==='PROPOSAL'?'PROPOSED':'ACTIVE',currentReviewId:null,...(input.phase==='PROPOSAL'?{proposalReviewId:null}:{}),resultReviewId:null},'INTERNAL_RESEARCH_REVISED',input.reason);
      return this.detail(tx,p,next);
    });
  }
  private async assignmentPlan(tx: Tx, actorId: string, id: string, input: ReturnType<typeof researchAssignmentInput>) {
    validExpiry(input.expiresAt);
    const p=await this.owner(tx,actorId),row=await this.row(tx,p.id,id);this.expected(row,input.expectedRevision);
    if(row.currentReviewId||row.status!==returnState(input.phase))throw new ConflictException('حالة السجل لا تسمح بتكليف هذه المراجعة.');
    const participant=await this.participant(tx,p.id,input.reviewerAccountId);
    const source=await this.source(tx,row,input.phase),authority=json(p),binding=json(participant.binding);this.independent(row,p,participant.binding.personId,source.authorPersonIds);
    const expectedPlanHash=jsonDigest({policy:RESEARCH_POLICY,rowDigest:row.recordDigest,phase:input.phase,authority,binding,sourceHash:source.sourceHash,expiresAt:input.expiresAt,reason:input.reason});
    return {p,row,participant,source,authority,binding,expectedPlanHash};
  }
  async candidates(actorId:string,id:string,before?:unknown) {
    scopeId(id);if(before!==undefined)scopeId(before);return this.db.serializable(async tx=>{
      const p=await this.owner(tx,actorId),row=await this.row(tx,p.id,id);
      const source=await this.source(tx,row,researchContent(row).result?'RESULT':'PROPOSAL');
      const scope={employments:{some:{organizationId:p.id,status:'ACTIVE' as const,workerClass:'EMPLOYEE' as const,orgUnit:{code:RESEARCH_DEPARTMENT,type:'DEPARTMENT' as const,active:true},position:{active:true}}}};
      if(typeof before==='string'&&!await tx.account.findFirst({where:{id:before,...scope},select:{id:true}}))throw new BadRequestException('مؤشر المرشحين خارج نطاق الإدارة.');
      const accounts=await tx.account.findMany({where:{...scope,...(typeof before==='string'?{id:{gt:before}}:{})},orderBy:{id:'asc'},select:{id:true},take:51});
      const candidates:Array<{accountId:string;name:string;jobTitle:string}>=[];
      for(const a of accounts.slice(0,50)){try{const v=await this.participant(tx,p.id,a.id);this.independent(row,p,v.binding.personId,source.authorPersonIds);candidates.push({accountId:a.id,name:v.name,jobTitle:v.jobTitle});}catch(error){if(!(error instanceof ForbiddenException))throw error;}}
      return {schemaVersion:1,policy:RESEARCH_POLICY,initiativeId:id,expectedRevision:row.revision,candidates,hasMore:accounts.length>50,nextCursor:accounts.length>50?accounts[49].id:null,notice:RESEARCH_NOTICE};
    });
  }
  async assignmentPreview(actorId: string,id: string,body:unknown) {
    scopeId(id);const input=researchAssignmentInput(body);
    return this.db.serializable(async tx=>{const plan=await this.assignmentPlan(tx,actorId,id,input);return {schemaVersion:1,policy:RESEARCH_POLICY,initiativeId:id,expectedRevision:input.expectedRevision,phase:input.phase,reviewer:{accountId:plan.participant.binding.accountId,name:plan.participant.name},expiresAt:input.expiresAt,permissions:['READ_ASSIGNED_INITIATIVE_VERSION','READ_LISTED_RND_SOURCE_VERSIONS','RECORD_ONE_REVIEW_DECISION'],source:this.publicSource(plan.source),expectedPlanHash:plan.expectedPlanHash,notice:RESEARCH_NOTICE};});
  }
  async assign(actorId: string,id:string,body:unknown) {
    const input=researchAssignmentInput(body,true);
    return this.ownerMutation(actorId,id,async(tx,p,row)=>{
      const plan=await this.assignmentPlan(tx,actorId,id,input);
      if(plan.expectedPlanHash!==input.expectedPlanHash)throw new ConflictException('تغيرت النسخة أو المراجع أو السلطة؛ أعد المعاينة.');
      const data={id:randomUUID(),organizationId:p.id,initiativeId:id,phase:input.phase,assignedRevision:row.revision+1,sourceHash:plan.source.sourceHash,reviewerAccountId:input.reviewerAccountId,reviewerPersonId:plan.participant.binding.personId,reviewerBinding:plan.binding as Prisma.JsonValue,authorityBinding:plan.authority as Prisma.JsonValue,issuedByAccountId:actorId,issuedAt:new Date(),expiresAt:new Date(input.expiresAt),state:'ACTIVE',reason:input.reason,decisionNote:null,decidedAt:null,receiptHash:null};
      const review=await tx.internalResearchReview.create({data:{...data,reviewerBinding:data.reviewerBinding as Prisma.InputJsonValue,authorityBinding:data.authorityBinding as Prisma.InputJsonValue,recordDigest:reviewDigest(data)}});
      const next=await this.update(tx,actorId,p.ownerPersonId,row,{status:phaseState(input.phase),currentReviewId:review.id},'INTERNAL_RESEARCH_REVIEW_ASSIGNED',input.reason);
      return this.detail(tx,p,next);
    },[input.reviewerAccountId]);
  }
  async revoke(actorId:string,id:string,body:unknown) {
    const x=templateObject(body,['expectedRevision','expectedReviewId','reason','confirmed']),revision=researchVersion(x.expectedRevision),reason=boundedNote(x.reason);scopeId(x.expectedReviewId);
    if(x.confirmed!==true)throw new BadRequestException('أكّد إلغاء التكليف المحدد.');
    return this.ownerMutation(actorId,id,async(tx,p,row)=>{
      this.expected(row,revision);if(!row.currentReviewId||row.currentReviewId!==x.expectedReviewId)throw new ConflictException('تغير التكليف؛ أعد القراءة.');
      const review=await tx.internalResearchReview.findUniqueOrThrow({where:{id:row.currentReviewId}});this.reviewRecord(review);
      if(review.state!=='ACTIVE')throw new ConflictException('التكليف غير معلق.');
      const {recordDigest,...data}=review,nextReview={...data,state:'REVOKED',decisionNote:reason,decidedAt:new Date()};
      await tx.internalResearchReview.update({where:{id:review.id},data:{state:'REVOKED',decisionNote:reason,decidedAt:nextReview.decidedAt,recordDigest:reviewDigest(nextReview)}});
      const next=await this.update(tx,actorId,p.ownerPersonId,row,{currentReviewId:null,status:returnState(review.phase as ResearchPhase)},'INTERNAL_RESEARCH_REVIEW_REVOKED',reason);return this.detail(tx,p,next);
    });
  }
  private async binding(tx:Tx,row:Row,review:InternalResearchReview,p:Platform) {
    this.reviewRecord(review);
    if(review.organizationId!==p.id||review.initiativeId!==row.id||review.state==='ACTIVE'&&review.expiresAt.getTime()<=Date.now()||review.state==='APPROVED'&&(!review.decidedAt||review.decidedAt.getTime()>=review.expiresAt.getTime()||review.decidedAt.getTime()<review.issuedAt.getTime())||jsonDigest(review.authorityBinding)!==jsonDigest(p))throw new ForbiddenException('انتهى التكليف أو تغيرت سلطة إصداره؛ يلزم تكليف جديد.');
    const participant=await this.participant(tx,p.id,review.reviewerAccountId);
    if(participant.binding.personId!==review.reviewerPersonId||jsonDigest(participant.binding)!==jsonDigest(review.reviewerBinding))throw new ForbiddenException('تغيرت أهلية المراجع؛ لا يعود التكليف القديم بعد استعادة الصلاحية.');
    const source=await this.source(tx,row,review.phase as ResearchPhase);this.independent(row,p,participant.binding.personId,source.authorPersonIds);if(source.sourceHash!==review.sourceHash)throw new ConflictException('تغير مصدر المراجعة؛ يلزم إصدار وتكليف جديدان.');
    return {participant,source};
  }
  private async assigned(tx:Tx,actorId:string,reviewId:string) {
    const review=await tx.internalResearchReview.findFirst({where:{id:reviewId,reviewerAccountId:actorId,state:'ACTIVE'}});
    if(!review||review.expiresAt.getTime()<=Date.now())throw new ForbiddenException('لا يوجد تكليف بحث فعّال لهذا الحساب.');
    const p=await reviewPlatform(tx);
    if(p.id!==review.organizationId)throw new ForbiddenException('التكليف خارج الجهة الداخلية الحالية.');
    // Issuing authority/recipient validity are checked before private source reads.
    this.reviewRecord(review);
    if(jsonDigest(review.authorityBinding)!==jsonDigest(p))throw new ForbiddenException('تغيرت سلطة إصدار التكليف.');
    const participant=await this.participant(tx,p.id,actorId);
    if(jsonDigest(participant.binding)!==jsonDigest(review.reviewerBinding))throw new ForbiddenException('تغيرت أهلية المراجع؛ يلزم تكليف جديد.');
    const row=await this.row(tx,p.id,review.initiativeId);
    if(row.currentReviewId!==review.id||row.revision!==review.assignedRevision||row.status!==phaseState(review.phase as ResearchPhase))throw new ConflictException('لم يعد هذا التكليف مرتبطًا بالإصدار الحالي.');
    const bound=await this.binding(tx,row,review,p);
    const reviewHash=jsonDigest({reviewDigest:review.recordDigest,rowDigest:row.recordDigest,sourceHash:bound.source.sourceHash,participant:bound.participant.binding});
    return {p,row,review,...bound,reviewHash};
  }
  async inbox(actorId:string,before?:unknown) {
    if(before!==undefined)scopeId(before);
    return this.db.serializable(async tx=>{
      const cursor=typeof before==='string'?await tx.internalResearchReview.findFirst({where:{id:before,reviewerAccountId:actorId},select:{id:true,issuedAt:true}}):null;
      if(before!==undefined&&!cursor)throw new BadRequestException('مؤشر صندوق المراجعة خارج نطاق حسابك.');
      const reviews=await tx.internalResearchReview.findMany({where:{reviewerAccountId:actorId,state:'ACTIVE',expiresAt:{gt:new Date()},...(cursor?{OR:[{issuedAt:{lt:cursor.issuedAt}},{issuedAt:cursor.issuedAt,id:{lt:cursor.id}}]}:{})},orderBy:[{issuedAt:'desc'},{id:'desc'}],take:51}),items=[];
      for(const r of reviews.slice(0,50)){try{const v=await this.assigned(tx,actorId,r.id);items.push({id:r.id,initiativeId:v.row.id,phase:r.phase,title:v.source.proposal.title,expiresAt:r.expiresAt});}catch(e){if(!(e instanceof ForbiddenException||e instanceof ConflictException||e instanceof NotFoundException))throw e;}}
      return {schemaVersion:1,policy:RESEARCH_POLICY,items,hasMore:reviews.length>50,nextCursor:reviews.length>50?reviews[49].id:null,notice:RESEARCH_NOTICE};
    });
  }
  async reviewView(actorId:string,reviewId:string) {
    scopeId(reviewId);return this.db.serializable(async tx=>{const v=await this.assigned(tx,actorId,reviewId);return {schemaVersion:1,policy:RESEARCH_POLICY,reviewId,initiativeId:v.row.id,organizationId:v.p.id,phase:v.review.phase,expectedRevision:v.row.revision,source:this.publicSource(v.source),reviewHash:v.reviewHash,expiresAt:v.review.expiresAt,notice:RESEARCH_NOTICE};});
  }
  async decide(actorId:string,reviewId:string,body:unknown) {
    scopeId(reviewId);const x=templateObject(body,['expectedRevision','reviewHash','decision','note','confirmed']),revision=researchVersion(x.expectedRevision),note=boundedNote(x.note);
    if(x.confirmed!==true||typeof x.reviewHash!=='string'||!/^[a-f0-9]{64}$/.test(x.reviewHash)||typeof x.decision!=='string'||!['APPROVE','RETURN','REJECT'].includes(x.decision))throw new BadRequestException('راجع النسخة وحدد القرار وسببه وأكد القرار من حسابك.');
    return this.conflicts(()=>this.db.serializable(async tx=>{
      const initial=await this.assigned(tx,actorId,reviewId);await this.lock(tx,initial.p.id,initial.row.id,[actorId,initial.p.ownerId,initial.row.createdByAccountId]);
      const v=await this.assigned(tx,actorId,reviewId);this.expected(v.row,revision);if(v.reviewHash!==x.reviewHash)throw new ConflictException('تغيرت النسخة أو الصلاحية؛ أعد المراجعة.');
      const state=x.decision==='APPROVE'?'APPROVED':x.decision==='RETURN'?'RETURNED':'REJECTED',decidedAt=new Date();
      if(decidedAt.getTime()>=v.review.expiresAt.getTime()||decidedAt.getTime()<v.review.issuedAt.getTime())throw new ForbiddenException('انتهى وقت التكليف قبل تسجيل القرار؛ يلزم تكليف جديد.');
      const receipt={policy:RESEARCH_POLICY,reviewId,initiativeId:v.row.id,phase:v.review.phase,assignedRevision:v.review.assignedRevision,sourceHash:v.source.sourceHash,actorAccountId:actorId,actorPersonId:v.participant.binding.personId,decision:x.decision,note,decidedAt:decidedAt.toISOString()};
      const {recordDigest,...old}=v.review,data={...old,state,decisionNote:note,decidedAt,receiptHash:jsonDigest(receipt)};
      await tx.internalResearchReview.update({where:{id:reviewId},data:{state,decisionNote:note,decidedAt,receiptHash:data.receiptHash,recordDigest:reviewDigest(data)}});
      const approved=x.decision==='APPROVE',phase=v.review.phase as ResearchPhase;
      const status=approved?(phase==='PROPOSAL'?'APPROVED':'VERIFIED'):(phase==='PROPOSAL'&&x.decision==='REJECT'?'REJECTED':returnState(phase));
      const next=await this.update(tx,actorId,v.participant.binding.personId,v.row,{status,currentReviewId:null,...(approved?(phase==='PROPOSAL'?{proposalReviewId:reviewId}:{resultReviewId:reviewId}):{})},'INTERNAL_RESEARCH_REVIEW_DECIDED',note);
      await this.audit(tx,v.participant.binding.personId,actorId,next,'INTERNAL_RESEARCH_REVIEW_RECEIPT',{receipt,receiptHash:data.receiptHash});
      return {schemaVersion:1,policy:RESEARCH_POLICY,initiativeId:next.id,revision:next.revision,status:next.status,receipt:{...receipt,receiptHash:data.receiptHash},externalExecutionAuthorized:false,departmentClosed:false,notice:RESEARCH_NOTICE};
    }));
  }
  private async transitionPlan(tx:Tx,actorId:string,id:string,input:ReturnType<typeof researchTransitionInput>) {
    const p=await this.owner(tx,actorId),row=await this.row(tx,p.id,id);this.expected(row,input.expectedRevision);
    const allowed=input.action==='START'?row.status==='APPROVED':input.action==='COMPLETE'?row.status==='VERIFIED':input.action==='ARCHIVE'?row.status==='COMPLETED':!['COMPLETED','ARCHIVED','CANCELLED'].includes(row.status)&&!row.currentReviewId;
    if(!allowed)throw new ConflictException('هذا الانتقال غير متاح؛ ألغِ التكليف المعلق أو استكمل المراجعة المستقلة أولًا.');
    const approvals:Array<{recordDigest:string;sourceHash:string}>=[];
    if(input.action==='START'||input.action==='COMPLETE'){
      for(const phase of (input.action==='START'?['PROPOSAL']:['PROPOSAL','RESULT']) as ResearchPhase[]){
        const reviewId=phase==='PROPOSAL'?row.proposalReviewId:row.resultReviewId;
        const approval=reviewId?await tx.internalResearchReview.findUnique({where:{id:reviewId}}):null;
        if(!approval||approval.state!=='APPROVED'||!approval.decidedAt||!approval.receiptHash||approval.phase!==phase)throw new ConflictException('لا توجد مراجعة مستقلة مقبولة لهذه النسخة.');
        const bound=await this.binding(tx,row,approval,p);approvals.push({recordDigest:approval.recordDigest,sourceHash:bound.source.sourceHash});
      }
    }
    const target=input.action==='START'?'ACTIVE':input.action==='COMPLETE'?'COMPLETED':input.action==='ARCHIVE'?'ARCHIVED':'CANCELLED';
    return {p,row,target,expectedPlanHash:jsonDigest({policy:RESEARCH_POLICY,rowDigest:row.recordDigest,authority:p,action:input.action,reason:input.reason,approvals})};
  }
  async transitionPreview(actorId:string,id:string,body:unknown) {
    scopeId(id);const input=researchTransitionInput(body);return this.db.serializable(async tx=>{const p=await this.transitionPlan(tx,actorId,id,input);return {schemaVersion:1,policy:RESEARCH_POLICY,initiativeId:id,expectedRevision:input.expectedRevision,action:input.action,targetStatus:p.target,expectedPlanHash:p.expectedPlanHash,notice:RESEARCH_NOTICE};});
  }
  async transition(actorId:string,id:string,body:unknown) {
    const input=researchTransitionInput(body,true);return this.ownerMutation(actorId,id,async(tx,p,row)=>{const plan=await this.transitionPlan(tx,actorId,id,input);if(plan.expectedPlanHash!==input.expectedPlanHash)throw new ConflictException('تغيرت الخطة أو المراجعة؛ أعد المعاينة.');const next=await this.update(tx,actorId,p.ownerPersonId,row,{status:plan.target},'INTERNAL_RESEARCH_'+input.action,input.reason);return this.detail(tx,p,next);});
  }
}
