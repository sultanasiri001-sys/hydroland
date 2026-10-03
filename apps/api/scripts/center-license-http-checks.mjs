import {PDFDocument} from 'pdf-lib';
import {randomUUID,createHash} from 'node:crypto';
export async function checkCenterLicenses(db,{base,a,b,ownerA,staff,ta,tb,ts},check){
  const record=await db.administrativeRecord.findFirstOrThrow({where:{organizationId:a.org.id,type:'LICENSE'}});
  const memo=await db.administrativeRecord.findFirstOrThrow({where:{organizationId:a.org.id,type:'INTERNAL_MEMO'}});
  const pdf=await PDFDocument.create();pdf.addPage();const bytes=Buffer.from(await pdf.save());
  const input={mimeType:'application/pdf',base64:bytes.toString('base64'),issuedAt:'2025-01-01',expiresAt:'2030-01-01'};
  const request=async(token,path,method='GET',body)=>fetch(base+path,{method,headers:{...(token?{authorization:'Bearer '+token}:{}),...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const path='/center/me/licenses/'+record.id+'/attachment';
  const attach=(token=ta,body=input,target=path)=>request(token,target,'PATCH',body);
  let reviewUnit;
  try{
    check((await attach()).status===409,'Registered license attachment must be immutable');
    await db.administrativeRecord.update({where:{id:record.id},data:{status:'DRAFT'}});
    check((await request(ta,path)).status===404,'Missing attachment returns 404');
    check((await attach(tb)).status===404,'Foreign center cannot attach');
    check((await request(tb,path)).status===404,'Foreign center cannot download');
    check((await attach(ts)).status===403,'Ordinary staff cannot attach');
    check((await request(ts,path)).status===403,'Ordinary staff cannot download');
    check((await request(undefined,path,'PATCH',input)).status===401,'Guest cannot attach');
    check((await request(undefined,path)).status===401,'Guest cannot download');
    check((await attach(ta,input,'/center/me/licenses/'+memo.id+'/attachment')).status===404,'Internal memo is not a license');
    for(const invalid of [{base64:'!!!!'},{mimeType:'text/html'},{base64:Buffer.from('%PDF-not-a-document').toString('base64')},{issuedAt:'2025-02-30'},{expiresAt:'2024-01-01'},{expiresAt:null},{base64:Buffer.alloc(2_000_001).toString('base64')}]){
      check((await attach(ta,{...input,...invalid})).status===400,'Malformed license data must be rejected: '+Object.keys(invalid)[0]);
    }
    check(await db.auditEvent.count({where:{resourceId:record.id,action:'CENTER_LICENSE_ATTACHED'}})===0,'Denied upload must not audit success');
    let r=await attach();check(r.status===200,'Draft license upload succeeds');const attached=await r.json();
    check(!('content' in attached)&&!('base64' in attached),'Upload response excludes bytes');
    const saved=await db.organizationDocumentAsset.findUniqueOrThrow({where:{id:attached.licenseAssetId}});
    check(saved.kind==='LICENSE_ATTACHMENT'&&saved.organizationId===a.org.id&&saved.sha256===createHash('sha256').update(bytes).digest('hex'),'Persisted file kind, center and digest match');
    const audit=await db.auditEvent.findFirst({where:{resourceId:record.id,action:'CENTER_LICENSE_ATTACHED'}});
    check(audit?.actorId===ownerA.personId&&audit.metadata.assetId===saved.id,'Attachment audit links actor and asset');
    r=await request(ta,path);check(r.status===200&&r.headers.get('cache-control')==='private, no-store'&&r.headers.get('content-disposition').startsWith('attachment;'),'Download is private and attachment-only');
    check(Buffer.from(await r.arrayBuffer()).equals(bytes),'Download round-trips exact bytes');
    await db.organizationDocumentAsset.update({where:{id:saved.id},data:{content:Buffer.from('tampered')}});
    check((await request(ta,path)).status===409,'Tampered file is not downloaded');
    await db.organizationDocumentAsset.update({where:{id:saved.id},data:{content:bytes}});
    await db.roleAssignment.update({where:{accountId_role:{accountId:ownerA.id,role:'DIVE_CENTER'}},data:{status:'SUSPENDED'}});
    check((await attach()).status===403&&(await request(ta,path)).status===403,'Revoked center role denies both new routes immediately');
    await db.roleAssignment.update({where:{accountId_role:{accountId:ownerA.id,role:'DIVE_CENTER'}},data:{status:'ACTIVE'}});
    check((await attach()).status===200,'Restored role can replace draft attachment');
    check(await db.organizationDocumentAsset.count({where:{organizationId:a.org.id,sha256:saved.sha256}})===1,'Identical file deduplicates within center');
    r=await request(ta,`/administrative-affairs/records/${record.id}/register`,'PATCH');check(r.status===200,'Existing administrative registration freezes attachment');
    check((await attach(ta,{...input,expiresAt:'2031-01-01'})).status===409,'Dates cannot change after registration');
    const stored=await db.administrativeRecord.findUniqueOrThrow({where:{id:record.id}});
    check(stored.licenseExpiresAt.toISOString().startsWith('2030-01-01'),'Denied replacement preserves expiry');
    reviewUnit=await db.orgUnit.create({data:{organizationId:a.org.id,type:'DEPARTMENT',code:'LICENSE-REVIEW-'+randomUUID(),nameAr:'مراجعة داخلية'}});
    r=await request(ta,`/administrative-affairs/records/${record.id}/routings`,'POST',{toUnitId:reviewUnit.id});check(r.status===201,'License uses existing internal routing');const routing=await r.json();
    await db.organizationMember.update({where:{organizationId_accountId:{organizationId:a.org.id,accountId:staff.id}},data:{role:'ADMIN'}});
    r=await request(ta,`/administrative-affairs/routings/${routing.id}/assign`,'PATCH',{assigneeAccountId:staff.id});check(r.status===200,'Separate eligible reviewer can be assigned');
    r=await request(ta,`/administrative-affairs/routings/${routing.id}/decision`,'PATCH',{decision:'APPROVE'});check(r.status===403,'Requester cannot decide assigned review');
    r=await request(ts,`/administrative-affairs/routings/${routing.id}/decision`,'PATCH',{decision:'APPROVE'});check(r.status===200,'Assigned independent reviewer can decide');
    const listed=await request(ta,'/center/me/documents');const view=(await listed.json()).licenses.find(x=>x.id===record.id);
    check(view.licenseAssetId===saved.id&&view.licenseExpiresAt.startsWith('2030-01-01')&&view.routings[0].decision==='APPROVE','Center list links attachment, validity and internal review');
    check(!JSON.stringify(view).includes(input.base64),'License list excludes file bytes');
  }finally{
    await db.organizationMember.update({where:{organizationId_accountId:{organizationId:a.org.id,accountId:staff.id}},data:{role:'STAFF'}});
    await db.administrativeRouting.deleteMany({where:{recordId:record.id}});
    if(reviewUnit)await db.orgUnit.delete({where:{id:reviewUnit.id}});
    await db.auditEvent.deleteMany({where:{actorId:{in:[ownerA.personId,staff.personId]},action:{in:['CENTER_LICENSE_ATTACHED','ADMIN_RECORD_REGISTERED','ADMIN_ROUTING_CREATED','ADMIN_ROUTING_ASSIGNED','ADMIN_ROUTING_APPROVE']}}});
  }
}
