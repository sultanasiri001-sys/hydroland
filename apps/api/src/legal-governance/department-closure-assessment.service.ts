import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { DepartmentClosureAssessment, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { lockAccountIdentities } from '../admin/admin-authorization';
import { documentReadHash, reviewPlatform } from '../document-forms/internal-document-review.domain';
import { decisionDigest } from '../document-forms/owner-administrative-decision.domain';
import { DepartmentCode } from '../governance/department-ownership.domain';
import { OPERATING_CYCLE_CLOSURE_GATES } from '../document-forms/department-operating-cycle.catalog';
import { assessmentDepartment, assessmentDigest, assessmentInput, assessmentReference, assessmentSpecification, assessmentState, CLOSURE_ASSESSMENT_NOTICE, CLOSURE_ASSESSMENT_POLICY, GateInput, publicAssessmentGates, readAssessment, SavedEvidence, SavedGate } from './department-closure-assessment.domain';

type Tx = Prisma.TransactionClient;
type Platform = Awaited<ReturnType<typeof reviewPlatform>>;
const authorityDigest = (p: Platform) => decisionDigest(JSON.parse(JSON.stringify(p)));

// Resolve recorded references, never trust a caller-supplied hash or claim of
// approval. Even a valid signed document is NOT a passed operating-cycle gate.
async function resolveEvidence(tx: Tx, organizationId: string, department: DepartmentCode, gates: GateInput[]): Promise<SavedGate[]> {
  const sources = new Map<string, SavedEvidence>();
  for (const e of gates.flatMap(g => g.evidence)) {
    const key = `${e.documentId}:${e.version}`;
    if (sources.has(key)) continue;
    const d = await tx.managedDocument.findFirst({ where: { id: e.documentId, organizationId, department }, include: { template: true } });
    if (!d || d.template.organizationId !== organizationId || d.template.department !== department) throw new ForbiddenException('مرجع المستند غير متاح في نطاق هذا التقييم.');
    if (d.version !== e.version) throw new ConflictException('تغير إصدار المستند المرجعي؛ أعد قراءة الإصدار الحالي.');
    const revision = await tx.documentRevision.findUnique({ where: { documentId_version: { documentId: d.id, version: d.version } } });
    if (!revision || revision.contentHash !== d.contentHash || decisionDigest(revision.payload) !== decisionDigest(d.payload)) throw new ConflictException('أدلة إصدار المستند المرجعي غير متسقة.');
    const sourceHash = decisionDigest({ document: documentReadHash(d), revisionId: revision.id, status: d.status, approvedByAccountId: d.approvedByAccountId, approvedAt: d.approvedAt?.toISOString() ?? null, signedByAccountId: d.signedByAccountId, signedAt: d.signedAt?.toISOString() ?? null, archivedByAccountId: d.archivedByAccountId, archivedAt: d.archivedAt?.toISOString() ?? null });
    sources.set(key, { documentId: d.id, version: d.version, contentHash: d.contentHash, referenceNumber: d.referenceNumber, sourceHash });
  }
  return gates.map(g => ({ ...g, evidence: g.evidence.map(e => sources.get(`${e.documentId}:${e.version}`)!) }));
}
const sourceDigest = (gates: SavedGate[]) => decisionDigest(gates.map(g => ({ id: g.id, evidence: g.evidence })));

async function currentAssessment(tx: Tx, row: DepartmentClosureAssessment, platform?: Platform): Promise<boolean> {
  const gates = readAssessment(row);
  if (row.specificationVersion !== assessmentSpecification(assessmentDepartment(row.department))) return false;
  try {
    const p = platform ?? await reviewPlatform(tx);
    if (p.id !== row.organizationId || authorityDigest(p) !== row.authorityDigest) return false;
    return sourceDigest(await resolveEvidence(tx, row.organizationId, assessmentDepartment(row.department), gates)) === row.sourceDigest;
  } catch (e) {
    if (e instanceof ForbiddenException || e instanceof ConflictException) return false;
    throw e;
  }
}

// This projection is intentionally free of notes, actors and source IDs. The
// general administrator reference catalog does not grant document workspace access.
export async function departmentAssessmentSummary(tx: Tx, organizationId: string, department: DepartmentCode) {
  const row = await tx.departmentClosureAssessment.findFirst({ where: { organizationId, department }, orderBy: { revision: 'desc' } });
  if (!row) return { closureRecord: null };
  const gates = readAssessment(row), current = await currentAssessment(tx, row);
  return {
    closureAssessment: current ? row.state : 'STALE',
    closureGates: OPERATING_CYCLE_CLOSURE_GATES.map(g => ({ ...g, verificationStatus: current ? gates.find(v => v.id === g.id)!.verificationStatus : 'NOT_ASSESSED' })),
    closureRecord: { id: row.id, revision: row.revision, recordedAt: row.createdAt.toISOString(), policyVersion: row.policyVersion, specificationVersion: row.specificationVersion, assessmentReference: assessmentReference(row), assessmentCurrent: current },
  };
}

@Injectable()
export class DepartmentClosureAssessmentService {
  constructor(private readonly db: DatabaseService) {}

  private async owner(tx: Tx, actorId: string) {
    const p = await reviewPlatform(tx);
    if (p.ownerId !== actorId) throw new ForbiddenException('تفاصيل تقييم الإدارات وحفظه لمالك الجهة الداخلية المتحقق فقط.');
    return p;
  }
  private async latest(tx: Tx, org: string, department: DepartmentCode) {
    return tx.departmentClosureAssessment.findFirst({ where: { organizationId: org, department }, orderBy: { revision: 'desc' } });
  }
  private async detail(tx: Tx, p: Platform, department: DepartmentCode) {
    const rows = await tx.departmentClosureAssessment.findMany({ where: { organizationId: p.id, department }, orderBy: { revision: 'desc' }, take: 51 });
    const current = rows[0];
    for (const row of rows) readAssessment(row);
    return {
      schemaVersion: 1, policy: CLOSURE_ASSESSMENT_POLICY, organizationId: p.id, department, specificationVersion: assessmentSpecification(department), expectedRevision: current?.revision ?? 0,
      current: current ? { id: current.id, revision: current.revision, recordedAt: current.createdAt.toISOString(), state: current.state, gates: publicAssessmentGates(readAssessment(current)), assessmentReference: assessmentReference(current), assessmentCurrent: await currentAssessment(tx, current, p) } : null,
      history: rows.slice(0, 50).map(row => ({ id: row.id, revision: row.revision, recordedAt: row.createdAt.toISOString(), state: row.state, assessmentReference: assessmentReference(row) })), hasMoreHistory: rows.length > 50,
      canRecord: true, departmentClosed: false, closureDecisionReference: null, notice: CLOSURE_ASSESSMENT_NOTICE,
    };
  }
  async inspect(actorId: string, code: unknown) {
    const department = assessmentDepartment(code);
    return this.db.serializable(async tx => this.detail(tx, await this.owner(tx, actorId), department));
  }
  private async prepare(tx: Tx, actorId: string, department: DepartmentCode, input: ReturnType<typeof assessmentInput>) {
    // Authorization precedes assessment/source reads even during repeated preview.
    const p = await this.owner(tx, actorId), current = await this.latest(tx, p.id, department);
    if (current) readAssessment(current);
    if (input.expectedRevision !== (current?.revision ?? 0) || input.specificationVersion !== assessmentSpecification(department)) throw new ConflictException('تغير التقييم أو مواصفة الإدارة؛ أعد القراءة والمعاينة.');
    const gates = await resolveEvidence(tx, p.id, department, input.gates), authority = authorityDigest(p), source = sourceDigest(gates);
    const expectedPlanHash = decisionDigest({ policy: CLOSURE_ASSESSMENT_POLICY, organizationId: p.id, department, actorId, authority, source, specificationVersion: input.specificationVersion, expectedRevision: input.expectedRevision, previousDigest: current?.recordDigest ?? null, gates });
    return { p, current, gates, authority, source, expectedPlanHash };
  }
  async preview(actorId: string, code: unknown, body: unknown) {
    const department = assessmentDepartment(code), input = assessmentInput(body);
    return this.db.serializable(async tx => {
      const plan = await this.prepare(tx, actorId, department, input);
      return { schemaVersion: 1, policy: CLOSURE_ASSESSMENT_POLICY, organizationId: plan.p.id, department, specificationVersion: input.specificationVersion, expectedRevision: input.expectedRevision, gates: publicAssessmentGates(plan.gates), expectedPlanHash: plan.expectedPlanHash, notice: CLOSURE_ASSESSMENT_NOTICE };
    });
  }
  async record(actorId: string, code: unknown, body: unknown) {
    const department = assessmentDepartment(code), input = assessmentInput(body, true);
    try {
      return await this.db.serializable(async tx => {
        // Same authority locks/order as independent document review. No external
        // calls occur in the retried transaction; the insert and audit are atomic.
        await tx.$queryRaw`SELECT "key" FROM "OperationalSetting" WHERE "key"='PLATFORM_STAFFING_ORGANIZATION:v1' FOR SHARE`;
        const initial = await this.owner(tx, actorId);
        await lockAccountIdentities(tx, [actorId]);
        await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id"::text=${initial.id} FOR SHARE`;
        await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`department-assessment:${initial.id}:${department}`}, 0))`;
        const ids = [...new Set(input.gates.flatMap(g => g.evidence.map(e => e.documentId)))].sort();
        if (ids.length) await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "ManagedDocument" WHERE "id"::text IN (${Prisma.join(ids)}) ORDER BY "id" FOR SHARE`);
        const plan = await this.prepare(tx, actorId, department, input);
        if (plan.expectedPlanHash !== input.expectedPlanHash) throw new ConflictException('تغير المصدر أو الصلاحية أو محتوى المعاينة؛ أعد القراءة والتأكيد.');
        const snapshot = { id: randomUUID(), organizationId: plan.p.id, department, revision: input.expectedRevision + 1, policyVersion: CLOSURE_ASSESSMENT_POLICY, specificationVersion: input.specificationVersion,
          state: assessmentState(plan.gates), gates: plan.gates as unknown as Prisma.JsonValue, sourceDigest: plan.source, authorityDigest: plan.authority, createdByAccountId: actorId, createdAt: new Date(), previousAssessmentId: plan.current?.id ?? null };
        const row = await tx.departmentClosureAssessment.create({ data: { ...snapshot, gates: snapshot.gates as Prisma.InputJsonValue, recordDigest: assessmentDigest(snapshot) } });
        await tx.auditEvent.create({ data: { actorId: plan.p.ownerPersonId, action: 'DEPARTMENT_CLOSURE_ASSESSMENT_RECORDED', resource: 'DepartmentClosureAssessment', resourceId: row.id,
          metadata: { organizationId: row.organizationId, department, revision: row.revision, previousAssessmentId: row.previousAssessmentId, recordDigest: row.recordDigest, accountId: actorId, policy: CLOSURE_ASSESSMENT_POLICY, departmentClosed: false } } });
        return this.detail(tx, plan.p, department);
      });
    } catch (e) {
      if (e && typeof e === 'object' && 'code' in e && ['P2002', 'P2034'].includes(String(e.code))) throw new ConflictException('تغير التقييم أثناء الحفظ؛ أعد قراءته ولا تكرر التأكيد القديم.');
      throw e;
    }
  }
}
