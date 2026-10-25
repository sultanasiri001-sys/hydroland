/** Read-only explanation of the EXISTING workflow. This never grants authority,
 * changes actor attribution, or treats draft preparation as an approval/signature. */
export type DocumentWorkflowStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'SIGNED' | 'ARCHIVED';
export type WorkflowStep = 'APPROVE' | 'SIGN';
export type WorkflowBlocker = 'OWNER_IS_CREATOR' | 'OWNER_WOULD_APPROVE_AND_SIGN' | 'OWNER_IS_APPROVER' | 'APPROVAL_EVIDENCE_MISSING';
export interface WorkflowRecord {
  id: string; organizationId: string; version: number; status: DocumentWorkflowStatus;
  createdByAccountId: string; approvedByAccountId: string | null;
}
export function documentWorkflowReadiness(record: WorkflowRecord, actor: { accountId: string; role: string; internalOwnerOnly: boolean }) {
  const manager = ['OWNER', 'ADMIN'].includes(actor.role);
  const writer = ['OWNER', 'ADMIN', 'OPERATOR', 'INSTRUCTOR', 'STAFF'].includes(actor.role);
  const creator = record.createdByAccountId === actor.accountId;
  const approver = record.approvedByAccountId === actor.accountId;
  const blockers: Array<{ step: WorkflowStep; reason: WorkflowBlocker }> = [];
  if (actor.internalOwnerOnly) {
    if (record.status === 'DRAFT' || record.status === 'PENDING_APPROVAL') {
      if (creator) blockers.push({ step: 'APPROVE', reason: 'OWNER_IS_CREATOR' });
      // Even when an older document has a different creator, the sole permitted
      // owner would become its approver and cannot also be its independent signer.
      blockers.push({ step: 'SIGN', reason: 'OWNER_WOULD_APPROVE_AND_SIGN' });
    } else if (record.status === 'APPROVED') {
      if (creator) blockers.push({ step: 'SIGN', reason: 'OWNER_IS_CREATOR' });
      if (approver) blockers.push({ step: 'SIGN', reason: 'OWNER_IS_APPROVER' });
    }
  }
  if (record.status === 'APPROVED' && !record.approvedByAccountId) {
    blockers.push({ step: 'SIGN', reason: 'APPROVAL_EVIDENCE_MISSING' });
  }
  return {
    schemaVersion: 1,
    organizationId: record.organizationId, documentId: record.id, documentVersion: record.version,
    status: record.status, scope: actor.internalOwnerOnly ? 'INTERNAL_OWNER_ONLY' : 'ORGANIZATION_MEMBERSHIP',
    // These explain the inspected actor/status only, not a permission token.
    actorActions: {
      edit: writer && record.status === 'DRAFT',
      submit: writer && record.status === 'DRAFT',
      approve: manager && record.status === 'PENDING_APPROVAL' && !creator,
      sign: manager && record.status === 'APPROVED' && !creator && !approver && Boolean(record.approvedByAccountId),
      archive: manager && record.status === 'SIGNED',
    },
    blockers,
    policyDecisionRequired: actor.internalOwnerOnly && blockers.length > 0,
    assessment: blockers.length ? 'BLOCKED' : record.status === 'ARCHIVED' ? 'ARCHIVED_READ_ONLY'
      : record.status === 'SIGNED' ? 'SIGNED_ARCHIVE_REMAINS' : 'ACTOR_CHECK_ONLY',
    observationOnly: true,
  };
}
