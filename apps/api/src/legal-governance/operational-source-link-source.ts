import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { reviewPlatform, reviewSource } from '../document-forms/internal-document-review.domain';
import { validateDocumentPayload } from '../document-forms/document-payload';
import { decisionDigest } from '../document-forms/owner-administrative-decision.domain';
import { plain, readSourceLinkBatch, sourceLinkKey, sourceLinkPointer, sourceLinkRows, SOURCE_LINK_DEPARTMENT, SOURCE_LINK_FIELD, SOURCE_LINK_TEMPLATE } from './operational-source-link.domain';

export async function operationalMatrixSource(tx: Prisma.TransactionClient, org: string, id: string) {
  const source=await reviewSource(tx,org,id), d=source.d;
  if (d.department!==SOURCE_LINK_DEPARTMENT || d.template.code!==SOURCE_LINK_TEMPLATE || d.status==='ARCHIVED') throw new ForbiddenException('اختر مصفوفة تشغيل محفوظة غير مؤرشفة في إدارة السلامة للجهة الداخلية.');
  validateDocumentPayload(d.template.fields,d.payload);
  return {d,rows:sourceLinkRows(d.payload),digest:decisionDigest({sourceHash:source.sourceHash,status:d.status,approvedBy:d.approvedByAccountId,approvedAt:d.approvedAt?.toISOString()??null,signedBy:d.signedByAccountId,signedAt:d.signedAt?.toISOString()??null,archivedBy:d.archivedByAccountId,archivedAt:d.archivedAt?.toISOString()??null})};
}
export type SourceReviewStatus='UNLINKED'|'LINKED_FOR_REVIEW'|'STALE';
type Control={id:string;category:string;ruleKey:string;metadata:unknown};
// General ADMIN discovery receives statuses only, not owner document IDs,
// reasons, source rows or approval actors. Missing/corrupt sources stay stale.
export async function operationalSourceReviewStatuses(tx: Prisma.TransactionClient, org: string, controls: Control[]) {
  const statuses=new Map<string,SourceReviewStatus>(), batches=new Map<string,Awaited<ReturnType<typeof resolve>>|null>();
  let authority: string|undefined;
  async function resolve(id:string){
    const record=await tx.operationalSetting.findUnique({where:{key:sourceLinkKey(org,id)},select:{value:true}});
    const batch=readSourceLinkBatch(record?.value,org,id);
    if(!authority){const p=await reviewPlatform(tx);if(p.id!==org)throw new ConflictException('تغيرت الجهة الداخلية.');authority=decisionDigest(JSON.parse(JSON.stringify(p)));}
    if(batch.authorityDigest!==authority)throw new ConflictException('تغيرت سلطة حفظ الربط.');
    const source=await operationalMatrixSource(tx,org,batch.documentId);
    if(source.d.version!==batch.documentVersion || source.d.referenceNumber!==batch.referenceNumber || source.digest!==batch.sourceDigest || JSON.stringify(source.rows.map(r=>r.controlId).sort())!==JSON.stringify(batch.controls.map(c=>c.controlId).sort()))throw new ConflictException('تغيرت نسخة المصفوفة أو أدلتها.');
    return batch;
  }
  for(const control of controls){
    const key=control.category+'.'+control.ruleKey;
    if(!Object.hasOwn(plain(control.metadata),SOURCE_LINK_FIELD)){statuses.set(key,'UNLINKED');continue;}
    try{
      const pointer=sourceLinkPointer(control.metadata)!;
      if(!batches.has(pointer.id))batches.set(pointer.id,await resolve(pointer.id));
      const batch=batches.get(pointer.id);
      if(!batch || batch.digest!==pointer.digest || !batch.controls.some(c=>c.id===control.id&&c.controlId===key))throw new ConflictException('لا يطابق الربط هذا الضابط.');
      statuses.set(key,'LINKED_FOR_REVIEW');
    }catch(e){if(e instanceof BadRequestException||e instanceof ConflictException||e instanceof ForbiddenException){try{const pointer=sourceLinkPointer(control.metadata);if(pointer&&!batches.has(pointer.id))batches.set(pointer.id,null);}catch{}statuses.set(key,'STALE');continue;}throw e;}
  }
  return statuses;
}
