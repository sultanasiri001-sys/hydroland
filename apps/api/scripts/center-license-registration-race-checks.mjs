import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PDFDocument} from 'pdf-lib';
import {DatabaseService} from '../dist/database/database.service.js';
import {AuditService} from '../dist/audit/audit.service.js';
import {CenterLicenseService} from '../dist/organizations/center-license.service.js';
import {AdministrativeAffairsPersistenceService} from '../dist/administrative-affairs/administrative-affairs-persistence.service.js';

// Commit an HTTP attachment edit at a deterministic service boundary. The API
// process uses its own database client, so its edit is genuinely committed
// before the registration transaction starts; no timing-dependent sleeps.
export async function checkCenterLicenseRegistrationRace({base,a,ownerA,ta},check){
  const loopback=host=>['localhost','127.0.0.1','[::1]'].includes(host);
  if(process.env.CI!=='true'||!loopback(new URL(base).hostname)||!loopback(new URL(process.env.DATABASE_URL).hostname))throw new Error('License race fixtures require CI and loopback API/PostgreSQL');
  const db=new DatabaseService();
  const originalTransaction=db.$transaction.bind(db);
  const ids=[];
  const request=async(path,method,body)=>{
    const response=await fetch(base+'/center/me/licenses'+path,{method,headers:{authorization:'Bearer '+ta,'content-type':'application/json'},body:JSON.stringify(body)});
    return {status:response.status,body:await response.json()};
  };
  try{
    const source=await db.administrativeRecord.findFirstOrThrow({where:{organizationId:a.org.id,type:'LICENSE',licenseAssetId:{not:null}}});
    const file=await db.organizationDocumentAsset.findUniqueOrThrow({where:{id:source.licenseAssetId}});
    const pdf=await PDFDocument.create();pdf.addPage();pdf.setTitle('Concurrent license '+randomUUID());
    const replacement=Buffer.from(await pdf.save()).toString('base64');
    for(const scenario of ['attachment-before-canonical-read','dates-before-transaction']){
      const created=await request('','POST',{type:'LICENSE',unitId:source.unitId,referenceNumber:'RACE-'+randomUUID(),subject:'License registration race'});
      assert.equal(created.status,201);const id=created.body.id;ids.push(id);
      const initial={mimeType:file.mimeType,base64:Buffer.from(file.content).toString('base64'),issuedAt:'2025-01-01',expiresAt:'2030-01-01'};
      assert.equal((await request('/'+id+'/attachment','PATCH',initial)).status,200);
      const before=await db.administrativeRecord.findUniqueOrThrow({where:{id}});
      const administrative=new AdministrativeAffairsPersistenceService(db);
      const canonicalRegister=administrative.registerRecord.bind(administrative);
      const service=new CenterLicenseService(db,new AuditService(db),administrative);
      let interleavings=0;
      const revise=async()=>{
        interleavings++;
        const changed=scenario.startsWith('attachment')?{...initial,mimeType:'application/pdf',base64:replacement}:{...initial,expiresAt:'2031-01-01'};
        assert.equal((await request('/'+id+'/attachment','PATCH',changed)).status,200);
        // Exercise equal timestamp precision as well: attachment/date predicates
        // must still reject a changed draft when updatedAt happens to match.
        await db.administrativeRecord.update({where:{id},data:{updatedAt:before.updatedAt}});
      };
      if(scenario.startsWith('attachment'))administrative.registerRecord=async(...args)=>{await revise();return canonicalRegister(...args);};
      else db.$transaction=async(...args)=>{await revise();return originalTransaction(...args);};
      try{
        await assert.rejects(()=>service.register(ownerA.id,a.org.id,id),error=>error.getStatus?.()===409&&error.message==='ADMIN_RECORD_CONCURRENT_MODIFICATION');
        check(interleavings===1,scenario+': committed edit rejects stale registration');
      }finally{db.$transaction=originalTransaction;administrative.registerRecord=canonicalRegister;}
      const after=await db.administrativeRecord.findUniqueOrThrow({where:{id}});
      check(after.status==='DRAFT',scenario+': failed registration leaves draft editable');
      check(scenario.startsWith('attachment')?after.licenseAssetId!==before.licenseAssetId:after.licenseExpiresAt.toISOString().startsWith('2031-01-01'),scenario+': concurrent edit is preserved');
      check(await db.auditEvent.count({where:{resourceId:id,action:'ADMIN_RECORD_REGISTERED'}})===0,scenario+': rejected registration creates no audit success');
      check((await request('/'+id+'/register','PATCH',{})).status===200,scenario+': fresh HTTP registration succeeds');
      check(await db.auditEvent.count({where:{resourceId:id,action:'ADMIN_RECORD_REGISTERED'}})===1,scenario+': exactly one canonical registration audit');
    }
  }finally{
    db.$transaction=originalTransaction;
    await db.auditEvent.deleteMany({where:{resourceId:{in:ids}}});
    await db.administrativeRecord.deleteMany({where:{id:{in:ids}}});
    await db.$disconnect();
  }
}
