import assert from 'node:assert/strict';
export async function runCommunityCompletionChecks({db,base,accounts,tokens,policyFixture}){
  const [member,other,admin]=accounts,[memberToken,otherToken,adminToken]=tokens;let post,caseId;
  const call=async(token,method,path,body)=>{const r=await fetch(base+'/community/'+path,{method,headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,body:await r.json()}};
  const ok=async(...args)=>{const r=await call(...args);assert.ok(r.status>=200&&r.status<300,JSON.stringify(r));return r.body};
  const publish=async p=>ok(adminToken,'PATCH','admin/posts/'+p.id+'/status',{status:'PUBLISHED',reviewNotes:'Isolated independent review'});
  try{
    post=await ok(memberToken,'POST','posts',{title:'Synthetic lifecycle post',body:'Original synthetic body'});
    assert.equal((await call(otherToken,'PATCH','posts/'+post.id,{title:'Stolen edit',body:'Not allowed',expectedUpdatedAt:post.updatedAt})).status,404);
    assert.equal((await call(memberToken,'PATCH','posts/'+post.id,{title:'Changed title',body:'Changed content',expectedUpdatedAt:'2000-01-01T00:00:00.000Z'})).status,409);
    post=await publish(post);const previous=post;
    post=await ok(memberToken,'PATCH','posts/'+post.id,{title:'Updated lifecycle post',body:'Revised synthetic content',expectedUpdatedAt:post.updatedAt});assert.equal(post.status,'PENDING_REVIEW');assert.equal(post.reviewedByAccountId,null);assert.equal(post.publishedAt,null);
    assert.ok(!(await ok(null,'GET','posts')).some(p=>p.id===post.id));
    assert.equal((await db.$queryRaw`SELECT * FROM "CommunityPostRevision" WHERE "postId"=${post.id}`)[0].body,previous.body);
    post=await publish(post);
    const report=await ok(otherToken,'POST','posts/'+post.id+'/report',{reason:'Synthetic abusive content test'});caseId=report.caseId;assert.ok(caseId);assert.equal((await ok(otherToken,'POST','posts/'+post.id+'/report',{reason:'Same synthetic report'})).caseId,caseId);
    assert.equal((await call(memberToken,'GET','admin/reports')).status,403);
    await db.managedDocument.update({where:{id:policyFixture.doc.id},data:{status:'ARCHIVED'}});
    assert.equal((await ok(null,'GET','policy')).active,false);assert.equal((await call(memberToken,'POST','posts',{title:'Blocked publication',body:'Must remain blocked'})).status,409);
    await ok(memberToken,'POST','posts/'+post.id+'/withdraw',{});assert.ok(!(await ok(memberToken,'GET','posts/mine')).some(p=>p.id===post.id));
    const life=(await db.$queryRaw`SELECT * FROM "CommunityPostLifecycle" WHERE "postId"=${post.id}`)[0];assert.equal(life.policyDocumentId,policyFixture.doc.id);assert.equal(life.retentionDays,30);assert.ok(life.purgeAfter);
    await db.managedDocument.update({where:{id:policyFixture.doc.id},data:{status:'APPROVED'}});
    assert.equal((await call(adminToken,'PATCH','admin/posts/'+post.id+'/status',{status:'PUBLISHED'})).status,409);
    assert.ok(!(await ok(adminToken,'GET','admin/posts')).some(p=>p.id===post.id));
    await db.$executeRaw`UPDATE "CommunityPostLifecycle" SET "purgeAfter"=now()-interval '1 day' WHERE "postId"=${post.id}`;
    const preview=await ok(adminToken,'POST','admin/posts/purge',{confirm:false});assert.ok(!preview.due.includes(post.id));
    assert.equal((await call(adminToken,'POST','admin/reports/'+caseId+'/release',{})).status,409);
    await db.customerCase.update({where:{id:caseId},data:{status:'CLOSED'}});
    assert.equal((await ok(adminToken,'POST','admin/reports/'+caseId+'/release',{})).released,false);
    assert.equal((await call(adminToken,'POST','admin/reports/'+caseId+'/release',{})).status,409);
    // The second reviewer is explicitly assigned to the already closed case.
    // Releasing evidence never grants community publication authority.
    const role=await db.roleAssignment.create({data:{accountId:other.id,role:'ADMIN',status:'ACTIVE',activeAt:new Date()}});
    await db.customerCase.update({where:{id:caseId},data:{assignedAccountId:other.id}});
    await db.managedDocument.update({where:{id:policyFixture.doc.id},data:{status:'ARCHIVED'}});
    try{assert.equal((await ok(otherToken,'POST','admin/reports/'+caseId+'/release',{})).released,true)}finally{await db.roleAssignment.delete({where:{id:role.id}})}
    const due=await ok(adminToken,'POST','admin/posts/purge',{confirm:false});assert.ok(due.due.includes(post.id));assert.ok(await db.communityPost.findUnique({where:{id:post.id}}));
    assert.equal((await ok(adminToken,'POST','admin/posts/purge',{confirm:true})).purged,1);assert.equal(await db.communityPost.findUnique({where:{id:post.id}}),null);assert.equal((await db.$queryRaw`SELECT * FROM "CommunityPostRevision" WHERE "postId"=${post.id}`).length,0);
    await db.managedDocument.update({where:{id:policyFixture.doc.id},data:{status:'APPROVED'}});
    console.log('B14 completion HTTP/PostgreSQL passed: author edit, stale revision, renewed moderation, source suspension, policy-bound withdrawal, private case report, hold protection, independent release and explicit retention purge.');
  }finally{
    if(caseId){await db.$executeRaw`DELETE FROM "CommunityPostReport" WHERE "caseId"=${caseId}`;await db.customerCase.delete({where:{id:caseId}})}
    if(post){await db.$executeRaw`DELETE FROM "CommunityPostRevision" WHERE "postId"=${post.id}`;await db.$executeRaw`DELETE FROM "CommunityPostLifecycle" WHERE "postId"=${post.id}`;await db.communityPost.deleteMany({where:{id:post.id}})}
  }
}
