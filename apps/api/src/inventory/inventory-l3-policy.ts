export type InventoryTransferInput={fromLocation?:string|null;toLocation?:string|null;stockStatus:string;assignedAccountId?:string|null};

export function assertTransferChain(input:InventoryTransferInput){
  const from=input.fromLocation?.trim()||null;
  const to=input.toLocation?.trim()||null;
  if(!from)throw new Error('INVENTORY_TRANSFER_SOURCE_REQUIRED');
  if(!to)throw new Error('INVENTORY_TRANSFER_DESTINATION_REQUIRED');
  if(from===to)throw new Error('INVENTORY_TRANSFER_SAME_LOCATION');
  if(input.stockStatus==='RETIRED')throw new Error('INVENTORY_TRANSFER_RETIRED_BLOCK');
  if(input.stockStatus==='CHECKED_OUT'&&!input.assignedAccountId)throw new Error('INVENTORY_TRANSFER_CUSTODY_REQUIRED');
  return true;
}

export type InventoryAdjustmentInput={reason?:string|null;requestedBy:string;approvedBy?:string|null;movementType:'CHECK_IN'|'CHECK_OUT'|'TRANSFER'|'MAINTENANCE'|'QUARANTINE'|'RELEASE'|'RETIRE'};

export function assertCompensatingAdjustment(input:InventoryAdjustmentInput){
  const reason=input.reason?.trim()||'';
  if(reason.length<10)throw new Error('INVENTORY_ADJUSTMENT_REASON_REQUIRED');
  if(!input.approvedBy)throw new Error('INVENTORY_ADJUSTMENT_APPROVAL_REQUIRED');
  if(input.requestedBy===input.approvedBy)throw new Error('INVENTORY_ADJUSTMENT_SOD_VIOLATION');
  return true;
}
