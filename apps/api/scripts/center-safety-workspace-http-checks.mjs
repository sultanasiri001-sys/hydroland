import {randomUUID} from 'node:crypto';

// Parent harness enforces CI, a loopback API and a disposable PostgreSQL database.
export async function checkCenterSafetyWorkspace(db,{base,a,b,ownerA,ownerB,ta,tb,ts,personAccount,tokenFor},check){
 const tripIds=[],tag='SafetyWorkspace-'+randomUUID();
 const call=async(token,path='',method='GET',body)=>{const response=await fetch(base+'/center/me/safety'+path,{method,headers:{...(token?{authorization:'Bearer '+token}:{}),'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,body:await response.json().catch(()=>null)}};
 const trip=await db.trip.create({data:{organizationId:a.org.id,title:tag,type:'BOAT',status:'OPEN',capacity:4,startsAt:new Date(Date.now()+86400000),endsAt:new Date(Date.now()+90000000)}});tripIds.push(trip.id);
 const items={diver_credentials:true,equipment_ready:true,oxygen_first_aid:true,boat_fuel:true,weather_review:true,emergency_plan:true};
 const preview=async(id=trip.id)=>{const result=await call(ta,'/trips/'+id);check(result.status===200,'Safety preview succeeds: '+JSON.stringify(result));return result.body};
 const checklist=p=>({requestId:randomUUID(),expectedState:p.stateToken,items,notes:'ملاحظات فحص المركز'});
 const incident=p=>({requestId:randomUUID(),expectedState:p.incidentStateToken,severity:'HIGH',title:'بلاغ '+tag,description:'PRIVATE_OWN_NARRATIVE',locationName:'موقع المركز'});
 const submit=(kind,body,token=ta,id=trip.id)=>call(token,'/trips/'+id+'/'+kind,'POST',body);
 try{
  const reviewer=await personAccount('safety-reviewer');await db.roleAssignment.create({data:{accountId:reviewer.id,role:'REVIEWER',status:'ACTIVE'}});const tr=await tokenFor(reviewer.id);
  const admin=await personAccount('safety-admin');await db.roleAssignment.create({data:{accountId:admin.id,role:'ADMIN',status:'ACTIVE'}});const tad=await tokenFor(admin.id);
  let p=await preview(),c=checklist(p),i=incident(p);
  check(p.canAssess&&p.checklistItems.length===6,'Future center trip exposes complete checklist');
  for(const [token,want] of [[null,401],[tb,404],[ts,403]]){
   check((await call(token,'/trips/'+trip.id)).status===want,'Safety preview authorization');
   check((await submit('checklists',c,token)).status===want,'Checklist creation authorization');
   check((await submit('incidents',i,token)).status===want,'Incident creation authorization');
  }
  for(const status of ['DRAFT','PENDING_REVIEW','REJECTED','SUSPENDED','ARCHIVED']){
   await db.roleAssignment.update({where:{accountId_role:{accountId:ownerA.id,role:'DIVE_CENTER'}},data:{status}});
   for(const result of [await call(ta),await call(ta,'/trips'),await call(ta,'/trips/'+trip.id),await submit('checklists',c),await submit('incidents',i)])check(result.status===403,'Exact active role for safety '+status);
  }
  await db.roleAssignment.update({where:{accountId_role:{accountId:ownerA.id,role:'DIVE_CENTER'}},data:{status:'ACTIVE'}});
  await db.organizationMember.update({where:{id:a.member.id},data:{status:'SUSPENDED'}});check((await submit('checklists',c)).status===403,'Membership revocation blocks assessment');await db.organizationMember.update({where:{id:a.member.id},data:{status:'ACTIVE'}});
  await db.organization.update({where:{id:a.org.id},data:{status:'SUSPENDED'}});check((await submit('incidents',i)).status===403,'Suspended center blocks report');await db.organization.update({where:{id:a.org.id},data:{status:'ACTIVE'}});
  for(const extra of [{decision:'ALLOWED'},{reviewedByAccountId:reviewer.id},{organizationId:b.org.id},{notes:[]},{requestId:'invalid'},{expectedState:'old'},{items:{weather_review:true}},{items:{...items,weather_review:'true'}},{items:{...items,unknown:true}},{items:null}])check((await submit('checklists',{...c,...extra})).status===400,'Reject forged or incomplete checklist '+Object.keys(extra)[0]);
  for(const extra of [{status:'CLOSED'},{resolvedByAccountId:admin.id},{reportedByAccountId:ownerB.id},{severity:'WRONG'},{title:'x'},{description:[]},{locationName:{}},{description:'x'.repeat(5001)}])check((await submit('incidents',{...i,...extra})).status===400,'Reject forged incident field '+Object.keys(extra)[0]);
  for(const query of ['pageSize=51','checklistPage=0','incidentPage=1.5','status=WRONG','decision=GO','severity=UNKNOWN','q[]=x','q='+('x'.repeat(121)),'organizationId='+b.org.id])check((await call(ta,'?'+query)).status===400,'Reject invalid safety filter '+query.slice(0,25));
  check((await call(ta,'/trips?page=0')).status===400&&(await call(ta,'/trips?pageSize=51')).status===400,'Trip picker bounds pages');
  check((await call(ta,'/trips?q='+tag)).body.total===1&&(await call(tb,'/trips?q='+tag)).body.total===0,'Trip picker searches only own center');

  if(!/^[a-f0-9-]{36}$/.test(trip.id))throw new Error('Invalid isolated trip ID');
  await db.$executeRawUnsafe(`ALTER TABLE "Notification" ADD CONSTRAINT safety_workspace_notice_failure CHECK (("payload"->>'tripId') IS DISTINCT FROM '${trip.id}') NOT VALID`);
  try{
   check((await submit('checklists',c)).status===500,'Reviewer notice failure aborts checklist');
   check(await db.safetyChecklist.count({where:{tripId:trip.id}})===0,'Failed notification rolls back checklist');
   check(await db.auditEvent.count({where:{metadata:{path:['requestId'],equals:c.requestId}}})===0,'Failed notification rolls back checklist audit');
  }finally{await db.$executeRawUnsafe('ALTER TABLE "Notification" DROP CONSTRAINT safety_workspace_notice_failure');}
  const results=await Promise.all([submit('checklists',c),submit('checklists',c)]);
  check(results.every(r=>r.status===201)&&results[0].body.id===results[1].body.id,'Concurrent assessment retries return one record: '+JSON.stringify(results));
  const id=results[0].body.id;
  check(results[0].body.decision==='REVIEW_REQUIRED'&&(await db.safetyChecklist.findUnique({where:{id}})).decidedAt===null,'Passing assessment awaits reviewer and has no approval time');
  check((await submit('checklists',c)).body.alreadyApplied===true,'Lost response retries saved assessment');
  check((await submit('checklists',{...c,notes:'changed meaning'})).status===409,'Saved request ID cannot change meaning');
  check(await db.safetyChecklist.count({where:{tripId:trip.id}})===1,'Assessment created once');
  check(await db.auditEvent.count({where:{resource:'SafetyChecklist',resourceId:id,action:'SAFETY_ASSESSMENT_CREATED'}})===1,'Assessment audit once');
  check(await db.notification.count({where:{accountId:reviewer.id,type:'SAFETY_CHECKLIST_SUBMITTED',payload:{path:['resourceId'],equals:id}}})===1,'Reviewer in-app notice once');
  const audit=await db.auditEvent.findFirst({where:{resource:'SafetyChecklist',resourceId:id,action:'SAFETY_ASSESSMENT_CREATED'}});check(audit.actorId===ownerA.personId&&audit.metadata.source==='center','Assessment audit resolves real actor');
  let detail=await call(ta,'/checklists/'+id);check(detail.status===200&&detail.body.items.equipment_ready===true&&detail.body.checklistItems.length===6,'Persisted checklist detail');
  for(const [token,want] of [[null,401],[tb,404],[ts,403]])check((await call(token,'/checklists/'+id)).status===want,'Checklist detail scope');
  const decide=async(token,decision,checklistId=id)=>{const r=await fetch(base+'/trips/'+trip.id+'/safety/checklists/'+checklistId+'/decision',{method:'PATCH',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({decision,notes:'مراجعة تشغيلية موثقة'})});return {status:r.status,body:await r.json()}};
  check((await decide(ta,'ALLOWED')).status===403,'Center cannot grant safety approval');
  p=await preview();c=checklist(p);check((await decide(tr,'ALLOWED')).status===200,'Existing authorized reviewer can decide submitted assessment');
  check((await submit('checklists',c)).status===409,'Changed reviewer decision invalidates stale form');
  detail=await call(ta,'/checklists/'+id);check(detail.body.decision==='ALLOWED'&&detail.body.decidedAt,'Center sees authoritative approval outcome');
  p=await preview();c={...checklist(p),items:{...items,weather_review:false}};const failed=await submit('checklists',c);check(failed.status===201&&failed.body.decision==='DEFERRED','Any false item defers the new assessment');check((await decide(tr,'ALLOWED',failed.body.id)).status===409,'Reviewer cannot approve failed checklist');

  p=await preview();i=incident(p);const reports=await Promise.all([submit('incidents',i),submit('incidents',i)]);check(reports.every(r=>r.status===201)&&reports[0].body.id===reports[1].body.id,'Concurrent incident retries create one record');
  const incidentId=reports[0].body.id;check(reports[0].body.status==='OPEN'&&reports[0].body.externalDistressSent===false,'Report is open with truthful internal-only boundary');
  check((await submit('incidents',i)).body.alreadyApplied===true,'Incident lost response replay');
  check(await db.notification.count({where:{accountId:admin.id,type:'SAFETY_INCIDENT_REPORTED',payload:{path:['resourceId'],equals:incidentId}}})===1,'Incident admin notice once');
  let report=await call(ta,'/incidents/'+incidentId);check(report.body.description==='PRIVATE_OWN_NARRATIVE'&&report.body.descriptionVisible,'Reporter sees own description');
  for(const [token,want] of [[null,401],[tb,404],[ts,403]])check((await call(token,'/incidents/'+incidentId)).status===want,'Incident detail scope');
  const otherReport=await db.safetyIncident.create({data:{tripId:trip.id,reportedByAccountId:ownerB.id,severity:'LOW',title:'Other reporter '+tag,description:'PRIVATE_OTHER_NARRATIVE',resolutionNotes:'PRIVATE_REVIEWER_NOTES'}});
  report=await call(ta,'/incidents/'+otherReport.id);check(report.status===200&&!report.body.descriptionVisible&&report.body.description===null&&!JSON.stringify(report.body).includes('PRIVATE_'),'Manager cannot read another reporter narrative or reviewer private notes');
  check(!('reportedByAccountId' in report.body)&&!('resolvedByAccountId' in report.body),'Incident detail omits private identities');
  let list=await call(ta,'?q='+tag+'&pageSize=1');check(list.body.checklistPagination.total===2&&list.body.incidentPagination.total===2,'Counts include complete history before pagination');check(list.body.checklists.length===1&&list.body.incidents.length===1,'Independent lists honor page size');check(!JSON.stringify(list.body).includes('PRIVATE_'),'List never exposes incident narratives');
  list=await call(ta,'?q='+tag+'&pageSize=1&checklistPage=999&incidentPage=2');check(list.body.checklistPagination.page===2&&list.body.incidentPagination.page===2,'Separate pagination clamps stale pages');
  list=await call(ta,'?q='+tag+'&decision=DEFERRED&severity=HIGH&status=OPEN');check(list.body.checklistPagination.total===1&&list.body.checklists[0].id===failed.body.id&&list.body.incidentPagination.total===1&&list.body.incidents[0].id===incidentId,'Safety filters match persisted states');
  check((await call(ta,'?q=%25')).body.checklistPagination.total===0,'Search escapes wildcards');
  const closeReport=async(token)=>fetch(base+'/safety/incidents/admin/'+incidentId+'/status',{method:'PATCH',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({status:'RESOLVED',resolutionNotes:'تمت المعالجة من المختص'})});
  check((await closeReport(ta)).status===403,'Center cannot close its own incident');check((await closeReport(tad)).status===200,'Authorized admin can resolve report');report=await call(ta,'/incidents/'+incidentId);check(report.body.status==='RESOLVED'&&report.body.resolvedAt,'Center sees resolution outcome without private review notes');
  p=await preview();const outdated=await submit('checklists',checklist(p));check(outdated.status===201,'Fresh assessment can be submitted before trip edit');
  await db.trip.update({where:{id:trip.id},data:{capacity:5}});check((await decide(tr,'ALLOWED',outdated.body.id)).status===409,'Reviewer cannot approve evidence collected before a trip change');
  p=await preview();const latest=await submit('checklists',checklist(p));check(latest.status===201,'Updated trip supports a new assessment');
  check((await decide(tr,'ALLOWED',id)).status===409,'Reviewer cannot re-approve a superseded assessment');
  const wrongPath=await fetch(base+'/trips/'+b.trip.id+'/safety/checklists/'+latest.body.id+'/decision',{method:'PATCH',headers:{authorization:'Bearer '+tr,'content-type':'application/json'},body:JSON.stringify({decision:'ALLOWED'})});check(wrongPath.status===404,'Review URL trip must match checklist');
  check((await decide(tr,'ALLOWED',latest.body.id)).status===200,'Reviewer can approve latest unchanged assessment');
  p=await preview();c=checklist(p);await db.trip.update({where:{id:trip.id},data:{status:'COMPLETED'}});check((await submit('checklists',c)).status===409,'Trip closure invalidates outstanding assessment');p=await preview();check(!p.canAssess,'Closed trip cannot be assessed');check((await submit('checklists',checklist(p))).status===409,'Fresh preview cannot override closed trip');
  check((await submit('incidents',incident(p))).status===201,'Post-trip incident reporting remains available');
  await db.trip.update({where:{id:trip.id},data:{status:'OPEN',startsAt:new Date(Date.now()-60000)}});p=await preview();check(!p.canAssess&&(await submit('checklists',checklist(p))).status===409,'Started trip cannot receive a backdated pre-trip assessment');
  await db.organizationMember.update({where:{id:a.member.id},data:{status:'SUSPENDED'}});check((await submit('incidents',i)).status===403,'Revocation also blocks replay');
  for(const path of ['/checklists/'+id,'/incidents/'+incidentId])check((await call(ta,path)).status===403,'Revoked manager cannot read saved records');
 }finally{
  await db.organizationMember.update({where:{id:a.member.id},data:{status:'ACTIVE'}});await db.organization.update({where:{id:a.org.id},data:{status:'ACTIVE'}});await db.roleAssignment.update({where:{accountId_role:{accountId:ownerA.id,role:'DIVE_CENTER'}},data:{status:'ACTIVE'}});
  await db.safetyIncident.deleteMany({where:{tripId:{in:tripIds}}});await db.safetyChecklist.deleteMany({where:{tripId:{in:tripIds}}});await db.trip.deleteMany({where:{id:{in:tripIds}}});
 }
}
