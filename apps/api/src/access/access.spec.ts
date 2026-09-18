import { strict as assert } from 'assert';
import { AccessContext, canAccess } from './access.types';
const base:AccessContext={accountId:'a1',grants:[{roleKey:'CENTER_MANAGER',permission:'organization.read',scopeType:'CENTER',scopeId:'center-a'}],active:true};
assert(canAccess(base,'organization.read','center-a'),'same center must be allowed');
assert(!canAccess(base,'organization.read','center-b'),'cross-center must be denied');
assert(!canAccess(base,'account.manage','center-a'),'missing permission must be denied');
assert(!canAccess({...base,active:false},'organization.read','center-a'),'inactive context must be denied');
const global:AccessContext={accountId:'a1',grants:[{roleKey:'ADMIN',permission:'organization.read',scopeType:'GLOBAL',scopeId:null}],active:true};
assert(canAccess(global,'organization.read','center-b'),'global grant must be allowed');
const split:AccessContext={accountId:'a1',grants:[
 {roleKey:'R1',permission:'organization.read',scopeType:'CENTER',scopeId:'center-a'},
 {roleKey:'R2',permission:'account.manage',scopeType:'CENTER',scopeId:'center-b'}
],active:true};
assert(!canAccess(split,'organization.read','center-b'),'permission from one grant must not leak into another scope');
assert(!canAccess(split,'account.manage','center-a'),'scope from one grant must not leak into another permission');
console.log('access tests passed');
