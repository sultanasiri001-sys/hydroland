import assert from 'node:assert/strict';
import {DatabaseService} from '../dist/database/database.service.js';
import {DocumentAuthorizationService} from '../dist/document-forms/document-authorization.service.js';
import {DocumentPersistenceService} from '../dist/document-forms/document-persistence.service.js';

// Deterministic service/PostgreSQL interleaving alongside the HTTP lifecycle
// suite. Revision is committed by the running HTTP API before submit's
// transaction begins, avoiding a timing-dependent parallel-request test.
export async function checkDocumentTransitionRace({base,call,creatorToken,creatorId,body}){
  const loopback=host=>['localhost','127.0.0.1','[::1]'].includes(host);
  if(process.env.CI!=='true'||!loopback(new URL(base).hostname)||!loopback(new URL(process.env.DATABASE_URL).hostname))throw new Error('Document race fixtures require CI and loopback API/PostgreSQL');
  const db=new DatabaseService();
  let id;
  try{
    const created=await call('/documents','POST',creatorToken,{...body,contentHash:'race-v1',payload:{summary:'original'}});
    assert.equal(created.status,201);id=(await created.json()).id;
    const before=await db.managedDocument.findUniqueOrThrow({where:{id}});
    const service=new DocumentPersistenceService(db,new DocumentAuthorizationService(db));
    const serializable=db.serializable.bind(db);
    let interleavings=0;
    db.serializable=async work=>{
      interleavings++;
      const revised=await call(`/documents/${id}/revise`,'POST',creatorToken,{contentHash:'race-v2',payload:{summary:'changed before submit transaction'}});
      assert.equal(revised.status,201);
      assert.equal((await revised.json()).version,2);
      return serializable(work);
    };
    await assert.rejects(()=>service.transition(creatorId,id,'PENDING_APPROVAL'),error=>error.getStatus?.()===400&&/version changed concurrently/.test(error.message));
    db.serializable=serializable;
    assert.equal(interleavings,1);
    const after=await db.managedDocument.findUniqueOrThrow({where:{id}});
    assert.equal(after.status,'DRAFT');
    assert.equal(after.version,2);
    assert.equal(after.contentHash,'race-v2');
    assert.equal(after.referenceNumber,before.referenceNumber);
    assert.equal(after.approvedByAccountId,null);
    assert.equal(after.signedByAccountId,null);
    assert.equal(await db.documentRevision.count({where:{documentId:id}}),2);
    assert.equal(await db.documentLifecycleEvent.count({where:{documentId:id}}),2);
    assert.equal(await db.documentLifecycleEvent.count({where:{documentId:id,action:'PENDING_APPROVAL'}}),0);
    const retry=await call(`/documents/${id}/submit`,'POST',creatorToken);
    assert.equal(retry.status,201);
    assert.equal((await retry.json()).version,2);
    const events=await db.documentLifecycleEvent.findMany({where:{documentId:id,action:'PENDING_APPROVAL'}});
    assert.equal(events.length,1);
    assert.equal(events[0].version,2);
    console.log('Document transition race PostgreSQL check passed: committed concurrent revision rejects stale submit without transition event; fresh HTTP submit succeeds on version 2.');
  }finally{
    if(id){
      await db.documentLifecycleEvent.deleteMany({where:{documentId:id}});
      await db.documentRevision.deleteMany({where:{documentId:id}});
      await db.managedDocument.delete({where:{id}});
    }
    await db.$disconnect();
  }
}
