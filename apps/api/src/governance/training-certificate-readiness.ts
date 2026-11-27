import { HttpException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { trainingCompletion } from './training-completion-policy';
import { assertTrainingStandardCompletion, standardRequest } from './training-standard-store';

export type CertificateCompletionRecord = {
  enrollmentId: string; status: string; progressPercent: number;
  enrollment: { status: string };
  stages: { skills: { status: string; signedOffByInstructorId?: string | null; signedOffAt?: unknown }[] }[];
  sessions: { status: string }[];
};

const publicReasonCodes = new Set([
  'STANDARD_SELECTION_REQUIRED', 'STANDARD_BINDING_MISMATCH', 'TRAINING_STANDARD_NOT_APPROVED',
  'AGENCY_INSTRUCTOR_CREDENTIAL_REQUIRED', 'TRAINING_STANDARD_EVIDENCE_REQUIRED',
  'DIVE_PROGRESSION_POLICY_REQUIRED', 'TRAINING_DIVE_PROGRESSION_REQUIRED', 'DIVE_EVIDENCE_INVALID',
  'PARTICIPATION_NOT_CLEARED', 'COURSE_COLLECTION_REQUIRED',
]);

/** Read-only projection of the exact production completion gate, not a second policy. */
export async function certificateCompletionReadiness(tx: Prisma.TransactionClient, record: CertificateCompletionRecord) {
  const reasons = [...trainingCompletion(record).reasons], reasonCodes: string[] = [];
  if (reasons.length) reasonCodes.push('TRAINING_PLAN_INCOMPLETE');
  if (record.status !== 'COMPLETED' || record.progressPercent !== 100 || record.enrollment.status !== 'COMPLETED') {
    reasonCodes.push('TRAINING_RECORD_NOT_COMPLETED');
    reasons.push('يجب إتمام سجل الدورة والتسجيل بنسبة 100% قبل اعتماد الشهادة.');
  }
  let binding: Awaited<ReturnType<typeof assertTrainingStandardCompletion>> | null = null;
  // An incomplete record is already blocked. Completed records must pass every
  // current program, qualification, participation and original evidence check.
  if (!reasonCodes.length) {
    try {
      binding = await standardRequest(() => assertTrainingStandardCompletion(tx, record.enrollmentId));
    } catch (error) {
      if (!(error instanceof HttpException) || error.getStatus() < 400 || error.getStatus() >= 500) throw error;
      const response = error.getResponse();
      const code = response && typeof response === 'object' && 'code' in response ? response.code : null;
      reasonCodes.push(typeof code === 'string' && publicReasonCodes.has(code) ? code : 'COMPLETION_EVIDENCE_REVIEW_REQUIRED');
      // Do not expose D01 medical/identity details, raw database errors or source payloads.
      reasons.push('تتطلب مصادر البرنامج أو الأهلية أو أدلة الإتمام مراجعة حالية قبل الاعتماد الداخلي.');
    }
  }
  return {
    readiness: { ready: reasonCodes.length === 0, reasonCodes, scope: 'INTERNAL_COMPLETION' as const, externalCertificationGranted: false as const },
    reasons, binding,
  };
}
