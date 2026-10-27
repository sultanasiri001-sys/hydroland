import { BadRequestException, ConflictException } from '@nestjs/common';
import { DepartmentClosureAssessment } from '@prisma/client';
import { HYDROLAND_DEPARTMENTS, DepartmentCode } from '../governance/department-ownership.domain';
import { departmentOperatingCycle, OPERATING_CYCLE_CLOSURE_GATES } from '../document-forms/department-operating-cycle.catalog';
import { decisionDigest, scopeId } from '../document-forms/owner-administrative-decision.domain';
import { templateObject } from '../document-forms/document-template-input';

export const CLOSURE_ASSESSMENT_POLICY = 'DEPARTMENT_CLOSURE_ASSESSMENT_V1';
export const CLOSURE_ASSESSMENT_NOTICE = 'هذا سجل تقييم وموانع يدوّنه المالك، وليس قبولًا مستقلًا أو اعتمادًا قانونيًا أو قرار إقفال. مراجع المستندات تثبت النسخة المحفوظة فقط ولا تثبت تنفيذ الإجراء أو صحة محتواه.';
export type GateId = typeof OPERATING_CYCLE_CLOSURE_GATES[number]['id'];
export type GateStatus = 'NOT_ASSESSED' | 'BLOCKED';
export type EvidenceInput = { documentId: string; version: number };
export type GateInput = { id: GateId; verificationStatus: GateStatus; note: string; evidence: EvidenceInput[] };
export type SavedEvidence = EvidenceInput & { contentHash: string; referenceNumber: string; sourceHash: string };
export type SavedGate = Omit<GateInput, 'evidence'> & { evidence: SavedEvidence[] };

export function assessmentDepartment(value: unknown): DepartmentCode {
  if (typeof value !== 'string' || !HYDROLAND_DEPARTMENTS.some(d => d.code === value)) throw new BadRequestException('اختر إدارة من الهيكل المعتمد.');
  return value as DepartmentCode;
}
export function assessmentInput(body: unknown, confirmed = false) {
  const x = templateObject(body, ['expectedRevision', 'specificationVersion', 'gates', ...(confirmed ? ['expectedPlanHash', 'confirmed'] : [])]);
  if (!Number.isSafeInteger(x.expectedRevision) || Number(x.expectedRevision) < 0 || typeof x.specificationVersion !== 'string' || x.specificationVersion.length > 80) throw new BadRequestException('إصدار التقييم أو مواصفة الإدارة غير صالح.');
  if (!Array.isArray(x.gates) || x.gates.length !== OPERATING_CYCLE_CLOSURE_GATES.length) throw new BadRequestException('يجب تسجيل معايير التقييم السبعة دون حذف أو تكرار.');
  const gates = x.gates.map(value => {
    const g = templateObject(value, ['id', 'verificationStatus', 'note', 'evidence']);
    if (!OPERATING_CYCLE_CLOSURE_GATES.some(v => v.id === g.id) || typeof g.verificationStatus !== 'string' || !['NOT_ASSESSED', 'BLOCKED'].includes(g.verificationStatus)
      || typeof g.note !== 'string' || g.note.length > 1000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(g.note)
      || g.verificationStatus === 'BLOCKED' && g.note.trim().length < 5 || !Array.isArray(g.evidence) || g.evidence.length > 3) throw new BadRequestException('حالة المعيار أو الملاحظة أو مراجع الأدلة غير صالحة؛ لا يدعم هذا المسار تسجيل قبول أو إقفال.');
    const evidence = g.evidence.map(value => {
      const e = templateObject(value, ['documentId', 'version']); scopeId(e.documentId);
      if (!Number.isSafeInteger(e.version) || Number(e.version) < 1) throw new BadRequestException('إصدار مرجع المستند غير صالح.');
      return { documentId: e.documentId, version: Number(e.version) };
    }).sort((a, b) => a.documentId.localeCompare(b.documentId));
    if (new Set(evidence.map(e => e.documentId)).size !== evidence.length) throw new BadRequestException('لا تكرر المستند في المعيار نفسه.');
    return { id: g.id as GateId, verificationStatus: g.verificationStatus as GateStatus, note: g.note.trim(), evidence };
  });
  if (new Set(gates.map(g => g.id)).size !== OPERATING_CYCLE_CLOSURE_GATES.length) throw new BadRequestException('معايير التقييم مكررة أو ناقصة.');
  gates.sort((a, b) => OPERATING_CYCLE_CLOSURE_GATES.findIndex(g => g.id === a.id) - OPERATING_CYCLE_CLOSURE_GATES.findIndex(g => g.id === b.id));
  if (confirmed && (x.confirmed !== true || typeof x.expectedPlanHash !== 'string' || !/^[a-f0-9]{64}$/.test(x.expectedPlanHash))) throw new BadRequestException('راجع المعاينة وأكد حفظ التقييم دون اعتباره إقفالًا.');
  return { expectedRevision: Number(x.expectedRevision), specificationVersion: x.specificationVersion, gates, expectedPlanHash: confirmed ? x.expectedPlanHash as string : undefined };
}
export function assessmentState(gates: GateInput[]) { return gates.some(g => g.verificationStatus === 'BLOCKED') ? 'BLOCKED' : 'NOT_ASSESSED'; }
export function assessmentReference(row: Pick<DepartmentClosureAssessment, 'id' | 'department' | 'revision'>) { return `DCA-${row.department}-${row.revision}-${row.id}`; }
export function assessmentDigest(row: Omit<DepartmentClosureAssessment, 'recordDigest'>) { return decisionDigest({ ...row, createdAt: row.createdAt.toISOString() }); }
export function readAssessment(row: DepartmentClosureAssessment): SavedGate[] {
  const { recordDigest, ...body } = row;
  if (row.policyVersion !== CLOSURE_ASSESSMENT_POLICY || recordDigest !== assessmentDigest(body) || !Number.isSafeInteger(row.revision) || row.revision < 1) throw new ConflictException('سجل تقييم الإدارة غير متسق؛ يلزم التحقق من تاريخه.');
  let gates: GateInput[];
  try {
    if (!Array.isArray(row.gates)) throw new Error();
    gates = assessmentInput({ expectedRevision: row.revision - 1, specificationVersion: row.specificationVersion, gates: (row.gates as unknown as SavedGate[]).map(g => ({ ...g, evidence: g.evidence.map(e => ({ documentId: e.documentId, version: e.version })) })) }).gates;
  } catch { throw new ConflictException('معايير التقييم المحفوظة غير متسقة.'); }
  const saved = row.gates as unknown as SavedGate[];
  if (assessmentState(gates) !== row.state || saved.some((g, i) => g.id !== gates[i].id || g.evidence.some(e => !e.contentHash || !e.referenceNumber || !/^[a-f0-9]{64}$/.test(e.sourceHash)))) throw new ConflictException('أدلة التقييم المحفوظة غير متسقة.');
  return saved;
}
export function publicAssessmentGates(gates: SavedGate[]) { return gates.map(g => ({ ...g, evidence: g.evidence.map(({ sourceHash, ...e }) => e) })); }
export function assessmentSpecification(department: DepartmentCode) { return departmentOperatingCycle(department).specificationVersion; }
