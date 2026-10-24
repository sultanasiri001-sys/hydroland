import {randomUUID} from 'node:crypto';
import {PDFDocument} from 'pdf-lib';
export async function checkCenterLicensePlatformReview(db,{base,a,b,ownerA,ta,tb,ts,personAccount,tokenFor},check){
 const reviewer=await personAccount('platform-reviewer');await db.roleAssignment.deleteMany({where:{accountId:reviewer.id}});const role=await db.roleAssignment.create({data:{accountId:reviewer.id,role:'ADMIN',status:'ACTIVE'}});const tr=await tokenFor(reviewer.id);
 const request=async(token,path,body)=>{const r=await fetch(base+path,{method:body?'POST':'GET',headers:{...(token?{authorization:'Bearer '+token}:{}),...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});return{status:r.status,body:await r.json().catch(()=>null)}};
 const unit=await db.orgUnit.findFirstOrThrow({where:{organizationId:a.org.id,active:true}}),pdf=await PDFDocument.create();pdf.addPage();const base64=Buffer.from(await pdf.save()).toString('base64'),ids=[];
 const create=async expiresAt=>{const r=await request(ta,'/center/me/licenses/save',{type:'LICENSE',unitId:unit.id,referenceNumber:'PLATFORM-'+randomUUID(),subject:'Platform review fixture',issuedAt:'2020-01-01',expiresAt,mimeType:'application/pdf',base64});check(r.status===201,'Platform review fixture saved');ids.push(r.body.id);return r.body.id};
 try{
  check((await request(null,'/admin/center-licenses')).status===401,'Guest cannot list platform licenses');
  for(const token of [ta,tb,ts])check((await request(token,'/admin/center-licenses')).status===403,'Ordinary account cannot read platform queue');
  check(await db.organizationMember.count({where:{accountId:reviewer.id}})===0,'Platform reviewer has no center membership');
  const id=await create('2099-01-01'),submit='/center/me/licenses/'+id+'/submit',decision='/admin/center-licenses/'+id+'/decision';
  check((await request(tb,submit,{})).status===404,'Foreign center cannot submit license');
  check((await request(ts,submit,{})).status===403,'Staff cannot submit license');
  check((await request(ta,submit,{})).status===201,'Manager submits file to independent platform queue');
  check((await request(ta,submit,{})).status===201,'Repeated submit is idempotent');
  check(await db.auditEvent.count({where:{resourceId:id,action:'CENTER_LICENSE_PLATFORM_SUBMITTED'}})===1,'Repeated submit creates one audit');
  let row=await db.administrativeRecord.findUniqueOrThrow({where:{id}});check(row.status==='REGISTERED'&&row.licenseReviewStatus==='PENDING','Submission locks attachment and records pending review');
  const patch=await fetch(base+'/center/me/licenses/'+id+'/attachment',{method:'PATCH',headers:{authorization:'Bearer '+ta,'content-type':'application/json'},body:JSON.stringify({base64,mimeType:'application/pdf',issuedAt:'2020-01-01',expiresAt:'2099-01-01'})});check(patch.status===409,'Pending platform attachment cannot be replaced');
  const queue=await request(tr,'/admin/center-licenses');check(queue.status===200&&queue.body.some(x=>x.id===id),'Executive without center membership sees pending license');
  const file=await fetch(base+'/admin/center-licenses/'+id+'/attachment',{headers:{authorization:'Bearer '+tr}});check(file.status===200&&Buffer.from(await file.arrayBuffer()).toString('base64')===base64,'Independent reviewer reads original attachment');
  check((await request(ta,decision,{outcome:'APPROVED',expectedUpdatedAt:row.updatedAt})).status===403,'Center cannot approve its own request');
  const ownRole=await db.roleAssignment.create({data:{accountId:ownerA.id,role:'ADMIN',status:'ACTIVE'}});
  try{check((await request(ta,decision,{outcome:'APPROVED',expectedUpdatedAt:row.updatedAt})).status===403,'Admin role does not bypass conflict of interest')}finally{await db.roleAssignment.delete({where:{id:ownRole.id}})}
  check((await request(tr,decision,{outcome:'REJECTED',reason:'no',expectedUpdatedAt:row.updatedAt})).status===400,'Rejection needs meaningful reason');
  check((await request(tr,decision,{outcome:'APPROVED',expectedUpdatedAt:'2000-01-01'})).status===409,'Stale review cannot decide');
  await db.roleAssignment.update({where:{id:role.id},data:{status:'ARCHIVED'}});check((await request(tr,decision,{outcome:'APPROVED',expectedUpdatedAt:row.updatedAt})).status===403,'Revoked reviewer cannot decide in same session');await db.roleAssignment.update({where:{id:role.id},data:{status:'ACTIVE'}});
  const results=await Promise.all(['APPROVED','REJECTED'].map(outcome=>request(tr,decision,{outcome,reason:'Reviewed document',expectedUpdatedAt:row.updatedAt})));
  check(results.filter(x=>x.status===201).length===1&&results.filter(x=>x.status===409).length===1,'Concurrent decisions yield one immutable result');
  row=await db.administrativeRecord.findUniqueOrThrow({where:{id}});check(['APPROVED','REJECTED'].includes(row.licenseReviewStatus)&&row.licenseReviewDecidedById===reviewer.id,'Decision binds platform reviewer');
  check(await db.auditEvent.count({where:{resourceId:id,action:{in:['CENTER_LICENSE_PLATFORM_APPROVED','CENTER_LICENSE_PLATFORM_REJECTED']}}})===1,'Exactly one decision audit persists');
  const view=await request(ta,'/center/me/documents');check(view.body.licenses.some(x=>x.id===id&&x.licenseReviewStatus===row.licenseReviewStatus&&x.licenseReviewReason==='Reviewed document'),'Center sees independent decision and reason');
  const expired=await create('2021-01-01');await request(ta,'/center/me/licenses/'+expired+'/submit',{});const old=await db.administrativeRecord.findUniqueOrThrow({where:{id:expired}});
  check((await request(tr,'/admin/center-licenses/'+expired+'/decision',{outcome:'APPROVED',expectedUpdatedAt:old.updatedAt})).status===409,'Expired license cannot be approved');
  check((await request(tr,'/admin/center-licenses/'+expired+'/decision',{outcome:'REJECTED',reason:'الرخصة منتهية الصلاحية',expectedUpdatedAt:old.updatedAt})).status===201,'Expired license can be rejected with reason');
 }finally{
  await db.auditEvent.deleteMany({where:{resourceId:{in:ids}}});await db.administrativeRecord.deleteMany({where:{id:{in:ids}}});
 }
}
