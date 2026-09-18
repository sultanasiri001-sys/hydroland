import { requireOpaqueId } from './resource-id';
function assertThrows(fn:()=>unknown){let ok=false;try{fn();}catch{ok=true;}if(!ok)throw new Error('expected rejection');}
requireOpaqueId('550e8400-e29b-41d4-a716-446655440000');
assertThrows(()=>requireOpaqueId('1'));
assertThrows(()=>requireOpaqueId('../admin'));
