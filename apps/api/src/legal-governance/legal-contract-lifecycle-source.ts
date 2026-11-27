import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { contractHash, COOPERATION_CODE, readCooperation } from '../document-forms/cooperation-contract.domain';
import { isLibraryCode, readLibrary } from '../document-forms/contract-library.domain';
import { validateDocumentPayload } from '../document-forms/document-payload';
import { platformOrganization } from '../hr/staffing-catalog';
import { dateOnly, hash, id, integer, json, LEGAL_CONTRACT_CODE, LEGAL_DEPARTMENT, LEGAL_EVIDENCE_CODE, LegalSource, object, requireState, text } from './legal-contract-lifecycle.domain';

async function librarySource(tx: Prisma.TransactionClient, reference: Record<string,unknown>) {
  const libraryId=id(reference.templateId), version=integer(reference.version,'Library version',1), digest=text(reference.contentHash,'Library hash',80);
  const row=await tx.documentTemplate.findUnique({where:{id:libraryId}}), platform=await platformOrganization(tx);
  requireState(row && platform && row.organizationId===platform.id && isLibraryCode(row.code) && row.version===version,'The contract library version is unavailable.');
  const envelope=readLibrary(row);
  requireState(['PUBLISHED','RETIRED'].includes(envelope.state) && envelope.publishedBy && envelope.publishedAt
    && envelope.content.category!=='EMPLOYMENT' && envelope.contentHash===digest && envelope.legalReview?.contentHash===digest,
    'The source requires a published non-employment library version and its legal review.');
  return json({id:row.id,code:row.code,version:row.version,titleAr:row.titleAr,titleEn:row.titleEn,contentHash:envelope.contentHash,
    content:envelope.content,legalReview:envelope.legalReview,publishedAt:envelope.publishedAt,publishedBy:envelope.publishedBy});
}

/** Verify existing document history and bytes. This reader never approves or
 * signs a document and never grants legal, employment or operating authority. */
