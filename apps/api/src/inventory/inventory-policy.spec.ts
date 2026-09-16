import { assertEquipmentAllocatable, assertInventoryScope, assertProcurementSegregation } from './inventory-policy';

function expectThrow(fn:()=>unknown,code:string){let actual='';try{fn();}catch(error){actual=error instanceof Error?error.message:String(error);}if(actual!==code)throw new Error(`Expected ${code}, got ${actual||'NO_ERROR'}`);}
function expectPass(fn:()=>unknown){fn();}

const future=new Date('2030-01-01T00:00:00.000Z');
const now=new Date('2026-09-16T00:00:00.000Z');
const ready={active:true,stockStatus:'AVAILABLE',reserved:false,inspectionStatus:'PASS' as const,serviceExpiresAt:future,complianceBlocked:false};

expectPass(()=>assertEquipmentAllocatable(ready,now));
expectThrow(()=>assertEquipmentAllocatable({...ready,active:false},now),'INVENTORY_EQUIPMENT_INACTIVE');
for(const stockStatus of ['RETIRED','QUARANTINED','LOST','DAMAGED','MAINTENANCE','RECALLED'])expectThrow(()=>assertEquipmentAllocatable({...ready,stockStatus},now),'INVENTORY_STOCK_BLOCK');
expectThrow(()=>assertEquipmentAllocatable({...ready,reserved:true},now),'INVENTORY_ALREADY_RESERVED');
expectThrow(()=>assertEquipmentAllocatable({...ready,inspectionStatus:'FAIL'},now),'INVENTORY_INSPECTION_BLOCK');
expectThrow(()=>assertEquipmentAllocatable({...ready,inspectionStatus:'REVIEW'},now),'INVENTORY_INSPECTION_BLOCK');
expectThrow(()=>assertEquipmentAllocatable({...ready,inspectionStatus:null},now),'INVENTORY_INSPECTION_BLOCK');
expectThrow(()=>assertEquipmentAllocatable({...ready,serviceExpiresAt:null},now),'INVENTORY_SERVICE_EXPIRY_BLOCK');
expectThrow(()=>assertEquipmentAllocatable({...ready,serviceExpiresAt:new Date('2026-09-15T00:00:00.000Z')},now),'INVENTORY_SERVICE_EXPIRY_BLOCK');
expectThrow(()=>assertEquipmentAllocatable({...ready,complianceBlocked:true},now),'INVENTORY_COMPLIANCE_BLOCK');

expectPass(()=>assertInventoryScope({accountId:'manager-a',role:'CENTER_MANAGER',centerId:'center-a'},'center-a'));
expectThrow(()=>assertInventoryScope({accountId:'manager-a',role:'CENTER_MANAGER',centerId:'center-a'},'center-b'),'INVENTORY_CENTER_SCOPE_DENIED');
expectPass(()=>assertInventoryScope({accountId:'inventory-a',role:'INVENTORY'},'center-b'));

expectPass(()=>assertProcurementSegregation('maker','approver','receiver','finance'));
expectThrow(()=>assertProcurementSegregation('maker','maker','receiver','finance'),'INVENTORY_PROCUREMENT_SOD_VIOLATION');
expectThrow(()=>assertProcurementSegregation('maker','approver','maker','finance'),'INVENTORY_PROCUREMENT_SOD_VIOLATION');
expectThrow(()=>assertProcurementSegregation('maker','approver','receiver','maker'),'INVENTORY_PROCUREMENT_SOD_VIOLATION');

console.log('Inventory L2 policy assertions passed.');
