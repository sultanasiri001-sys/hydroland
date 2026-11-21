import assert from 'node:assert/strict';
import {PrismaClient} from '@prisma/client';
import {createServer} from 'node:http';
import {setTimeout as delay} from 'node:timers/promises';

export const fixture = {
  account:'a1000000-1121-4001-8000-000000000001',
  person:'a1000000-1121-4001-8000-000000000002',
  trip:'a1000000-1121-4001-8000-000000000003',
  booking:'a1000000-1121-4001-8000-000000000004',
  resource:'a1000000-1121-4001-8000-000000000005',
  crew:'a1000000-1121-4001-8000-000000000006',
  email:'a10-managed-uat-20261121@example.invalid',
  before:'A10_UAT_MANAGED_20261121_BEFORE',
  after:'A10_UAT_MANAGED_20261121_AFTER',
};
export const db = new PrismaClient();
export const report = (step,data={}) => console.log(JSON.stringify({exercise:'A10_UAT_20261121',step,...data}));
const finishKey='A10_UAT_MANAGED_20261121_FINISHED';
export async function clock(tx=db) { return (await tx.$queryRaw`SELECT clock_timestamp() AS t`)[0].t; }

async function removeSourceFixture() {
  await db.$transaction(async tx=>{
    const person=await tx.account.findUnique({where:{id:fixture.account},select:{email:true}});
    assert.equal(person?.email,fixture.email);
    await tx.crewAssignment.delete({where:{id:fixture.crew}});
    await tx.booking.delete({where:{id:fixture.booking}});
    await tx.trip.delete({where:{id:fixture.trip}});
    await tx.calendarResource.delete({where:{id:fixture.resource}});
    await tx.account.delete({where:{id:fixture.account}});
    await tx.person.delete({where:{id:fixture.person}});
    await tx.operationalSetting.deleteMany({where:{key:{in:[fixture.before,fixture.after]}}});
    await tx.operationalSetting.create({data:{key:finishKey,value:{closed:true}}});
  });
}
async function seed(){
  const src=new URL(process.env.DATABASE_URL);
  assert.equal(src.hostname.split('.')[0],'dpg-db873n689jmc73cfqs60-a');
  assert.equal(src.pathname,'/hydroland_center_uat');
  assert.equal((await db.$queryRaw`SELECT current_database() AS name`)[0].name,'hydroland_center_uat');
  if(await db.operationalSetting.findUnique({where:{key:finishKey}})){ report('SEED_ALREADY_COMPLETED');return; }
  const before=await db.$transaction(async tx=>{
    const existing=await tx.operationalSetting.findUnique({where:{key:fixture.before}});
    if(existing)return existing;
    const now=await clock(tx);
    const cut=Math.ceil((now.getTime()+15000)/60000)*60000;
    const start=new Date(cut+86400000+120000);
    await tx.account.create({data:{id:fixture.account,email:fixture.email,passwordHash:'!disabled-for-restore-exercise!',status:'ACTIVE',emailVerifiedAt:now,person:{create:{id:fixture.person,firstName:'A10',lastName:'Synthetic'}}}});
    await tx.trip.create({data:{id:fixture.trip,title:'A10 isolated UAT recovery',type:'SHORE',status:'OPEN',capacity:2,startsAt:start,endsAt:new Date(start.getTime()+3600000)}});
    await tx.booking.create({data:{id:fixture.booking,tripId:fixture.trip,accountId:fixture.account,seats:1,status:'CONFIRMED'}});
    await tx.calendarResource.create({data:{id:fixture.resource,type:'A10_SYNTHETIC',name:'A10 isolated resource',active:false,referenceId:fixture.account}});
    await tx.crewAssignment.create({data:{id:fixture.crew,tripId:fixture.trip,resourceId:fixture.resource,accountId:fixture.account,roleType:'A10_SYNTHETIC',status:'PENDING'}});
    return tx.operationalSetting.create({data:{key:fixture.before,value:{targetUtc:new Date(cut).toISOString()},updatedAt:await clock(tx)}});
  });
  const target=new Date(before.value.targetUtc);
  assert(target.getTime()>before.updatedAt.getTime());
  report('BEFORE_COMMITTED',{targetUtc:target.toISOString(),markerUtc:before.updatedAt.toISOString()});
  await delay(Math.max(0,target.getTime()+4000-(await clock()).getTime()));
  const late=await db.$transaction(async tx=>{
    const existing=await tx.operationalSetting.findUnique({where:{key:fixture.after}});
    if(existing)return existing;
    assert.equal((await tx.booking.findUniqueOrThrow({where:{id:fixture.booking}})).status,'CONFIRMED');
    assert.equal((await tx.crewAssignment.findUniqueOrThrow({where:{id:fixture.crew}})).status,'PENDING');
    return tx.operationalSetting.create({data:{key:fixture.after,value:{exercise:true},updatedAt:await clock(tx)}});
  });
  const incident=await clock();
  assert(late.updatedAt.getTime()>target.getTime() && incident>=late.updatedAt);
  report('INCIDENT_SIMULATED',{targetUtc:target.toISOString(),markerUtc:before.updatedAt.toISOString(),lateMarkerUtc:late.updatedAt.toISOString(),incidentUtc:incident.toISOString()});
  await removeSourceFixture();
  report('SOURCE_FIXTURE_REMOVED',{syntheticAccountRemoved:!(await db.account.findUnique({where:{id:fixture.account}}))});
}
if(process.argv[1]?.endsWith('/seed.mjs')){
  createServer((_req,res)=>{res.end('A10 isolated test runner');}).listen(Number(process.env.PORT??10000));
  try{await seed();}catch(error){report('FAILED',{name:error?.name,code:error?.code??null,reason:error?.name==='AssertionError'?error.message.slice(0,85):null});}
  finally{await db.$disconnect();}
}
