import {randomUUID} from 'node:crypto';
export async function checkCenterLicenseCreation(db,{base,a,b,ownerA,ta,tb,ts},check){
  const unit=await db.orgUnit.findFirstOrThrow({where:{organizationId:a.org.id,active:true}});
  const otherUnit=await db.orgUnit.findFirstOrThrow({where:{organizationId:b.org.id,active:true}});
  const source=await db.administrativeRecord.findFirstOrThrow({where:{organizationId:a.org.id,type:'LICENSE',status:'REGISTERED'}});
  const foreign=await db.administrativeRecord.findFirstOrThrow({where:{organizationId:b.org.id,type:'LICENSE'}});
  const created=[];
  const body={type:'LICENSE',unitId:unit.id,referenceNumber:'NEW-'+randomUUID(),subject:'رخصة جديدة'};
  const post=async(token,payload=body,path='/center/me/licenses')=>{
    const r=await fetch(base+path,{method:'POST',headers:{...(token?{authorization:'Bearer '+token}:{}),'content-type':'application/json'},body:JSON.stringify(payload)});
    const data=await r.json();if(r.status===201)created.push(data.id);return{status:r.status,body:data};
  };
  try{
    const list=await fetch(base+'/center/me/documents',{headers:{authorization:'Bearer '+ta}});const view=await list.json();
    check(view.units.some(x=>x.id===unit.id)&&!view.units.some(x=>x.id===otherUnit.id),'Creation unit choices stay within center');
    check(view.units.every(x=>!('organizationId' in x)),'Creation choices expose only needed unit metadata');
    check((await post(undefined)).status===401,'Guest cannot create license record');
    check((await post(ts)).status===403,'Ordinary staff cannot create license record');
    check((await post(tb)).status===404,'Other center cannot use source center unit');
    check((await post(ta,{...body,unitId:otherUnit.id})).status===404,'Cannot select foreign unit');
    for(const invalid of [{type:'INTERNAL_MEMO'},{unitId:null},{referenceNumber:' '},{referenceNumber:'x'.repeat(121)},{subject:' '},{subject:123},{subject:'x'.repeat(241)}])check((await post(ta,{...body,...invalid})).status===400,'Reject invalid creation field '+Object.keys(invalid)[0]);
    await db.orgUnit.update({where:{id:unit.id},data:{active:false}});
    check((await post(ta)).status===404,'Inactive unit cannot receive new license');
    await db.orgUnit.update({where:{id:unit.id},data:{active:true}});
    let r=await post(ta,{...body,organizationId:b.org.id,ownerAccountId:'spoofed',status:'REGISTERED',licenseAssetId:'spoofed'});
    check(r.status===201&&r.body.status==='DRAFT','Manager creates draft, never pre-approved record');
    const fresh=await db.administrativeRecord.findUniqueOrThrow({where:{id:r.body.id}});
    check(fresh.organizationId===a.org.id&&fresh.ownerAccountId===ownerA.id&&fresh.licenseAssetId===null,'Server owns organization/owner and ignores attachment/status spoofing');
    check((await post(ta)).status===409,'Duplicate center reference rejected');
    const audit=await db.auditEvent.findFirst({where:{resourceId:fresh.id,action:'CENTER_LICENSE_CREATED'}});
    check(audit?.actorId===ownerA.personId&&audit.metadata.organizationId===a.org.id,'Creation audit binds actor and center');
    const renewBody={referenceNumber:'RENEW-'+randomUUID(),subject:'تجديد الرخصة'};
    const renew='/center/me/licenses/'+source.id+'/renew';
    check((await post(undefined,renewBody,renew)).status===401,'Guest cannot renew');
    check((await post(ts,renewBody,renew)).status===403,'Ordinary staff cannot renew');
    check((await post(tb,renewBody,renew)).status===404,'Other center cannot renew source record');
    check((await post(ta,renewBody,'/center/me/licenses/'+foreign.id+'/renew')).status===404,'Cannot renew foreign license');
    check((await post(ta,renewBody,'/center/me/licenses/'+fresh.id+'/renew')).status===409,'Existing draft cannot be renewed');
    check((await post(ta,{...renewBody,referenceNumber:source.referenceNumber},renew)).status===409,'Renewal needs a new reference');
    r=await post(ta,{...renewBody,unitId:otherUnit.id,type:'INTERNAL_MEMO'},renew);
    check(r.status===201&&r.body.id!==source.id&&r.body.status==='DRAFT','Renewal creates separate draft');
    const renewed=await db.administrativeRecord.findUniqueOrThrow({where:{id:r.body.id}});
    check(renewed.unitId===source.unitId&&renewed.type===source.type&&renewed.licenseAssetId===null&&renewed.licenseIssuedAt===null&&renewed.licenseExpiresAt===null,'Renewal inherits scope/type, not stale attachment or dates');
    const after=await db.administrativeRecord.findUniqueOrThrow({where:{id:source.id}});
    check(JSON.stringify(after)===JSON.stringify(source),'Renewal leaves old record and attachment unchanged');
    const renewalAudit=await db.auditEvent.findFirst({where:{resourceId:renewed.id,action:'CENTER_LICENSE_RENEWAL_CREATED'}});
    check(renewalAudit?.metadata.renewalOfRecordId===source.id&&renewalAudit.metadata.previousReferenceNumber===source.referenceNumber,'Audit records renewal provenance');
    check(await db.administrativeRouting.count({where:{recordId:renewed.id}})===0,'Renewal cannot inherit previous approval');
    const concurrent={...body,referenceNumber:'CONCURRENT-'+randomUUID()};
    const results=await Promise.all([post(ta,concurrent),post(ta,concurrent)]);
    check(results.filter(x=>x.status===201).length===1&&results.filter(x=>x.status===409).length===1,'Concurrent duplicate submissions create one record');
    check(await db.administrativeRecord.count({where:{organizationId:a.org.id,referenceNumber:concurrent.referenceNumber}})===1,'Exactly one concurrent record persists');
  }finally{
    await db.orgUnit.update({where:{id:unit.id},data:{active:true}});
    await db.auditEvent.deleteMany({where:{resourceId:{in:created},action:{in:['CENTER_LICENSE_CREATED','CENTER_LICENSE_RENEWAL_CREATED']}}});
    await db.administrativeRecord.deleteMany({where:{id:{in:created}}});
  }
}
