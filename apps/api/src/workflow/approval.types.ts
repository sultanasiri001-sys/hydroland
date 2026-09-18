export type ApprovalStatus='DRAFT'|'SUBMITTED'|'UNDER_REVIEW'|'MORE_INFO_REQUIRED'|'RESUBMITTED'|'APPROVED'|'REJECTED'|'SUSPENDED'|'ARCHIVED';
export interface ApprovalRequest { id:string; requesterAccountId:string; scopeId:string; status:ApprovalStatus; reviewerAccountId?:string; }
export const approvalTransitions:Record<ApprovalStatus,ApprovalStatus[]>={
 DRAFT:['SUBMITTED'], SUBMITTED:['UNDER_REVIEW'], UNDER_REVIEW:['MORE_INFO_REQUIRED','APPROVED','REJECTED','SUSPENDED'],
 MORE_INFO_REQUIRED:['RESUBMITTED'], RESUBMITTED:['UNDER_REVIEW'], APPROVED:['ARCHIVED'], REJECTED:['ARCHIVED'], SUSPENDED:['UNDER_REVIEW','ARCHIVED'], ARCHIVED:[]
};