export async function legalNativeSource(tx: Prisma.TransactionClient, organizationId: string, documentId: string, kind: 'CONTRACT'|'EVIDENCE'): Promise<LegalSource> {
  await tx.$queryRaw`SELECT "id" FROM "ManagedDocument" WHERE "id"::text=${documentId} AND "organizationId"::text=${organizationId} FOR SHARE`;
  const d=await tx.managedDocument.findFirst({where:{id:documentId,organizationId},include:{template:true,revisions:true,lifecycleEvents:true,attachments:true}});
  if(!d)throw new NotFoundException('The signed document is not in this organization.');
  requireState(['SIGNED','ARCHIVED'].includes(d.status) && d.template.organizationId===organizationId && d.department===LEGAL_DEPARTMENT && d.template.department===d.department,
    'A signed native legal document is required.');
  const cooperation=d.template.code===COOPERATION_CODE;
  requireState(kind==='CONTRACT'?cooperation||d.template.code===LEGAL_CONTRACT_CODE:d.template.code===LEGAL_EVIDENCE_CODE,'The document type does not match this operation.');
  const payload=object(d.payload);
  const revisions=d.revisions.filter(r=>r.version===d.version);
  requireState(revisions.length===1 && revisions[0].contentHash===d.contentHash && hash(revisions[0].payload)===hash(payload),
    'The document differs from its immutable revision.');
  const events=d.lifecycleEvents.filter(e=>e.version===d.version).sort((a,b)=>a.occurredAt.getTime()-b.occurredAt.getTime()||a.id.localeCompare(b.id));
  let library:Record<string,unknown>|null=null, signatureEvents:typeof events=[], actorIds:string[]=[];
  if(cooperation){
    const p=readCooperation(payload);
    requireState(d.documentBrandVersion && contractHash(p,d.templateId,d.documentBrandVersion)===d.contentHash && p.librarySource,'Cooperation contract provenance is incomplete.');
    library=await librarySource(tx,p.librarySource);
    const binding=object(d.template.fields);
    requireState(binding.kind==='CONTRACT_LIBRARY_BINDING_V1'&&binding.libraryTemplateId===p.librarySource.templateId&&binding.libraryVersion===p.librarySource.version&&binding.libraryContentHash===p.librarySource.contentHash&&hash(p.clauses)===hash(object(library.content).clauses),'The cooperation template binding and original clauses do not match their library version.');
    const center=events.filter(e=>e.action==='CONTRACT_SIGN_CENTER'), professional=events.filter(e=>e.action==='CONTRACT_SIGN_PROFESSIONAL'), approvals=events.filter(e=>e.action==='CONTRACT_PLATFORM_APPROVED');
    requireState(center.length===1 && professional.length===1 && approvals.length===1,'The cooperation contract requires both original signatures and platform approval.');
    requireState(center[0].actorAccountId===p.centerAccountId && professional[0].actorAccountId===p.professionalAccountId,'The cooperation parties do not match the signature history.');
    for(const e of [center[0],professional[0]]){
      const m=object(e.metadata);
      requireState(m.contentHash===d.contentHash && m.consent===true && m.method==='AUTHENTICATED_ACKNOWLEDGEMENT' && typeof m.signedName==='string','The cooperation signature is incomplete.');
    }
    const approval=object(approvals[0].metadata);
    requireState(approval.contentHash===d.contentHash && approval.kind==='INTERNAL_PLATFORM_APPROVAL' && typeof approval.decisionId==='string', 'The cooperation approval is incomplete.');
    requireState(d.approvedByAccountId===approvals[0].actorAccountId&&d.approvedAt&&d.signedAt&&[center[0],professional[0]].some(e=>e.actorAccountId===d.signedByAccountId&&e.occurredAt.getTime()===d.signedAt!.getTime())
      &&d.approvedAt>=center[0].occurredAt&&d.approvedAt>=professional[0].occurredAt,'The native cooperation approval and signature fields are inconsistent.');
    if(p.centerSealRequired){
      const seal=object(object(center[0].metadata).centerSeal);
      const asset=await tx.organizationDocumentAsset.findFirst({where:{id:id(seal.assetId),organizationId,kind:'CENTER_SEAL'}});
      requireState(asset && seal.consent===true && asset.sha256===seal.sha256 && createHash('sha256').update(asset.content).digest('hex')===asset.sha256,'The original center seal is unavailable.');
    }
    signatureEvents=[center[0],professional[0],approvals[0]];
    actorIds=signatureEvents.map(e=>e.actorAccountId);
    requireState(approvals[0].occurredAt>=center[0].occurredAt && approvals[0].occurredAt>=professional[0].occurredAt,'Approval must follow both signatures.');
  }else{
    validateDocumentPayload(d.template.fields,d.payload);
    const approvals=events.filter(e=>e.action==='APPROVED'&&e.fromStatus==='PENDING_APPROVAL'&&e.toStatus==='APPROVED');
    const signatures=events.filter(e=>e.action==='SIGNED'&&e.fromStatus==='APPROVED'&&e.toStatus==='SIGNED');
    requireState(approvals.length===1&&signatures.length===1&&d.approvedByAccountId&&d.approvedAt&&d.signedByAccountId&&d.signedAt
      &&approvals[0].actorAccountId===d.approvedByAccountId&&signatures[0].actorAccountId===d.signedByAccountId
      &&d.signedAt>=d.approvedAt&&d.signedAt<=new Date(),'The native signature and approval history is incomplete.');
    actorIds=[d.createdByAccountId,d.approvedByAccountId,d.signedByAccountId];signatureEvents=[approvals[0],signatures[0]];
    if(kind==='CONTRACT'){
      requireState(payload.purpose==='B06_CONTRACT_V1','Unsupported contract source purpose.');
      library=await librarySource(tx,{templateId:payload.libraryTemplateId,version:payload.libraryVersion,contentHash:payload.libraryContentHash});
      requireState(object(library.content).category==='GENERAL'&&object(library.content).workflow==='REFERENCE_TEMPLATE_V1','Use the native cooperation or employment signing workflow for specialized contract templates.');
      text(payload.partyReferences,'Party capacity and authority',8000);text(payload.terms,'Signed contract terms',8000);
    }else requireState(payload.purpose==='B06_LEGAL_EVIDENCE_V1','Unsupported legal evidence purpose.');
  }
  const authors=await tx.account.findMany({where:{id:{in:actorIds}},select:{id:true,personId:true}});
  requireState(authors.length===3 && new Set(authors.map(a=>a.personId)).size===3,'The native document requires three independent people.');
  const brand=d.documentBrandVersion?await tx.documentBrandSnapshot.findUnique({where:{organizationId_brandVersion:{organizationId,brandVersion:d.documentBrandVersion}}}):null;
  requireState(brand,'The signed document branding revision is unavailable.');
  const attachments=d.attachments.sort((a,b)=>a.id.localeCompare(b.id)).map(a=>{
    const bytes=Buffer.from(a.content);
    requireState(a.organizationId===organizationId&&a.byteSize===bytes.length&&createHash('sha256').update(bytes).digest('hex')===a.sha256&&a.mimeType==='application/pdf'&&bytes.subarray(0,5).toString('ascii')==='%PDF-',
      'An original attachment no longer matches its recorded bytes.');
    return {id:a.id,filename:a.filename,mimeType:a.mimeType,byteSize:a.byteSize,sha256:a.sha256};
  });
  const snapshot=json({id:d.id,organizationId,referenceNumber:d.referenceNumber,version:d.version,contentHash:d.contentHash,payload:d.payload,
    createdByAccountId:d.createdByAccountId,approvedByAccountId:d.approvedByAccountId,signedByAccountId:d.signedByAccountId,approvedAt:d.approvedAt,signedAt:d.signedAt,documentBrandVersion:d.documentBrandVersion,
    template:{id:d.templateId,code:d.template.code,version:d.template.version,titleAr:d.template.titleAr,titleEn:d.template.titleEn,fields:d.template.fields},
    revision:{id:revisions[0].id,version:revisions[0].version,contentHash:revisions[0].contentHash,createdByAccountId:revisions[0].createdByAccountId,createdAt:revisions[0].createdAt},
    brand,authors:authors.sort((a,b)=>a.id.localeCompare(b.id)),signatureEvents:signatureEvents.map(e=>({id:e.id,actorAccountId:e.actorAccountId,action:e.action,version:e.version,metadata:e.metadata,occurredAt:e.occurredAt})),attachments,library});
  return {id:d.id,organizationId,version:d.version,hash:hash(snapshot),referenceNumber:d.referenceNumber,titleAr:d.template.titleAr,titleEn:d.template.titleEn,
    snapshot,payload,signedAt:signatureEvents[signatureEvents.length-1].occurredAt.toISOString()};
}

export function legalContractTerms(source:LegalSource){
  const p=source.payload, cooperation=p.workflow==='DIVE_COOPERATION_V1',terms=cooperation?object(p.terms):p;
  const effectiveFrom=dateOnly(cooperation?terms.startDate:terms.effectiveFrom,'Contract effective date'), expiresOn=dateOnly(cooperation?terms.endDate:terms.expiresOn,'Contract expiry');
  if(expiresOn<effectiveFrom)throw new ConflictException('The signed contract validity dates are inconsistent.');
  return {subject:text(cooperation?terms.services:p.subject,'Contract subject',2000),effectiveFrom,expiresOn,
    applicabilityReference:text(cooperation?object(p.center).license:p.applicabilityReference,'Applicability reference',2000),
    applicabilityScope:text(cooperation?object(p.professional).eligibility:p.applicabilityScope,'Applicability scope',8000)};
}
