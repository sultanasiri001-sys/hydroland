import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

// Called only by the CI + loopback guarded center HTTP suite. The temporary
// column starts with a real TEXT FK; UUID mode tests query compatibility, not
// a production schema migration or its foreign-key recovery.
export async function checkCenterEquipment(db,{base,a,b,ownerA,ta,tb,ts},check){
  if(process.env.CI!=='true'||!['localhost','127.0.0.1','[::1]'].includes(new URL(process.env.DATABASE_URL).hostname))throw new Error('CI loopback database required');
  const columns=await db.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='EquipmentBarcode' AND column_name='organizationId'`;
  assert.equal(columns.length,0,'Expected isolated bootstrap schema without center scope');
  const resources=[];
  const policies=await db.$queryRaw`SELECT "id","state" FROM "PolicyControl" WHERE "category"='EQUIPMENT' AND "ruleKey" IN ('INSPECTION_STATUS','SERVICE_EXPIRY')`;
  const request=async(token,path,body)=>{
    const response=await fetch(base+'/center/me/equipment'+path,{method:body?'PATCH':'GET',headers:{...(token?{authorization:'Bearer '+token}:{}),...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
    return {status:response.status,body:await response.json()};
  };
  try{
    await db.$executeRaw`ALTER TABLE "EquipmentBarcode" ADD COLUMN "organizationId" TEXT REFERENCES "Organization"("id")`;
    await db.$executeRaw`UPDATE "PolicyControl" SET "state"='ENABLED' WHERE "category"='EQUIPMENT' AND "ruleKey" IN ('INSPECTION_STATUS','SERVICE_EXPIRY')`;
    for(const keyType of ['TEXT','UUID']){
      if(keyType==='UUID'){
        await db.$executeRaw`ALTER TABLE "EquipmentBarcode" DROP CONSTRAINT "EquipmentBarcode_organizationId_fkey"`;
        await db.$executeRaw`ALTER TABLE "EquipmentBarcode" ALTER COLUMN "organizationId" TYPE UUID USING "organizationId"::uuid`;
      }
      const fixtures=[];
      for(const center of [a,b]){
        const resource=await db.calendarResource.create({data:{type:'EQUIPMENT',name:'CI center equipment '+randomUUID()}});
        resources.push(resource.id);
        const code='CI-'+randomUUID();
        await db.$executeRaw`INSERT INTO "EquipmentBarcode"("id","resourceId","assetCode","barcodeValue","qrValue","location","organizationId") VALUES(${randomUUID()},${resource.id},${code},${code},${'qr:'+code},'STORE',(jsonb_populate_record(NULL::"EquipmentBarcode",jsonb_build_object('organizationId',${center.org.id}::text)))."organizationId")`;
        fixtures.push({id:resource.id,code});
      }
      const [own,other]=fixtures;
      const move=(body,token=ta,id=own.id)=>request(token,`/${id}/move`,body);
      let r=await request(ta,'');
      check(r.status===200&&r.body.some(row=>row.resourceId===own.id)&&!r.body.some(row=>row.resourceId===other.id),`${keyType}: equipment listing is center-scoped`);
      r=await request(ta,'/lookup/'+own.code);check(r.status===200&&r.body.resourceId===own.id,`${keyType}: owned lookup succeeds`);
      check((await request(ta,'/lookup/'+other.code)).status===404,`${keyType}: cross-center lookup denied`);
      check((await request(tb,`/${own.id}/history`)).status===404,`${keyType}: cross-center history denied`);
      check((await move({movementType:'TRANSFER'},tb)).status===404,`${keyType}: cross-center write denied`);
      check((await move({movementType:'TRANSFER'},ts)).status===403,`${keyType}: ordinary staff write denied`);
      check((await request(undefined,`/${own.id}/move`,{movementType:'TRANSFER'})).status===401,`${keyType}: anonymous write denied`);
      check((await move({movementType:'INVALID'})).status===400,`${keyType}: invalid movement denied`);
      check((await move({movementType:'TRANSFER',tripId:b.trip.id})).status===404,`${keyType}: other center trip denied`);
      await db.trip.update({where:{id:a.trip.id},data:{status:'COMPLETED'}});
      check((await move({movementType:'TRANSFER',tripId:a.trip.id})).status===409,`${keyType}: completed trip denied`);
      await db.trip.update({where:{id:a.trip.id},data:{status:'OPEN'}});
      check((await move({movementType:'CHECK_IN'})).status===409,`${keyType}: invalid check-in denied`);
      check((await move({movementType:'CHECK_OUT'})).status===409,`${keyType}: missing inspection blocks check-out`);
      const inspectionId=randomUUID();
      await db.$executeRaw`INSERT INTO "EquipmentInspection"("id","resourceId","status","inspectedAt","serviceExpiresAt") VALUES(${inspectionId},${own.id},'FAIL',NOW(),NOW()+INTERVAL '1 year')`;
      check((await move({movementType:'CHECK_OUT'})).status===409,`${keyType}: failed inspection blocks check-out`);
      await db.$executeRaw`UPDATE "EquipmentInspection" SET "status"='PASS',"serviceExpiresAt"=NOW()-INTERVAL '1 day' WHERE "id"=${inspectionId}`;
      check((await move({movementType:'CHECK_OUT'})).status===409,`${keyType}: expired service blocks check-out`);
      r=await request(ta,`/${own.id}/history`);check(r.status===200&&r.body.length===0,`${keyType}: denied writes leave no movements`);
      check(await db.auditEvent.count({where:{resourceId:own.id,action:'EQUIPMENT_INVENTORY_MOVED'}})===0,`${keyType}: denied writes leave no success audit`);
      await db.$executeRaw`UPDATE "EquipmentInspection" SET "serviceExpiresAt"=NOW()+INTERVAL '1 year' WHERE "id"=${inspectionId}`;
      const sequence=[['CHECK_OUT','CHECKED_OUT'],['CHECK_IN','AVAILABLE'],['MAINTENANCE','MAINTENANCE'],['RELEASE','AVAILABLE'],['QUARANTINE','QUARANTINED'],['RELEASE','AVAILABLE'],['TRANSFER','AVAILABLE'],['RETIRE','RETIRED']];
      for(const [movementType,status] of sequence){
        r=await move({movementType,toLocation:'CI-'+movementType,tripId:a.trip.id,notes:'Isolated HTTP test'});
        check(r.status===200&&r.body.stockStatus===status,`${keyType}: ${movementType} succeeds with ${status}, got ${r.status}`);
        const audit=await db.auditEvent.findFirst({where:{resourceId:own.id,action:'EQUIPMENT_INVENTORY_MOVED'},orderBy:{occurredAt:'desc'}});
        check(audit?.actorId===ownerA.personId&&audit.metadata.movementId===r.body.movement.id&&audit.metadata.organizationId===a.org.id&&audit.metadata.stockStatus===status,`${keyType}: ${movementType} audit records actor, center and movement`);
      }
      check((await move({movementType:'RELEASE'})).status===409,`${keyType}: retired equipment stays retired`);
      r=await request(ta,`/${own.id}/history`);check(r.status===200&&r.body.length===sequence.length,`${keyType}: history contains exactly successful movements`);
      r=await request(tb,'/lookup/'+other.code);check(r.status===200&&r.body.stockStatus==='AVAILABLE'&&r.body.location==='STORE',`${keyType}: other center equipment unchanged`);
    }
  }finally{
    await db.auditEvent.deleteMany({where:{resourceId:{in:resources},action:'EQUIPMENT_INVENTORY_MOVED'}});
    await db.$executeRaw`DELETE FROM "EquipmentMovement" WHERE "resourceId"=ANY(${resources}::text[])`;
    await db.$executeRaw`DELETE FROM "EquipmentInspection" WHERE "resourceId"=ANY(${resources}::text[])`;
    await db.$executeRaw`DELETE FROM "EquipmentBarcode" WHERE "resourceId"=ANY(${resources}::text[])`;
    await db.calendarResource.deleteMany({where:{id:{in:resources}}});
    for(const policy of policies)await db.$executeRaw`UPDATE "PolicyControl" SET "state"=${policy.state} WHERE "id"::text=${policy.id}`;
    await db.$executeRaw`ALTER TABLE "EquipmentBarcode" DROP COLUMN IF EXISTS "organizationId"`;
  }
}
