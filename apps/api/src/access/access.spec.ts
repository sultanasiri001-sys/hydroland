import { canAccess, AccessContext } from './access.types';

const base: AccessContext={accountId:'a1',roleKeys:['CENTER_MANAGER'],permissions:['organization.read'],scopeType:'CENTER',scopeIds:['center-a'],active:true};

function assert(v:boolean,message:string){if(!v) throw new Error(message);}

assert(canAccess(base,'organization.read','center-a'),'same center must be allowed');
assert(!canAccess(base,'organization.read','center-b'),'cross-center access must be denied');
assert(!canAccess(base,'organization.manage','center-a'),'missing permission must be denied');
assert(!canAccess({...base,active:false},'organization.read','center-a'),'inactive context must be denied');
assert(canAccess({...base,scopeType:'GLOBAL'},'organization.read','center-b'),'global scope must be allowed');
