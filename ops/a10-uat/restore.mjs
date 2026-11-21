import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {randomBytes,scryptSync} from 'node:crypto';
import {createServer} from 'node:http';
import {setTimeout as delay} from 'node:timers/promises';
import {db,fixture,clock,report} from './seed.mjs';

createServer((_req,res)=>res.end('A10 isolated recovery test')).listen(Number(process.env.PORT??10000));
const base='http://127.0.0.1:3189/api/v1';
const postTypes=['CREW_RESPONSE_OVERDUE','CREW_RESPONSE_REVIEW_REQUIRED'];
const matching={type:{in:postTypes},payload:{path:['assignmentId'],equals:fixture.crew}};
let child;
async function exercise(){
  const connection=new URL(process.env.DATABASE_URL);
  const expected=process.env.A10_TARGET_HOST;
  assert.match(expected,/^dpg-[a-z0-9]+-a$/);
  assert(!['dpg-dakd8g5g1s2s73bu70bg-a','dpg-db873n689jmc73cfqs60-a','dpg-dbsdegs9v7es73cd604g-a','dpg-db7v3mks728c739pb05g-a'].includes(expected));
  assert.equal(connection.hostname.split('.')[0],expected);
  assert.equal(decodeURIComponent(connection.pathname.slice(1)),process.env.A10_TARGET_DATABASE);
  assert.equal((await db.$queryRaw`SELECT current_database() AS name`)[0].name,process.env.A10_TARGET_DATABASE);
  const target=new Date(process.env.A10_TARGET_UTC),incident=new Date(process.env.A10_INCIDENT_UTC);
  assert(Number.isFinite(target.getTime())&&Number.isFinite(incident.getTime())&&incident>target);
  const before=await db.operationalSetting.findUniqueOrThrow({where:{key:fixture.before}});
  assert.equal(before.value.targetUtc,target.toISOString());
  assert(before.updatedAt<=target);
  assert.equal(await db.operationalSetting.findUnique({where:{key:fixture.after}}),null);
  const booking=await db.booking.findUniqueOrThrow({where:{id:fixture.booking}});
  const crew=await db.crewAssignment.findUniqueOrThrow({where:{id:fixture.crew}});
  assert.equal(booking.accountId,fixture.account);assert.equal(booking.tripId,fixture.trip);
  assert.equal(booking.status,'CONFIRMED');assert.equal(crew.status,'PENDING');
  assert.equal(crew.accountId,fixture.account);assert.equal(crew.tripId,fixture.trip);
  assert.equal(await db.notification.count({where:matching}),0);
  const adminCount=await db.roleAssignment.count({where:{role:'ADMIN',status:'ACTIVE'}});
  assert(adminCount>0,'No initialized synthetic UAT admin mailbox');
  const checkpoint=await clock();
  report('RESTORED_BOUNDARY_VERIFIED',{targetUtc:target.toISOString(),incidentUtc:incident.toISOString(),beforeUtc:before.updatedAt.toISOString(),boundVerifiedUtc:checkpoint.toISOString(),afterMarkerAbsent:true,restoredBooking:true,restoredCrew:true,initialCrewAlerts:0});
  // Only the restored, disabled fixture user's password becomes testable, and only
  // while this private engine is running. It is neither logged nor published.
  const password=randomBytes(30).toString('base64url'),salt=randomBytes(16).toString('hex');
  const loginFixture=await db.account.updateMany({where:{id:fixture.account,email:fixture.email},data:{passwordHash:salt+':'+scryptSync(password,salt,64).toString('hex')}});
  assert.equal(loginFixture.count,1);
  // The old lease was copied from another database. This exercise fences the
  // old processor by using an entirely separate database and no delivery keys.
  const lease=await db.operationalSetting.deleteMany({where:{key:'LEASE:CREW_ESCALATION'}});
  report('RESTORE_ONLY_LEASE_HANDOFF',{released:lease.count});
  let childEnded=false;
  child=spawn(process.execPath,['apps/api/dist/main.js'],{stdio:'ignore',env:{
    PATH:process.env.PATH,DATABASE_URL:process.env.DATABASE_URL,JWT_SECRET:randomBytes(40).toString('hex'),
    NODE_ENV:'production',PORT:'3189',WEB_ORIGIN:'http://127.0.0.1:3189',HYDROLAND_PUBLIC_WEB_ORIGIN:'http://127.0.0.1:3189',
  }});
  child.on('exit',()=>{childEnded=true;});
  let ready;
  for(let i=0;i<90&&!childEnded;i++){
    const res=await fetch(base+'/health/ready',{signal:AbortSignal.timeout(2500)}).catch(()=>null);
    if(res?.ok){const h=await res.json();if(h.status==='ready'&&h.database==='ok'){ready=await clock();break;}}
    await delay(1000);
  }
  assert(ready,'Full application readiness failed');
  const login=await fetch(base+'/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:fixture.email,password})});
  assert.equal(login.status,200);const {accessToken}=await login.json();assert(accessToken);
  const headers={authorization:'Bearer '+accessToken};
  const read=async(path)=>{const res=await fetch(base+path,{headers});assert.equal(res.status,200);return res.json();};
  const mine=await read('/trips/bookings/mine');assert(mine.some(x=>x.id===fixture.booking&&x.status==='CONFIRMED'));
  const crewData=await read('/trips/crew/assignments/mine');assert(crewData.some(x=>x.id===fixture.crew&&x.tripId===fixture.trip));
  let delivered=0;
  for(let i=0;i<90&&!childEnded;i++){
    delivered=await db.notification.count({where:matching}); if(delivered)break;
    await delay(1000);
  }
  assert(delivered>0,'Background crew notification missing');
  const verified=await clock();
  const rpoMs=incident-before.updatedAt,rtoMs=verified-incident;
  assert(rpoMs>=0&&rtoMs>=0);
  report('END_TO_END_RESULT',{status:rpoMs<=900000&&rtoMs<=3600000?'PASS':'OBJECTIVE_MISSED',
    targetUtc:target.toISOString(),incidentUtc:incident.toISOString(),beforeUtc:before.updatedAt.toISOString(),readyUtc:ready.toISOString(),verifiedUtc:verified.toISOString(),rpoMs,rtoMs,
    targetRpoMs:900000,targetRtoMs:3600000,crewAlertsCreated:delivered,restoredSourceLeaseReleased:lease.count,checks:['target identity','pre-cut marker','post-cut marker excluded','booking','pending crew','empty outbox for assignment','application readiness','login','own bookings','own assignments','native crew scheduler notification']});
}
try {await exercise();}
catch(error){report('VERIFY_FAILED',{name:error?.name,code:error?.code??null,reason:error?.name==='AssertionError'?error.message.slice(0,100):null});}
finally {if(child)child.kill('SIGTERM');await db.$disconnect();}
