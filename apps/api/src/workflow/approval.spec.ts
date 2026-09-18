import { ApprovalService } from './approval.service';
const service=new ApprovalService();
const req={id:'r',requesterAccountId:'owner',scopeId:'c1',status:'UNDER_REVIEW' as const};
let blocked=false;try{service.transition(req,'APPROVED','owner');}catch{blocked=true;}if(!blocked)throw new Error('self approval must be denied');
const approved=service.transition(req,'APPROVED','reviewer');if(approved.status!=='APPROVED')throw new Error('reviewer transition failed');
