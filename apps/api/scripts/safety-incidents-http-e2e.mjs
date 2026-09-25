import {PrismaClient} from '@prisma/client';
import {createHmac} from 'node:crypto';

const db=new PrismaClient();
const base=process.env.SAFETY_INCIDENTS_E2E_BASE_URL||'http://127.0.0.1:3101/api/v1';
const secret=process.env.JWT_SECRET;if(!secret)throw new Error('JWT_SECRET required');
const suffix=Date.now().toString();
const enc=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
const tokenFor=id=>{const now=Math.floor(Date.now()/1000),body=enc({alg:'HS256',typ:'JWT'})+'.'+enc({sub:id,iat:now,exp:now+900});return body+'.'+createHmac('sha256',secret).update(body).digest('base64url');};
const headers=token=>({authorization:'Bearer '+token,'content-type':'application/json'});
const expectOk=async response=>{const body=await response.json().catch(()=>null);if(!response.ok)throw new Error('HTTP '+response.status+': '+JSON.stringify(body));return body};
const people=[],accounts=[];let adminRole=null,trip=null,incidentId=null;
try{
 for(const name of ['reporter','other','admin']){const person=await db.person.create({data:{firstName:name,lastName:'SafetyIncidentE2E'}});people.push(person);const account=await db.account.create({data:{personId:person.id,email:'safety-incident-'+name+'-'+suffix+'@example.invalid',passwordHash:'e2e',status:'ACTIVE',emailVerifiedAt:new Date()}});accounts.push(account);}
 const reporter=accounts[0],other=accounts[1],admin=accounts[2];
 adminRole=await db.roleAssignment.create({data:{accountId:admin.id,role:'ADMIN',status:'ACTIVE',activeAt:new Date(),scope:{purpose:'SAFETY_INCIDENT_E2E'}}});
 trip=await db.trip.create({data:{title:'Safety Incident E2E',type:'BOAT',startsAt:new Date('2030-02-01T08:00:00.000Z'),endsAt:new Date('2030-02-01T12:00:00.000Z'),capacity:8,status:'OPEN'}});
 const reporterToken=tokenFor(reporter.id),otherToken=tokenFor(other.id),adminToken=tokenFor(admin.id);
 let response=await fetch(base+'/safety/incidents',{method:'POST',headers:headers(reporterToken),body:JSON.stringify({tripId:trip.id,severity:'INVALID',title:'Invalid severity',description:'Must be rejected'})});if(response.status!==400)throw new Error('Invalid incident severity expected 400, got '+response.status);
 const created=await expectOk(await fetch(base+'/safety/incidents',{method:'POST',headers:headers(reporterToken),body:JSON.stringify({tripId:trip.id,severity:'HIGH',title:'تسرب وقود محدود',locationName:'مرسى القحمة',description:'تمت ملاحظة تسرب محدود قرب منطقة المحرك ويحتاج مراجعة فنية.'})}));incidentId=created.id;if(created.status!=='OPEN'||created.severity!=='HIGH'||created.reportedByAccountId!==reporter.id)throw new Error('Incident creation did not persist reporter-owned open record');
 const mine=await expectOk(await fetch(base+'/safety/incidents/mine',{headers:headers(reporterToken)}));if(!Array.isArray(mine)||mine[0]?.id!==incidentId||mine[0]?.trip?.id!==trip.id)throw new Error('Reporter mine list missing linked incident');
 const otherMine=await expectOk(await fetch(base+'/safety/incidents/mine',{headers:headers(otherToken)}));if(otherMine.length)throw new Error('Other account can view reporter incidents');
 response=await fetch(base+'/safety/incidents/admin',{headers:headers(reporterToken)});if(response.status!==403)throw new Error('Non-admin incident queue expected 403, got '+response.status);
 const queue=await expectOk(await fetch(base+'/safety/incidents/admin',{headers:headers(adminToken)}));if(!Array.isArray(queue)||!queue.some(item=>item.id===incidentId&&item.reportedBy?.id===reporter.id))throw new Error('Admin incident queue missing reporter evidence');
 response=await fetch(base+'/safety/incidents/admin/'+incidentId+'/status',{method:'PATCH',headers:headers(reporterToken),body:JSON.stringify({status:'UNDER_REVIEW'})});if(response.status!==403)throw new Error('Reporter status decision expected 403, got '+response.status);
 const reviewing=await expectOk(await fetch(base+'/safety/incidents/admin/'+incidentId+'/status',{method:'PATCH',headers:headers(adminToken),body:JSON.stringify({status:'UNDER_REVIEW',resolutionNotes:'تم توجيه البلاغ للفحص الفني'})}));if(reviewing.status!=='UNDER_REVIEW'||reviewing.resolvedAt)throw new Error('Under-review incident decision did not persist');
 response=await fetch(base+'/safety/incidents/admin/'+incidentId+'/status',{method:'PATCH',headers:headers(adminToken),body:JSON.stringify({status:'RESOLVED'})});if(response.status!==400)throw new Error('Resolution without notes expected 400, got '+response.status);
 const resolved=await expectOk(await fetch(base+'/safety/incidents/admin/'+incidentId+'/status',{method:'PATCH',headers:headers(adminToken),body:JSON.stringify({status:'RESOLVED',resolutionNotes:'تم عزل المصدر وإكمال فحص المحرك قبل التشغيل.'})}));if(resolved.status!=='RESOLVED'||resolved.resolvedByAccountId!==admin.id||!resolved.resolvedAt)throw new Error('Resolved incident did not persist resolver evidence');
 console.log('Safety incidents HTTP/DB E2E passed: authenticated reporting, reporter isolation, admin queue, review and evidenced resolution.');
}finally{
 if(incidentId)await db.safetyIncident.deleteMany({where:{id:incidentId}}).catch(()=>{});
 if(trip)await db.trip.deleteMany({where:{id:trip.id}}).catch(()=>{});
 if(adminRole)await db.roleAssignment.deleteMany({where:{id:adminRole.id}}).catch(()=>{});
 for(const account of accounts){await db.session.deleteMany({where:{accountId:account.id}}).catch(()=>{});await db.account.deleteMany({where:{id:account.id}}).catch(()=>{});}for(const person of people)await db.person.deleteMany({where:{id:person.id}}).catch(()=>{});await db.$disconnect();
}