// Called by the disposable authenticated HTTP suites after their loopback checks.
const assert = require('node:assert/strict');
module.exports = async function refundGrants(db, grants, owner, organizationId, approver, executor) {
  assert.equal(process.env.NODE_ENV,'test');
  assert.ok(['localhost','127.0.0.1','[::1]'].includes(new URL(process.env.DATABASE_URL).hostname));
  process.env.D12_OWNER_EMAIL=owner.email;
  await db.roleAssignment.upsert({where:{accountId_role:{accountId:owner.id,role:'ADMIN'}},create:{accountId:owner.id,role:'ADMIN',status:'ACTIVE'},update:{status:'ACTIVE'}});
  const platform=await db.organization.create({data:{ownerId:owner.id,kind:'HYDROLAND_INTERNAL_PLATFORM',status:'ACTIVE',displayName:'Synthetic refund authorizer'}});
  const key='PLATFORM_STAFFING_ORGANIZATION:v1';
  await db.operationalSetting.upsert({where:{key},create:{key,value:{organizationId:platform.id}},update:{value:{organizationId:platform.id}}});
  for(const [delegate,operation] of [[approver,'APPROVE_REFUND'],[executor,'EXECUTE_REFUND']]){
    await grants.create(owner.id,{accountId:delegate.id,organizationId,operation,currency:'SAR',limitMinor:100000,
      validFrom:new Date(Date.now()-60000).toISOString(),validUntil:new Date(Date.now()+3600000).toISOString()});
  }
};
