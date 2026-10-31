import assert from 'node:assert/strict';
import {createHmac,randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {PrismaClient} from '@prisma/client';
import {warehouseTestDatabase,warehouseMigration,sqlStatements} from './warehouse-location-test-support.mjs';
warehouseTestDatabase();
const base=new URL(process.env.WAREHOUSE_LOCATION_E2E_BASE_URL||'http://127.0.0.1:3117/api/v1/');assert(['localhost','127.0.0.1','[::1]'].includes(base.hostname));
const secret=process.env.JWT_SECRET;assert(secret?.length>=32);
const db=new PrismaClient(),root='admin/warehouse-locations',suffix=randomUUID(),require=createRequire(import.meta.url),{warehouseLocationRecordDigest,locationDigest}=require('../dist/inventory/warehouse-location.domain.js');
let checks=0;const pass=message=>console.log(`PASS ${++checks}: ${message}`);
async function actor(name,role='ADMIN'){
 const person=await db.person.create({data:{firstName:'SyntheticWarehouse',lastName:name}}),account=await db.account.create({data:{personId:person.id,email:`warehouse-${name}-${suffix}@example.invalid`,passwordHash:'synthetic-no-login',status:'ACTIVE',emailVerifiedAt:new Date()}});
 if(role)await db.roleAssignment.create({data:{accountId:account.id,role,status:'ACTIVE'}});
 const session=await db.session.create({data:{accountId:account.id,tokenHash:randomUUID(),expiresAt:new Date(Date.now()+3600000)}}),encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url'),now=Math.floor(Date.now()/1000),part=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:account.id,sid:session.id,iat:now,exp:now+3600})}`;
 return {...account,token:`${part}.${createHmac('sha256',secret).update(part).digest('base64url')}`};
}
async function call(a,path=root,method='GET',body){const r=await fetch(new URL(path,base),{method,headers:{...(a?{authorization:`Bearer ${a.token}`} : {}),...(body===undefined?{}:{'content-type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(30000)});return {status:r.status,data:await r.json().catch(()=>null),cache:r.headers.get('cache-control')};}
async function ok(a,path=root,method='GET',body){const r=await call(a,path,method,body);assert(r.status>=200&&r.status<300,`${path} ${r.status} ${JSON.stringify(r.data)}`);assert.match(r.cache||'',/no-store/);return r.data;}
async function deny(a,path=root,method='GET',body,statuses=[400,403,409]){const r=await call(a,path,method,body);assert(statuses.includes(r.status),`${path} expected ${statuses}, got ${r.status} ${JSON.stringify(r.data)}`);return r;}
const payload=()=>({requestKey:randomUUID(),title:'PRIVATE_LOCATION_<img src=x onerror=alert(1)>',locationDescription:'PRIVATE_LOCATION_DESCRIPTION_917273',code:'WH-'+randomUUID().slice(0,8).toUpperCase()});
const inspect=(a,id)=>ok(a,`${root}/${id}`);
const snapshot=()=>Promise.all([db.warehouseLocation.findMany({orderBy:{id:'asc'}}),db.warehouseLocationRevision.findMany({orderBy:{id:'asc'}}),db.auditEvent.count()]);
try{
 assert.equal(await db.account.count(),0,'Refuse existing account stores');assert.equal(await db.organization.count(),0,'Dedicated empty database required');
 for(const table of ['WarehouseLocationRevision','WarehouseLocation'])assert.equal(Number((await db.$queryRawUnsafe(`SELECT count(*) AS count FROM "${table}"`))[0].count),0);
 await db.$transaction(async tx=>{await tx.$executeRawUnsafe('DROP TABLE "WarehouseLocationRevision"');await tx.$executeRawUnsafe('DROP TABLE "WarehouseLocation"');for(const sql of sqlStatements(await warehouseMigration()))await tx.$executeRawUnsafe(sql);for(const sql of sqlStatements(await readFile(new URL('../prisma/migrations/20260930080000_audit_event_append_only/migration.sql',import.meta.url),'utf8')))await tx.$executeRawUnsafe(sql);});
 const owner=await actor('owner'),other=await actor('other'),staff=await actor('staff','STAFF');
 const org=await db.organization.create({data:{displayName:'Synthetic internal warehouse register',kind:'HYDROLAND_INTERNAL_PLATFORM',status:'ACTIVE',ownerId:owner.id}}),foreign=await db.organization.create({data:{displayName:'Synthetic unrelated center',kind:'DIVE_CENTER',status:'ACTIVE',ownerId:other.id}});
 await db.organizationMember.create({data:{organizationId:org.id,accountId:owner.id,role:'OWNER',status:'ACTIVE'}});
 await db.operationalSetting.create({data:{key:'PLATFORM_STAFFING_ORGANIZATION:v1',value:{organizationId:org.id}}});
 await deny(null,root,'GET',undefined,[401]);await deny(other,root,'GET',undefined,[403]);await deny(staff,root,'GET',undefined,[403]);assert.deepEqual((await ok(owner)).items,[]);
 for(const extra of [{organizationId:foreign.id},{status:'ACTIVE'},{approved:true},{stockQuantity:1},{operatingPermission:true}])await deny(owner,root,'POST',{...payload(),...extra},[400]);
 pass('owner-only fresh guards and strict location inputs refuse stock and operating authority');
 const input=payload(),created=await ok(owner,root,'POST',input),id=created.record.id;assert.equal(created.created,true);assert.equal(created.record.revision,1);assert.equal(created.record.status,'RECORDED');assert.equal(created.history.length,1);assert.match(created.notice,/لا يثبت/);
 const replay=await ok(owner,root,'POST',{...input,code:input.code.toLowerCase(),requestKey:input.requestKey.toUpperCase()});assert.equal(replay.record.id,id);assert.equal(replay.created,false);assert.equal(await db.warehouseLocationRevision.count(),1);
 await deny(owner,root,'POST',{...input,title:'different content'},[409]);await deny(owner,root,'POST',{...input,requestKey:randomUUID(),code:input.code.toLowerCase()},[409]);
 const concurrentInput=payload(),concurrent=await Promise.all(Array.from({length:4},()=>ok(owner,root,'POST',concurrentInput)));assert.equal(new Set(concurrent.map(r=>r.record.id)).size,1);assert.equal(concurrent.filter(r=>r.created).length,1);assert.equal(await db.warehouseLocation.count(),2);
 pass('idempotent creation and concurrent duplicate requests preserve one location and initial revision');
 for(const [method,path,body] of [['GET',`${root}/${id}`],['PATCH',`${root}/${id}`,{title:'Unrelated',locationDescription:'Unrelated',reason:'Unrelated edit',expectedRevision:1}],['POST',`${root}/${id}/archive`,{expectedRevision:1,reason:'Unrelated archive',confirmed:true}],['POST',`${root}/${id}/restore`,{expectedRevision:1,reason:'Unrelated restore',confirmed:true}],['POST',root,payload()]])await deny(other,path,method,body,[403]);
 await deny(owner,`${root}/${randomUUID()}`,'GET',undefined,[404]);
 const edit={expectedRevision:1,title:'Edited internal planning',locationDescription:'Edited planning locationDescription',reason:'Synthetic actual edit'};
 await deny(owner,`${root}/${id}`,'PATCH',{...edit,code:'NEW-CODE'},[400]);
 let view=await ok(owner,`${root}/${id}`,'PATCH',edit);assert.equal(view.record.revision,2);assert.equal(view.history.length,2);
 const unchanged=await snapshot();await deny(owner,`${root}/${id}`,'PATCH',edit,[409]);await deny(owner,`${root}/${id}`,'PATCH',{...edit,expectedRevision:'2'},[400]);assert.deepEqual(await snapshot(),unchanged);
 const replayAfterEdit=await ok(owner,root,'POST',input);assert.equal(replayAfterEdit.record.revision,2);assert.equal(replayAfterEdit.record.title,edit.title);
 await deny(owner,`${root}/${id}/archive`,'POST',{expectedRevision:2,reason:'Archive fixture',confirmed:false},[400]);
 view=await ok(owner,`${root}/${id}/archive`,'POST',{expectedRevision:2,reason:'Archive fixture',confirmed:true});assert.equal(view.record.status,'ARCHIVED');assert.equal(view.record.revision,3);
 await deny(owner,`${root}/${id}`,'PATCH',{...edit,expectedRevision:3},[409]);
 view=await ok(owner,`${root}/${id}/restore`,'POST',{expectedRevision:3,reason:'Restore fixture',confirmed:true});assert.equal(view.record.status,'RECORDED');assert.equal(view.record.revision,4);
 pass('foreign access, stale versions, archive/restore and original-request replays preserve immutable history');
 const actions=await Promise.all([call(owner,`${root}/${id}`,'PATCH',{...edit,expectedRevision:4,title:'Concurrent first'}),call(owner,`${root}/${id}`,'PATCH',{...edit,expectedRevision:4,title:'Concurrent second'})]);assert.deepEqual(actions.map(r=>r.status).sort(),[200,409]);
 view=await inspect(owner,id);assert.equal(view.record.revision,5);assert.equal(view.history.length,5);
 for(const sql of ['UPDATE "WarehouseLocationRevision" SET "reason"=\'tamper\'','DELETE FROM "WarehouseLocationRevision"','TRUNCATE "WarehouseLocationRevision"'])await assert.rejects(()=>db.$executeRawUnsafe(sql));
 const original=await db.warehouseLocation.findUniqueOrThrow({where:{id}});await db.warehouseLocation.update({where:{id},data:{recordDigest:'0'.repeat(64)}});await deny(owner,`${root}/${id}`,'GET',undefined,[409]);await db.warehouseLocation.update({where:{id},data:{recordDigest:original.recordDigest,updatedAt:original.updatedAt}});
 const orphan={...original,revision:6};await db.warehouseLocation.update({where:{id},data:{revision:6,recordDigest:warehouseLocationRecordDigest(orphan),updatedAt:original.updatedAt}});await deny(owner,`${root}/${id}`,'GET',undefined,[409]);await db.warehouseLocation.update({where:{id},data:{revision:original.revision,recordDigest:original.recordDigest,updatedAt:original.updatedAt}});
 pass('one concurrent edit wins; native append-only history and tampered/orphaned versions fail closed');
 const fail='warehouse_fail_'+suffix.replaceAll('-','');
 await db.$executeRawUnsafe(`CREATE FUNCTION "${fail}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."resource"='WarehouseLocation' THEN RAISE EXCEPTION 'synthetic audit failure'; END IF; RETURN NEW; END $$`);
 await db.$executeRawUnsafe(`CREATE TRIGGER "${fail}" BEFORE INSERT ON "AuditEvent" FOR EACH ROW EXECUTE FUNCTION "${fail}"()`);
 const beforeFailure=await snapshot();
 try{await deny(owner,root,'POST',payload(),[500]);await deny(owner,`${root}/${id}`,'PATCH',{...edit,expectedRevision:5},[500]);await deny(owner,`${root}/${id}/archive`,'POST',{expectedRevision:5,reason:'Rollback fixture',confirmed:true},[500]);assert.deepEqual(await snapshot(),beforeFailure);}finally{await db.$executeRawUnsafe(`DROP TRIGGER "${fail}" ON "AuditEvent"`);await db.$executeRawUnsafe(`DROP FUNCTION "${fail}"()`);}
 pass('audit failure atomically rolls back creation, edit, archive and all revision rows');
 const forbidden=async()=>{const before=await snapshot();await deny(owner,root,'GET',undefined,[401,403]);await deny(owner,`${root}/${id}`,'GET',undefined,[401,403]);await deny(owner,root,'POST',payload(),[401,403]);await deny(owner,`${root}/${id}`,'PATCH',{...edit,expectedRevision:5},[401,403]);await deny(owner,`${root}/${id}/archive`,'POST',{expectedRevision:5,reason:'Denied fixture',confirmed:true},[401,403]);assert.deepEqual(await snapshot(),before);};
 await db.roleAssignment.updateMany({where:{accountId:owner.id,role:'ADMIN'},data:{status:'SUSPENDED'}});await forbidden();await db.roleAssignment.updateMany({where:{accountId:owner.id,role:'ADMIN'},data:{status:'ACTIVE'}});
 await db.account.update({where:{id:owner.id},data:{emailVerifiedAt:null}});await forbidden();await db.account.update({where:{id:owner.id},data:{emailVerifiedAt:new Date()}});
 await db.account.update({where:{id:owner.id},data:{status:'SUSPENDED'}});await forbidden();await db.account.update({where:{id:owner.id},data:{status:'ACTIVE'}});
 await db.organizationMember.updateMany({where:{organizationId:org.id,accountId:owner.id},data:{status:'SUSPENDED'}});await forbidden();await db.organizationMember.updateMany({where:{organizationId:org.id,accountId:owner.id},data:{status:'ACTIVE'}});
 await db.organization.update({where:{id:org.id},data:{ownerId:other.id}});await forbidden();await db.organization.update({where:{id:org.id},data:{ownerId:owner.id}});
 await db.operationalSetting.update({where:{key:'PLATFORM_STAFFING_ORGANIZATION:v1'},data:{value:{organizationId:foreign.id}}});await forbidden();await db.operationalSetting.update({where:{key:'PLATFORM_STAFFING_ORGANIZATION:v1'},data:{value:{organizationId:org.id}}});
 pass('same-session revocation of role, verification, account, membership, owner and internal pointer blocks reads and writes');
 const now=new Date(Date.now()+1000),rows=[];
 for(let i=0;i<53;i++){const value={id:randomUUID(),organizationId:i===52?foreign.id:org.id,requestKey:randomUUID(),requestDigest:'a'.repeat(64),revision:1,status:i%2?'ARCHIVED':'RECORDED',title:'Private paginated draft '+i,locationDescription:'Private paginated locationDescription',code:'WH-'+randomUUID().slice(0,8).toUpperCase(),createdByAccountId:owner.id,createdAt:now,updatedAt:now};rows.push({...value,recordDigest:warehouseLocationRecordDigest(value)});}
 await db.warehouseLocation.createMany({data:rows});
 for(const row of rows){const entry={id:randomUUID(),warehouseLocationId:row.id,revision:1,snapshot:JSON.parse(JSON.stringify(row)),action:'WAREHOUSE_LOCATION_CREATED',reason:'Synthetic pagination fixture',actorAccountId:owner.id,previousDigest:null,createdAt:now};await db.warehouseLocationRevision.create({data:{...entry,recordDigest:locationDigest(entry)}});}
 const page1=await ok(owner),page2=await ok(owner,root+'?cursor='+page1.nextCursor);assert.equal(page1.items.length,50);assert.equal(page1.hasMore,true);assert.equal(page2.items.length,4);assert.equal(new Set([...page1.items,...page2.items].map(r=>r.id)).size,54);assert(![...page1.items,...page2.items].some(r=>r.id===rows[52].id));
 await deny(owner,root+'?cursor='+rows[52].id,'GET',undefined,[400]);await deny(owner,root+'?status=ACTIVE','GET',undefined,[400]);const archived=await ok(owner,root+'?status=ARCHIVED');assert(archived.items.every(r=>r.status==='ARCHIVED'));
 pass('keyset pagination handles tied timestamps, filters and foreign cursors without leaking unrelated drafts');
 const {STAFFING_DEPARTMENTS}=require('../dist/hr/staffing-catalog.js');await db.orgUnit.createMany({data:STAFFING_DEPARTMENTS.map(d=>({organizationId:org.id,type:'DEPARTMENT',code:d.code,nameAr:d.nameAr,active:true}))});
 const beforePreview=await snapshot(),sources=await ok(owner,'admin/agents/department-sources'),packet=sources.departments.find(d=>d.department==='INVENTORY_LOGISTICS');assert.equal(sources.sourceVersion,6);assert.equal(sources.coverage,'PARTIAL');assert.equal(sources.operationalAcceptance,'NOT_ASSESSED');assert.equal(sources.departments.filter(d=>d.operationalCountsConnected).length,14);assert.deepEqual(packet.evidence.metrics,{storeGoodsProducts:0,activeStoreGoodsProducts:0,draftStoreGoodsProducts:0,unavailableActiveStoreGoodsProducts:0,negativeStockStoreGoodsProducts:0,warehouseLocations:54,recordedWarehouseLocations:28,archivedWarehouseLocations:26,recordedWarehouseBalanceEvidence:0,recordedWarehouseMovementEvidence:0,recordedProcurementEvidence:0});assert.deepEqual(packet.evidence.missingSources,['WAREHOUSE_OPERATIONAL_EVIDENCE_VERIFICATION']);
 const text=JSON.stringify(sources);for(const forbiddenText of [input.title,input.locationDescription,owner.email,owner.id,org.id,foreign.id,...rows.map(r=>r.id)])assert(!text.includes(forbiddenText));assert.deepEqual(await snapshot(),beforePreview);
 const {readDepartmentSources}=require('../dist/agents/department-source.reader.js');for(const version of [2,3,4]){const old=await db.$transaction(tx=>readDepartmentSources(tx,owner.id,['INVENTORY_LOGISTICS'],version));assert(!Object.hasOwn(old.departments[0].evidence.metrics,'warehouseLocations'));assert.equal(old.departments[0].evidence.missingSources[0],'WAREHOUSE_PROCUREMENT_REGISTRY');assert.equal(old.sourceVersion,version);}
 assert.equal(await db.aiAgentTask.count(),0);assert.equal(await db.managedDocument.count(),0);assert.equal(await db.notification.count(),0);
 const audit=JSON.stringify(await db.auditEvent.findMany({where:{resource:'WarehouseLocation'}}));assert(!audit.includes(input.title)&&!audit.includes(input.locationDescription));
 pass('14 v5 adapters remain partial; location counts exclude foreign data, retain v2/v3/v4 gaps and create no AI task, document or email');
 console.log(`Warehouse locations HTTP/PostgreSQL PASS: ${checks} groups; isolated location register only, no production seeds, stock movement or provider traffic.`);
}finally{await db.$disconnect();}

