import {createHash} from 'node:crypto';
import {licenseFixture} from './license-fixture.mjs';

// Runs inside the CI-only real-auth suite; never mutates deployed UAT data.
export async function prepareLicenseChecks({db,call,request,ok,center,account}) {
  const bytes=await licenseFixture();
  const sha256=createHash('sha256').update(bytes).digest('hex');
  const input={type:'LICENSE',unitId:center.id,referenceNumber:'UAT-CI-LICENSE-001',subject:'مرفق تجريبي فقط — ليست رخصة رسمية',mimeType:'application/pdf',base64:bytes.toString('base64'),issuedAt:'2026-01-01',expiresAt:'2030-01-01'};
  const save='/center/me/licenses/save';
  await call(null,save,input,[401]);
  await call('admin',save,input,[403]);
  await call('outsider',save,input,[404]);
  for(const invalid of [{base64:'!!!!'},{mimeType:'text/html'},{base64:Buffer.from('%PDF-invalid').toString('base64')},{issuedAt:'2026-02-30'},{expiresAt:'2025-01-01'}]) {
    await call('manager',save,{...input,...invalid},[400]);
  }
  ok(await db.administrativeRecord.count()===0&&await db.organizationDocumentAsset.count()===0,'invalid uploads leave no records or assets');
  const saved=await call('manager',save,input,[201]);
  ok(saved.status==='DRAFT'&&!!saved.licenseAssetId,'upload stays draft without verification');
  await call('manager',save,input,[409]);
  const path=`/center/me/licenses/${saved.id}/attachment`;
  const download=async()=>{
    const response=await request('manager',path);
    ok(response.status===200,'manager can download attachment');
    ok(response.headers.get('content-type')?.includes('application/pdf')&&response.headers.get('cache-control')==='private, no-store'&&response.headers.get('content-disposition')?.startsWith('attachment;'),'private PDF download headers');
    ok(Buffer.from(await response.arrayBuffer()).equals(bytes),'download preserves every byte');
  };
  await download();
  await call(null,path,undefined,[401]);
  await call('admin',path,undefined,[403]);
  await call('outsider',path,undefined,[404]);
  await call('outsider',path,input,[404],'PATCH');
  await call('manager',path,input,[200],'PATCH');
  ok(await db.organizationDocumentAsset.count({where:{organizationId:center.organizationId,sha256}})===1,'identical draft upload deduplicates');
  const asset=await db.organizationDocumentAsset.findUniqueOrThrow({where:{id:saved.licenseAssetId}});
  ok(asset.sha256===sha256&&asset.byteSize===bytes.length&&Buffer.from(asset.content).equals(bytes),'stored metadata and bytes match');
  // Fault injection only in disposable CI database: corrupted content must fail closed.
  await db.organizationDocumentAsset.update({where:{id:asset.id},data:{content:Buffer.from('corrupted CI fixture')}});
  try{await call('manager',path,undefined,[409]);}finally{await db.organizationDocumentAsset.update({where:{id:asset.id},data:{content:bytes}});}
  const registration=`/center/me/licenses/${saved.id}/register`;
  await call('manager',registration,{},[200],'PATCH');
  await call('manager',registration,{},[409],'PATCH');
  await call('manager',path,{...input,expiresAt:'2031-01-01'},[409],'PATCH');
  const hq=await db.orgUnit.findFirstOrThrow({where:{organizationId:center.organizationId,type:'HQ'}});
  const routed=await call('manager',`/center/me/licenses/${saved.id}/reviews`,{toUnitId:hq.id},[201]);
  const assign=`/center/me/license-reviews/${routed.id}/assign`;
  const decide=`/center/me/license-reviews/${routed.id}/decision`;
  await call('manager',assign,{assigneeAccountId:account.manager},[403],'PATCH');
  await call('outsider',assign,{assigneeAccountId:account.finance1},[404],'PATCH');
  await call('manager',assign,{assigneeAccountId:account.finance1},[200],'PATCH');
  await call('manager',decide,{decision:'APPROVE'},[403],'PATCH');
  await call('finance1',decide,{decision:'APPROVE'},[200],'PATCH');
  await call('finance1',decide,{decision:'REJECT'},[409],'PATCH');
  const listed=await call('manager','/center/me/documents');
  const row=listed.licenses.find(x=>x.id===saved.id);
  ok(row.status==='REGISTERED'&&row.routings[0].decision==='APPROVE'&&row.licenseReviewStatus!=='APPROVED','internal review does not imply platform or external acceptance');
  ok(!JSON.stringify(listed).includes(input.base64),'listing excludes file bytes');
  const foreign=await call('outsider','/center/me/documents');
  ok(!foreign.licenses.some(x=>x.id===saved.id)&&!foreign.assets.some(x=>x.id===asset.id),'foreign listing excludes record and asset');
  const person=await db.account.findUniqueOrThrow({where:{id:account.manager}});
  ok(!!await db.auditEvent.findFirst({where:{resourceId:saved.id,action:'CENTER_LICENSE_SAVED',actorId:person.personId}}),'upload audit identifies real actor');
  return {async verifyRestart(){
    await download();
    const record=await db.administrativeRecord.findUniqueOrThrow({where:{id:saved.id}});
    ok(record.status==='REGISTERED'&&record.licenseExpiresAt.toISOString().startsWith('2030-01-01'),'restart preserves frozen dates and registration');
    ok(await db.organizationDocumentAsset.count({where:{organizationId:center.organizationId,sha256}})===1,'restart preserves one attachment');
  }};
}
