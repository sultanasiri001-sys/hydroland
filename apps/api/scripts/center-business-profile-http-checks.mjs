import {randomUUID} from 'node:crypto';
export async function checkCenterBusinessProfile(db,{base,a,b,ownerA,ta,tb,ts},check){
 const before=await db.organization.findUniqueOrThrow({where:{id:a.org.id}});
 const endpoint='/center/'+a.org.id+'/business-profile';
 const patch=async(token,body,path=endpoint)=>{const r=await fetch(base+path,{method:'PATCH',headers:{...(token?{authorization:'Bearer '+token}:{}),'content-type':'application/json'},body:JSON.stringify(body)});return{status:r.status,body:await r.json().catch(()=>null)}};
 const body={displayName:'اسم المركز المعدل',legalName:'الاسم النظامي',registrationNumber:'PROFILE-'+randomUUID(),regionCode:'عسير',expectedUpdatedAt:before.updatedAt};
 try{
  check((await patch(null,body)).status===401,'Guest cannot edit center business profile');
  check((await patch(tb,body)).status===403,'Other center cannot edit profile');
  check((await patch(ts,body)).status===403,'Staff cannot edit profile');
  for(const invalid of [{displayName:''},{displayName:123},{legalName:[]},{registrationNumber:'x'.repeat(121)},{regionCode:'x'.repeat(33)},{expectedUpdatedAt:'invalid'},{ownerId:'spoof'},{status:'ACTIVE'},{kind:'OTHER'}])check((await patch(ta,{...body,...invalid})).status===400,'Invalid or privileged profile field rejected '+Object.keys(invalid)[0]);
  await db.roleAssignment.update({where:{accountId_role:{accountId:ownerA.id,role:'DIVE_CENTER'}},data:{status:'ARCHIVED'}});check((await patch(ta,body)).status===403,'Revoked center role cannot edit');await db.roleAssignment.update({where:{accountId_role:{accountId:ownerA.id,role:'DIVE_CENTER'}},data:{status:'ACTIVE'}});
  let result=await patch(ta,body);check(result.status===200&&result.body.regionCode==='ASIR','Manager saves normalized business profile');
  let row=await db.organization.findUniqueOrThrow({where:{id:a.org.id}});check(row.displayName===body.displayName&&row.legalName===body.legalName&&row.registrationNumber===body.registrationNumber,'All edited metadata persists');check(row.ownerId===before.ownerId&&row.kind===before.kind&&row.status===before.status,'Editing metadata does not transfer ownership or activate center');
  const audit=await db.auditEvent.findFirst({where:{resourceId:a.org.id,action:'CENTER_BUSINESS_PROFILE_UPDATED'}});check(audit?.actorId===ownerA.personId&&audit.metadata.changedFields.includes('displayName'),'Profile audit binds actual manager and changed fields');
  check((await patch(ta,{...body,displayName:'stale'})).status===409,'Stale profile revision cannot overwrite newer data');
  const duplicate='DUPLICATE-'+randomUUID();await db.organization.update({where:{id:b.org.id},data:{registrationNumber:duplicate}});check((await patch(ta,{...body,registrationNumber:duplicate,expectedUpdatedAt:row.updatedAt})).status===409,'Duplicate registration returns conflict');
  check((await db.organization.findUniqueOrThrow({where:{id:a.org.id}})).registrationNumber===body.registrationNumber,'Failed update retains saved fields');
  const results=await Promise.all(['Concurrent A','Concurrent B'].map(displayName=>patch(ta,{displayName,expectedUpdatedAt:row.updatedAt})));
  check(results.filter(x=>x.status===200).length===1&&results.filter(x=>x.status===409).length===1,'Concurrent profile saves preserve one revision');
  row=await db.organization.update({where:{id:a.org.id},data:{status:'SUSPENDED'}});check((await patch(ta,{...body,expectedUpdatedAt:row.updatedAt})).status===409,'Suspended center cannot change profile');
  row=await db.organization.update({where:{id:a.org.id},data:{status:'REJECTED'}});result=await patch(ta,{displayName:'Corrected center',expectedUpdatedAt:row.updatedAt});check(result.status===200&&result.body.status==='PENDING_REVIEW','Rejected profile correction returns to review, never self-activates');
 }finally{
  const {id,createdAt,updatedAt,...data}=before;await db.organization.update({where:{id},data});await db.organization.update({where:{id:b.org.id},data:{registrationNumber:null}});await db.roleAssignment.update({where:{accountId_role:{accountId:ownerA.id,role:'DIVE_CENTER'}},data:{status:'ACTIVE'}});await db.auditEvent.deleteMany({where:{resourceId:id,action:'CENTER_BUSINESS_PROFILE_UPDATED'}});
 }
}
