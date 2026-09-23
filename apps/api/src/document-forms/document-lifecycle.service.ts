import { BadRequestException, Injectable } from '@nestjs/common';
export type LifecycleStatus='DRAFT'|'PENDING_APPROVAL'|'APPROVED'|'SIGNED'|'ARCHIVED';
export interface LifecycleEvent { at:Date; actorId:string; action:string; from?:LifecycleStatus; to:LifecycleStatus; }
export interface ManagedDocument { id:string; organizationId:string; department:string; sequenceNo:string; status:LifecycleStatus; version:number; contentHash:string; createdBy:string; approvedBy?:string; signedBy?:string; archivedBy?:string; audit:LifecycleEvent[]; }
@Injectable()
export class DocumentLifecycleService {
 assignReference(organizationId:string,department:string,year:number,sequence:number){ if(!organizationId||!department||year<2020||sequence<1) throw new BadRequestException('Invalid document reference scope.'); return `${department}-${year}-${String(sequence).padStart(6,'0')}`; }
 create(input:Omit<ManagedDocument,'status'|'version'|'audit'>):ManagedDocument { if(!input.contentHash||!input.createdBy) throw new BadRequestException('Content hash and creator are required.'); return {...input,status:'DRAFT',version:1,audit:[{at:new Date(),actorId:input.createdBy,action:'CREATE',to:'DRAFT'}]}; }
 submit(d:ManagedDocument,actorId:string){ return this.move(d,actorId,'DRAFT','PENDING_APPROVAL','SUBMIT'); }
 approve(d:ManagedDocument,actorId:string){ if(actorId===d.createdBy) throw new BadRequestException('Creator cannot approve own document.'); const n=this.move(d,actorId,'PENDING_APPROVAL','APPROVED','APPROVE'); return {...n,approvedBy:actorId}; }
 sign(d:ManagedDocument,actorId:string){ if(actorId===d.createdBy||actorId===d.approvedBy) throw new BadRequestException('Electronic signer must be independent from creator and approver.'); const n=this.move(d,actorId,'APPROVED','SIGNED','SIGN'); return {...n,signedBy:actorId}; }
 archive(d:ManagedDocument,actorId:string){ const n=this.move(d,actorId,'SIGNED','ARCHIVED','ARCHIVE'); return {...n,archivedBy:actorId}; }
 revise(d:ManagedDocument,actorId:string,newHash:string){ if(d.status==='ARCHIVED') throw new BadRequestException('Archived document is immutable.'); if(!newHash||newHash===d.contentHash) throw new BadRequestException('Revision requires changed content hash.'); return {...d,contentHash:newHash,version:d.version+1,status:'DRAFT' as const,approvedBy:undefined,signedBy:undefined,audit:[...d.audit,{at:new Date(),actorId,action:'REVISE',from:d.status,to:'DRAFT'}]}; }
 private move(d:ManagedDocument,actorId:string,from:LifecycleStatus,to:LifecycleStatus,action:string):ManagedDocument { if(!actorId||d.status!==from) throw new BadRequestException(`Invalid document transition ${d.status} -> ${to}`); return {...d,status:to,audit:[...d.audit,{at:new Date(),actorId,action,from,to}]}; }
}
