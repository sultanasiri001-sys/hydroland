import assert from 'node:assert/strict';
import {DocumentAuthorizationService} from '../dist/document-forms/document-authorization.service.js';

// New internal-owner boundary only. No database, employee or policy mutation.
let owner='owner',active=true,admin=true,explicit=null;
const organization={id:'internal',displayName:'Internal fixture',kind:'HYDROLAND_INTERNAL_PLATFORM',status:'ACTIVE'};
const db={
 operationalSetting:{findUnique:async()=>({value:{organizationId:'internal'}})},
 organization:{findUnique:async()=>({...organization,ownerId:owner}),findUniqueOrThrow:async()=>organization},
 account:{findFirst:async({where})=>where.id==='owner'&&active&&admin?{id:'owner'}:null},
 organizationMember:{findUnique:async()=>explicit,findMany:async()=>[]},
 serializable:async work=>work(db),
};
const service=new DocumentAuthorizationService(db);
assert.equal((await service.assert('owner','internal','TEMPLATE_CREATE')).accessBasis,'PLATFORM_OWNER');
assert.equal((await service.workspaces('owner'))[0].organization.id,'internal');
assert.deepEqual(await service.workspaces('another-admin'),[]);
for(const change of [()=>{owner='another-owner';},()=>{admin=false;},()=>{active=false;},()=>{organization.status='SUSPENDED';},()=>{explicit={role:'OWNER',status:'SUSPENDED'};}]){
 owner='owner';admin=true;active=true;organization.status='ACTIVE';explicit=null;change();
 await assert.rejects(()=>service.assert('owner','internal','DOCUMENT_READ'),error=>error.getStatus?.()===403);
}
console.log('Internal document owner checks passed: no-membership owner discovery, other-admin privacy, ownership/admin/account/organization loss and explicit suspension.');
