import { assertCompensatingAdjustment, assertTransferChain } from './inventory-l3-policy';

function expectThrow(fn:()=>unknown,code:string){let actual='';try{fn();}catch(error){actual=error instanceof Error?error.message:String(error);}if(actual!==code)throw new Error(`Expected ${code}, got ${actual||'NO_ERROR'}`);}
function expectPass(fn:()=>unknown){fn();}

expectPass(()=>assertTransferChain({fromLocation:'WAREHOUSE-A',toLocation:'CENTER-B',stockStatus:'AVAILABLE'}));
expectPass(()=>assertTransferChain({fromLocation:'CENTER-A',toLocation:'CENTER-B',stockStatus:'CHECKED_OUT',assignedAccountId:'custodian'}));
expectThrow(()=>assertTransferChain({fromLocation:null,toLocation:'CENTER-B',stockStatus:'AVAILABLE'}),'INVENTORY_TRANSFER_SOURCE_REQUIRED');
expectThrow(()=>assertTransferChain({fromLocation:'CENTER-A',toLocation:null,stockStatus:'AVAILABLE'}),'INVENTORY_TRANSFER_DESTINATION_REQUIRED');
expectThrow(()=>assertTransferChain({fromLocation:'CENTER-A',toLocation:'CENTER-A',stockStatus:'AVAILABLE'}),'INVENTORY_TRANSFER_SAME_LOCATION');
expectThrow(()=>assertTransferChain({fromLocation:'CENTER-A',toLocation:'CENTER-B',stockStatus:'RETIRED'}),'INVENTORY_TRANSFER_RETIRED_BLOCK');
expectThrow(()=>assertTransferChain({fromLocation:'CENTER-A',toLocation:'CENTER-B',stockStatus:'CHECKED_OUT'}),'INVENTORY_TRANSFER_CUSTODY_REQUIRED');

expectPass(()=>assertCompensatingAdjustment({reason:'Stocktake correction for verified discrepancy',requestedBy:'maker',approvedBy:'approver',movementType:'CHECK_IN'}));
expectThrow(()=>assertCompensatingAdjustment({reason:'short',requestedBy:'maker',approvedBy:'approver',movementType:'CHECK_IN'}),'INVENTORY_ADJUSTMENT_REASON_REQUIRED');
expectThrow(()=>assertCompensatingAdjustment({reason:'Verified stocktake discrepancy',requestedBy:'maker',movementType:'CHECK_IN'}),'INVENTORY_ADJUSTMENT_APPROVAL_REQUIRED');
expectThrow(()=>assertCompensatingAdjustment({reason:'Verified stocktake discrepancy',requestedBy:'maker',approvedBy:'maker',movementType:'CHECK_IN'}),'INVENTORY_ADJUSTMENT_SOD_VIOLATION');

console.log('Inventory L3 policy assertions passed.');
