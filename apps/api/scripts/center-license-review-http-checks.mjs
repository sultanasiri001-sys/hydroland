import {randomUUID} from 'node:crypto';
export async function checkCenterLicenseReview(db,{base,a,b,ownerA,staff,ta,tb,ts},check){
  const source=await db.administrativeRecord.findFirstOrThrow({where:{organizationId:a.org.id,type:'LICENSE',licenseAssetId:{not:null}}});
  const file=await db.organizationDocumentAsset.findUniqueOrThrow({where:{id:source.licenseAssetId}});
  const foreignUnit=await db.orgUnit.findFirstOrThrow({where:{organizationId:b.org.id}});
  const memo=await db.administrativeRecord.findFirstOrThrow({where:{organizationId:a.org.id,type:'INTERNAL_MEMO'}});
  const ids=[];let recordId,unit;
  const request=async(token,path,method='GET',body)=>{
    const r=await fetch(base+'/center/me'+path,{method,headers:{...(token?{authorization:'Bearer '+token}:{}),...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
    return{status:r.status,body:await r.json()};
  };
  const view=async token=>(await request(token,'/documents')).body.licenses.find(x=>x.id===recordId);
  try{
    let r=await request(ta,'/licenses','POST',{type:'LICENSE',unitId:source.unitId,referenceNumber:'REVIEW-'+randomUUID(),subject:'اختبار المراجعة الداخلية'});
    check(r.status===201,'Review fixture is created through center API');recordId=r.body.id;ids.push(recordId);
    const register='/licenses/'+recordId+'/register';
    check((await request(ta,register,'PATCH',{})).status===409,'Registration requires linked license attachment and dates');
    check((await request(tb,register,'PATCH',{})).status===404,'Foreign manager cannot register license');
    check((await request(ts,register,'PATCH',{})).status===403,'Ordinary staff cannot register');
    check((await request(undefined,register,'PATCH',{})).status===401,'Guest cannot register');
    check((await request(ta,'/licenses/'+memo.id+'/register','PATCH',{})).status===404,'Non-regulatory record cannot enter center license workflow');
    unit=await db.orgUnit.create({data:{organizationId:a.org.id,type:'DEPARTMENT',code:'REVIEW-'+randomUUID(),nameAr:'مراجعة الرخص'}});
    const route='/licenses/'+recordId+'/reviews';
    check((await request(ta,route,'POST',{toUnitId:unit.id})).status===409,'Draft cannot bypass registration');
    r=await request(ta,'/licenses/'+recordId+'/attachment','PATCH',{mimeType:file.mimeType,base64:Buffer.from(file.content).toString('base64'),issuedAt:'2025-01-01',expiresAt:'2030-01-01'});check(r.status===200,'Draft attachment is uploaded');
    check((await request(ta,register,'PATCH',{})).status===200,'Attached draft can register through center wrapper');
    check((await request(ta,register,'PATCH',{})).status===409,'Registration is not repeated');
    check((await request(ta,route,'POST',{toUnitId:source.unitId})).status===400,'Review must use a distinct unit');
    check((await request(ta,route,'POST',{toUnitId:foreignUnit.id})).status===404,'Foreign review unit rejected');
    await db.orgUnit.update({where:{id:unit.id},data:{active:false}});
    check((await request(ta,route,'POST',{toUnitId:unit.id})).status===404,'Inactive review unit rejected');
    await db.orgUnit.update({where:{id:unit.id},data:{active:true}});
    r=await request(ta,route,'POST',{toUnitId:unit.id});check(r.status===201,'Registered license is routed');const routingId=r.body.id;ids.push(routingId);
    const assign='/license-reviews/'+routingId+'/assign',decide='/license-reviews/'+routingId+'/decision';
    let row=await view(ta);check(row.reviewUnits.some(x=>x.id===unit.id)&&!row.reviewUnits.some(x=>x.id===source.unitId),'Review destination choices exclude source unit');
    check(!row.routings[0].reviewerOptions.some(x=>x.id===ownerA.id)&&!row.routings[0].canDecide,'Requester is never offered as own reviewer');
    check((await request(tb,assign,'PATCH',{assigneeAccountId:staff.id})).status===404,'Foreign manager cannot assign review');
    check((await request(tb,decide,'PATCH',{decision:'APPROVE'})).status===404,'Foreign manager cannot decide review');
    check((await request(ta,assign,'PATCH',{assigneeAccountId:ownerA.id})).status===403,'Requester self-assignment rejected');
    check((await request(ta,assign,'PATCH',{assigneeAccountId:staff.id})).status===403,'Ordinary staff excluded from center portal reviewer choices');
    await db.organizationMember.update({where:{organizationId_accountId:{organizationId:a.org.id,accountId:staff.id}},data:{role:'ADMIN'}});
    await db.roleAssignment.update({where:{accountId_role:{accountId:staff.id,role:'DIVE_CENTER'}},data:{status:'SUSPENDED'}});
    check((await request(ta,assign,'PATCH',{assigneeAccountId:staff.id})).status===403,'Suspended center role cannot be assigned');
    await db.roleAssignment.update({where:{accountId_role:{accountId:staff.id,role:'DIVE_CENTER'}},data:{status:'ACTIVE'}});
    row=await view(ta);check(row.routings[0].reviewerOptions.some(x=>x.id===staff.id),'Independent active manager appears as reviewer');
    check((await request(ta,assign,'PATCH',{assigneeAccountId:staff.id})).status===200,'Independent reviewer assigned through center wrapper');
    check((await request(ta,decide,'PATCH',{decision:'APPROVE'})).status===403,'Requester cannot record assigned reviewer decision');
    row=await view(ts);check(row.routings[0].canDecide&&!!row.routings[0].reviewerName,'Assigned reviewer sees decision control and display name');
    check(!('requestedByAccountId' in row.routings[0])&&!('assignedToAccountId' in row.routings[0]),'Review metadata omits raw requester/assignee fields');
    check((await request(ts,decide,'PATCH',{decision:'INVALID'})).status===400,'Invalid decision rejected');
    check((await request(ts,decide,'PATCH',{decision:'APPROVE'})).status===200,'Assigned independent reviewer can approve');
    check((await request(ts,decide,'PATCH',{decision:'REJECT'})).status===409,'Final decision cannot be overwritten');
    check((await request(ta,assign,'PATCH',{assigneeAccountId:staff.id})).status===409,'Decided review cannot be reassigned');
    row=await view(ts);check(!row.routings[0].canDecide&&row.routings[0].reviewerOptions.length===0,'Final review exposes no decision or assignment controls');
    r=await request(ta,route,'POST',{toUnitId:unit.id});check(r.status===201,'Additional internal review has its own routing record');const second=r.body.id;ids.push(second);
    check((await request(ta,'/license-reviews/'+second+'/assign','PATCH',{assigneeAccountId:staff.id})).status===200,'Second review independently assigned');
    check((await request(ts,'/license-reviews/'+second+'/decision','PATCH',{decision:'REJECT'})).status===200,'Reviewer can reject through the same guarded workflow');
    row=await view(ta);check(row.routings.length===2&&row.routings[0].decision==='REJECT'&&row.routings[1].decision==='APPROVE','Both decisions remain visible, latest first');
    const historicalReviewer=row.routings[0].reviewerName;
    await db.roleAssignment.update({where:{accountId_role:{accountId:staff.id,role:'DIVE_CENTER'}},data:{status:'SUSPENDED'}});
    row=await view(ta);check(!!historicalReviewer&&row.routings.every(x=>x.reviewerName===historicalReviewer),'Historical reviewer names survive later role revocation');
    const audits=await db.auditEvent.findMany({where:{resourceId:{in:ids}}});
    check(audits.some(x=>x.action==='ADMIN_ROUTING_APPROVE'&&x.actorId===staff.personId)&&audits.some(x=>x.action==='ADMIN_ROUTING_REJECT'&&x.actorId===staff.personId),'Decisions retain canonical reviewer audit events');
  }finally{
    await db.roleAssignment.update({where:{accountId_role:{accountId:staff.id,role:'DIVE_CENTER'}},data:{status:'ACTIVE'}});
    await db.organizationMember.update({where:{organizationId_accountId:{organizationId:a.org.id,accountId:staff.id}},data:{role:'STAFF'}});
    await db.auditEvent.deleteMany({where:{resourceId:{in:ids}}});
    if(recordId){await db.administrativeRouting.deleteMany({where:{recordId}});await db.administrativeRecord.delete({where:{id:recordId}});}
    if(unit)await db.orgUnit.delete({where:{id:unit.id}});
  }
}
