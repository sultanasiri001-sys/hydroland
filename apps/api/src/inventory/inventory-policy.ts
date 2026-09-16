export type InventoryActor={accountId:string;role:'CENTER_MANAGER'|'INVENTORY'|'PROCUREMENT'|'SAFETY'|'FINANCE'|'EXECUTIVE'|'SYSTEM';centerId?:string};

export type EquipmentAllocationReadiness={
  active:boolean;
  stockStatus:string;
  reserved:boolean;
  inspectionStatus?:'PASS'|'REVIEW'|'FAIL'|null;
  serviceExpiresAt?:Date|null;
  complianceBlocked?:boolean;
};

export function assertInventoryScope(actor:InventoryActor,targetCenterId?:string|null){
  if(actor.role==='CENTER_MANAGER'&&(!actor.centerId||!targetCenterId||actor.centerId!==targetCenterId))throw new Error('INVENTORY_CENTER_SCOPE_DENIED');
  return true;
}

export function assertEquipmentAllocatable(readiness:EquipmentAllocationReadiness,now=new Date()){
  if(!readiness.active)throw new Error('INVENTORY_EQUIPMENT_INACTIVE');
  if(['RETIRED','QUARANTINED','LOST','DAMAGED','MAINTENANCE','RECALLED'].includes(readiness.stockStatus))throw new Error('INVENTORY_STOCK_BLOCK');
  if(readiness.reserved)throw new Error('INVENTORY_ALREADY_RESERVED');
  if(readiness.inspectionStatus!=='PASS')throw new Error('INVENTORY_INSPECTION_BLOCK');
  if(!readiness.serviceExpiresAt||readiness.serviceExpiresAt<=now)throw new Error('INVENTORY_SERVICE_EXPIRY_BLOCK');
  if(readiness.complianceBlocked)throw new Error('INVENTORY_COMPLIANCE_BLOCK');
  return true;
}

export function assertProcurementSegregation(requestedBy:string,approvedBy?:string|null,receivedBy?:string|null,settledBy?:string|null){
  const actors=[requestedBy,approvedBy,receivedBy,settledBy].filter((value):value is string=>Boolean(value));
  if(new Set(actors).size!==actors.length)throw new Error('INVENTORY_PROCUREMENT_SOD_VIOLATION');
  return true;
}
