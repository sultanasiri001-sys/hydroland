import assert from 'node:assert/strict';
import { randomBytes, randomUUID, scryptSync } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const base=process.env.PRIVACY_GRIEVANCE_E2E_BASE_URL;
assert.equal(process.env.CI,'true');
for(const uri of [base,process.env.DATABASE_URL]) assert(['localhost','127.0.0.1','[::1]'].includes(new URL(uri).hostname));
const db=new PrismaClient();
const route='/privacy/grievances';
const setting='PLATFORM_STAFFING_ORGANIZATION:v1';
async function call(actor,path,method='GET',body) {
  const res=await fetch(base+path,{method,headers:{...(actor?{authorization:'Bearer '+actor.token}:{}),'content-type':'application/json'},body:body?JSON.stringify(body):undefined});
  return {status:res.status,data:await res.json()};
}
async function user(role) {
  const password=randomBytes(16).toString('hex'), salt=randomBytes(16).toString('hex');
  const row=await db.account.create({data:{person:{create:{firstName:'Fixture',lastName:role}},status:'ACTIVE',emailVerifiedAt:new Date(),email:randomUUID()+'@example.invalid',passwordHash:salt+':'+scryptSync(password,salt,64).toString('hex'),roleAssignments:{create:{role,status:'ACTIVE'}}}});
  const login=await call(null,'/auth/login','POST',{email:row.email,password});assert.equal(login.status,200);
  return {id:row.id,token:login.data.accessToken};
}
async function check() {
  // This suite owns an empty disposable database (a dedicated CI service).
  assert.equal(await db.account.count(),0);
  assert.equal(await db.operationalSetting.count({where:{key:setting}}),0);
  const member=await user('DIVER'), owner=await user('DIVE_CENTER'), outside=await user('DIVE_CENTER'), staff=await user('STAFF'), executive=await user('ADMIN');
  const organization=(ownerId,kind,displayName)=>db.organization.create({data:{ownerId,kind,displayName,status:'ACTIVE'}});
  const center=await organization(owner.id,'DIVE_CENTER','Fixture Center'), foreign=await organization(outside.id,'DIVE_CENTER','Other Center');
  const platform=await organization(executive.id,'HYDROLAND_INTERNAL_PLATFORM','Platform');
  await db.operationalSetting.create({data:{key:setting,value:{organizationId:platform.id}}});
  await db.organizationMember.create({data:{organizationId:platform.id,accountId:staff.id,role:'STAFF',status:'ACTIVE'}});
  const unit=await db.orgUnit.create({data:{organizationId:platform.id,type:'DEPARTMENT',code:'FINANCE',nameAr:'المالية'}});
  await db.employment.create({data:{accountId:staff.id,organizationId:platform.id,orgUnitId:unit.id,status:'ACTIVE',workerClass:'EMPLOYEE'}});
  const trip=await db.trip.create({data:{organizationId:center.id,title:'Synthetic trip',type:'DIVE',startsAt:new Date(),endsAt:new Date(Date.now()+3600000),capacity:4}});
  const booking=await db.booking.create({data:{tripId:trip.id,accountId:member.id,status:'CONFIRMED'}});
  const inbox=actor=>call(actor,route).then(x=>{assert.equal(x.status,200);return x.data;});
  const request={centerId:center.id,topic:'payments',description:'Synthetic payment data correction',requestKey:randomUUID()};
  const submit=body=>call(member,route,'POST',body);
  const act=(actor,id,action,message,report,disposition)=>call(actor,route+'/'+id+'/actions','POST',{action,message,...(report?{report}:{}),...(disposition?{disposition}:{})});
  const notices=(actor,id)=>call(actor,'/notifications').then(x=>{assert.equal(x.status,200);return x.data.filter(n=>n.payload.caseId===id);});
  assert.equal((await call(null,route)).status,401);
  assert.deepEqual((await inbox(member)).centers.map(c=>c.id),[center.id]);
  assert.equal((await submit({...request,centerId:foreign.id})).status,403);
  const [first,retry]=await Promise.all([submit(request),submit(request)]);
  assert.equal(first.status,201);assert.equal(retry.status,201);assert.equal(first.data.id,retry.data.id);
  const id=first.data.id;
  assert.equal((await submit({...request,description:'Different content'})).status,409);
  const row=await db.privacyGrievance.findUniqueOrThrow({where:{id}});
  assert.equal(row.dueAt-row.createdAt,7*24*60*60*1000);
  assert.equal((await notices(owner,id)).filter(n=>n.type==='PRIVACY_GRIEVANCE_RECEIVED').length,1);
  assert.equal((await inbox(outside)).items.length,0);assert.equal((await inbox(staff)).items.length,0);
  assert.equal((await act(outside,id,'CENTER_RESOLVE','No access')).status,404);
  assert.equal((await act(staff,id,'DEPARTMENT_RESOLVE','Too early','Private report')).status,404);
  const handled=await submit({...request,requestKey:randomUUID()});assert.equal(handled.status,201);
  assert.equal((await act(owner,handled.data.id,'CENTER_HANDLE','Checked the source record')).status,201);
  const wrongTopic=await submit({...request,topic:'bookings',requestKey:randomUUID()});assert.equal(wrongTopic.status,201);
  const past=new Date(Date.now()-1000);
  await db.privacyGrievance.updateMany({where:{id:{in:[id,handled.data.id,wrongTopic.data.id]}},data:{dueAt:past}});
  assert.equal((await act(owner,id,'CENTER_HANDLE','Late response')).status,409);
  assert.equal((await act(owner,handled.data.id,'CENTER_RESOLVE','Corrected at center')).status,201);
  // Poll the running application's scheduler; the client cannot set a deadline or clock.
  const limit=Date.now()+90000;
  while(Date.now()<limit && !(await inbox(staff)).items.some(x=>x.id===id)) await new Promise(r=>setTimeout(r,1000));
  const items=(await inbox(staff)).items;
  assert(items.some(x=>x.id===id && x.state==='DEPARTMENT_PENDING' && x.canDepartment));
  assert(!items.some(x=>x.id===wrongTopic.data.id));
  assert.equal((await act(staff,wrongTopic.data.id,'DEPARTMENT_RESOLVE','Wrong department','Internal')).status,404);
  assert.equal(await db.auditEvent.count({where:{resourceId:handled.data.id,action:'privacy_grievance.escalated'}}),0);
  assert.equal((await act(staff,id,'DEPARTMENT_RESOLVE','Missing report')).status,400);
  const report='Executive only fixture', message='Corrected the payment record';
  const action=()=>act(staff,id,'DEPARTMENT_RESOLVE',message,report);
  // Failure at the last delivery must roll back the executive report, closure and member notice.
  await db.$executeRawUnsafe(`CREATE FUNCTION fail_grievance_delivery() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.type = 'PRIVACY_GRIEVANCE_CENTER_RESULT' THEN RAISE EXCEPTION 'Fixture delivery failure'; END IF; RETURN NEW; END $$`);
  await db.$executeRawUnsafe('CREATE TRIGGER fail_grievance_delivery BEFORE INSERT ON "Notification" FOR EACH ROW EXECUTE FUNCTION fail_grievance_delivery()');
  assert.equal((await action()).status,500);
  assert.equal((await notices(executive,id)).length,0);assert.equal((await notices(member,id)).length,0);
  assert.equal((await db.privacyGrievance.findUniqueOrThrow({where:{id}})).state,'DEPARTMENT_PENDING');
  await db.$executeRawUnsafe('DROP TRIGGER fail_grievance_delivery ON "Notification"');
  const concurrent=await Promise.all([action(),action()]);assert.deepEqual(concurrent.map(x=>x.status).sort(),[201,409]);
  assert.deepEqual((await notices(executive,id)).map(n=>n.payload.message),[report]);
  assert.deepEqual((await notices(member,id)).map(n=>n.payload.message),[message]);
  assert.deepEqual((await notices(owner,id)).filter(n=>n.type==='PRIVACY_GRIEVANCE_CENTER_RESULT').map(n=>n.payload.message),[message]);
  assert.equal((await notices(outside,id)).length,0);
  assert(!JSON.stringify(await inbox(member)).includes(report));
  assert.equal(await db.auditEvent.count({where:{resourceId:id,action:'privacy_grievance.escalated'}}),1);
  const rights='/me/data-requests';
  const input={kind:'ERASURE',domain:'PAYMENTS',details:'Review synthetic payment',centerId:center.id,requestKey:randomUUID()};
  assert.deepEqual((await call(member,rights+'/centers')).data.map(c=>c.id),[center.id]);
  assert.equal((await call(member,rights,'POST',{...input,centerId:foreign.id})).status,403);
  const [receipt,again]=await Promise.all([call(member,rights,'POST',input),call(member,rights,'POST',input)]);
  assert.equal(receipt.status,201);assert.equal(again.data.id,receipt.data.id);assert.equal(receipt.data.routingCenterId,center.id);
  const linked=await db.privacyGrievance.findUniqueOrThrow({where:{personalDataRequestId:receipt.data.id}});
  assert.equal((await notices(owner,linked.id)).length,1);
  assert.equal((await act(owner,linked.id,'CENTER_RESOLVE','Unsupported completion',null,'APPLIED')).status,409);
  assert.equal((await act(owner,linked.id,'CENTER_RESOLVE','First decision',null,'DEFERRED')).status,201);
  const appeal=(actor,reason)=>call(actor,route+'/'+linked.id+'/appeal','POST',{reason});
  assert.equal((await appeal(outside,'Other person')).status,404);
  assert.equal((await appeal(member,'Review the decision')).status,201);
  assert.equal((await appeal(member,'Review the decision')).status,201);
  assert.equal((await appeal(member,'Different appeal')).status,409);
  await db.roleAssignment.create({data:{accountId:owner.id,role:'STAFF',status:'ACTIVE'}});
  await db.organizationMember.create({data:{organizationId:platform.id,accountId:owner.id,role:'STAFF',status:'ACTIVE'}});
  await db.employment.create({data:{accountId:owner.id,organizationId:platform.id,orgUnitId:unit.id,status:'ACTIVE',workerClass:'EMPLOYEE'}});
  assert.equal((await act(owner,linked.id,'DEPARTMENT_RESOLVE','Same reviewer','Report')).status,403);
  assert.equal((await act(staff,linked.id,'DEPARTMENT_RESOLVE','Independent decision','Private appeal report','REFUSED')).status,201);
  assert.equal((await call(member,rights)).data.items.find(i=>i.id===receipt.data.id).status,'APPEAL_DECIDED');
  assert.equal((await inbox(member)).items.find(i=>i.id===linked.id).firstOutcome,'First decision');
  assert.equal((await notices(executive,linked.id)).filter(n=>n.payload.message==='Private appeal report').length,1);
  const decisionReview = async (caseId, action) => {
    const event = await db.auditEvent.findFirstOrThrow({where:{resource:'PrivacyGrievance',resourceId:caseId,action:'privacy_grievance.'+action}});
    return event.metadata.retentionReview;
  };
  assert.equal((await decisionReview(linked.id,'center_resolve')).status,'INDIVIDUAL_REFERENCE_REQUIRED');

  const payment=await db.payment.create({data:{accountId:member.id,bookingId:booking.id,amountMinor:1200,idempotencyKey:randomUUID()}});
  await db.invoice.create({data:{paymentId:payment.id,number:randomUUID(),status:'ISSUED',issuedAt:new Date()}});
  const incident=await db.safetyIncident.create({data:{bookingId:booking.id,reportedByAccountId:member.id,severity:'LOW',title:'Synthetic case',description:'Private fixture details'}});
  const submitScoped=async (domain,recordRef,centerId=center.id)=>{
    const response=await call(member,rights,'POST',{...input,domain,recordRef,centerId,requestKey:randomUUID()});
    assert.equal(response.status,201);
    return db.privacyGrievance.findUniqueOrThrow({where:{personalDataRequestId:response.data.id}});
  };
  const protectedPayment=await submitScoped('PAYMENTS',payment.id);
  assert.equal((await act(owner,protectedPayment.id,'CENTER_RESOLVE','No matching erasure evidence',null,'APPLIED')).status,409);
  assert.equal((await act(owner,protectedPayment.id,'CENTER_RESOLVE','Review pending',null,'DEFERRED')).status,201);
  const firstReview=await decisionReview(protectedPayment.id,'center_resolve');
  assert.deepEqual(firstReview,{domain:'PAYMENTS',policyVersion:'0.1',recordClasses:['COMMERCIAL_BOOK_SUPPORT','VAT_RECORDS'],status:'OPEN_SAFETY_CASE_REQUIRES_REVIEW',issuedInvoiceOnFile:true,erasureAuthorized:false});
  const protectedBooking=await submitScoped('BOOKINGS',booking.id);
  assert.equal((await act(owner,protectedBooking.id,'CENTER_RESOLVE','Review pending',null,'DEFERRED')).status,201);
  assert.equal((await decisionReview(protectedBooking.id,'center_resolve')).status,'OPEN_SAFETY_CASE_REQUIRES_REVIEW');

  await db.safetyIncident.update({where:{id:incident.id},data:{status:'CLOSED'}});
  assert.equal((await call(member,route+'/'+protectedPayment.id+'/appeal','POST',{reason:'Review current facts'})).status,201);
  assert.equal((await act(staff,protectedPayment.id,'DEPARTMENT_RESOLVE','Financial classification pending','Private report','DEFERRED')).status,201);
  assert.equal((await decisionReview(protectedPayment.id,'department_resolve')).status,'FINANCIAL_CLASSIFICATION_REQUIRED');
  assert.equal((await decisionReview(protectedPayment.id,'center_resolve')).status,'OPEN_SAFETY_CASE_REQUIRES_REVIEW');
  assert.deepEqual(await db.payment.findUniqueOrThrow({where:{id:payment.id}}),payment);

  // Affiliation with two centers permits routing, but the second center must
  // not learn any native payment, invoice or incident facts from the first.
  await db.organizationMember.create({data:{organizationId:foreign.id,accountId:member.id,role:'VIEWER',status:'ACTIVE'}});
  const otherCenterCase=await submitScoped('PAYMENTS',payment.id,foreign.id);
  assert.equal((await act(outside,otherCenterCase.id,'CENTER_RESOLVE','Source outside center',null,'DEFERRED')).status,201);
  const unconfirmedReview=await decisionReview(otherCenterCase.id,'center_resolve');
  assert.equal(unconfirmedReview.status,'SOURCE_SCOPE_UNCONFIRMED');
  assert.equal(unconfirmedReview.issuedInvoiceOnFile,undefined);
  console.log('PASS native booking and payment retention review, open safety linkage, issued invoice, separate appeal snapshot and center isolation');
  const accountReq=await call(member,rights,'POST',{...input,kind:'CORRECTION',domain:'ACCOUNT',details:'Correct headline',requestKey:randomUUID()});
  assert.equal(accountReq.status,201);
  const own=accountReq.data.id, apply=(actor,body)=>call(actor,rights+'/'+own+'/profile-correction','POST',body);
  assert.equal((await apply(outside,{headline:'Wrong account'})).status,404);
  assert.equal((await apply(member,{headline:''})).status,400);
  const proof=await apply(member,{headline:'Corrected fixture headline'});assert.equal(proof.status,201);
  assert.equal((await apply(member,{headline:'Different new value'})).status,409);
  const entry=await db.auditEvent.findUniqueOrThrow({where:{id:proof.data.executionAuditId}});
  assert.equal(entry.metadata.privacyRequestId,own);assert.deepEqual(entry.metadata.changedFields,['headline']);
  assert(!JSON.stringify(entry.metadata).includes('Corrected fixture'));
  const me=await db.account.findUniqueOrThrow({where:{id:member.id},select:{person:{select:{professional:true}}}});
  assert.equal(me.person.professional.headline,'Corrected fixture headline');
  const correction=await db.privacyGrievance.findUniqueOrThrow({where:{personalDataRequestId:own}});
  assert.equal((await act(owner,correction.id,'CENTER_RESOLVE','Confirmed from linked action',null,'APPLIED')).status,201);
  const ownerReceipt=(await call(member,rights)).data.items.find(i=>i.id===own);
  assert.equal(ownerReceipt.decisionDisposition,'APPLIED');assert.equal(ownerReceipt.executionAuditId,entry.id);
  const erased=(await call(member,rights)).data.items.find(i=>i.id===receipt.data.id);
  assert.equal(erased.initialDisposition,'DEFERRED');assert.equal(erased.decisionDisposition,'REFUSED');assert.equal(erased.executionAuditId,null);
  console.log('PASS linked correction evidence, independent appeal and no unproven erasure');
  console.log('PASS rights receipt, affiliated center, first decision and independent appeal');
  console.log('PASS actual login, verified center affiliation, exact seven-day deadline, handled and idle branches, scheduler, department isolation, executive report and two private inbox deliveries, atomic rollback and duplicate retries');
}
try { await check(); } finally { await db.$disconnect(); }
