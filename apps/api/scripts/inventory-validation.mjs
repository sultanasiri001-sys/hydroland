import assert from 'node:assert/strict';
import { InventoryFoundationService } from '../src/inventory/inventory-foundation.service';
import { InventoryWorkflowService } from '../src/inventory/inventory-workflow.service';
import { InventoryOperationsService } from '../src/inventory/inventory-operations.service';
import { InventoryGovernanceService } from '../src/inventory/inventory-governance.service';

const foundation = new InventoryFoundationService();
const workflow = new InventoryWorkflowService();
const operations = new InventoryOperationsService(workflow);
const governance = new InventoryGovernanceService();

const item = foundation.validateItem({ id:'item-1', organizationId:'org-1', sku:'REG-001', name:'Regulator', category:'DIVE_GEAR', status:'ACTIVE', serialized:true, qrCode:'QR-001' });
const location = foundation.validateLocation({ id:'wh-1', organizationId:'org-1', name:'Main Warehouse', type:'WAREHOUSE', active:true });
foundation.validateAsset({ id:'asset-1', itemId:item.id, serialNumber:'SN-001', locationId:location.id, ownerOrganizationId:'org-1', active:true }, item, location);

let balance = foundation.stockBalance(item.id, location.id, 10, 0);
let request = { id:'req-1', itemId:item.id, sourceLocationId:location.id, quantity:3, status:'REQUESTED', requestedBy:'user-1' };
request = workflow.approve(request, 'approver-1');
balance = operations.reserveForOperation(request, balance, { itemId:item.id, locationId:location.id, requiredQuantity:3, purpose:'TRIP', referenceId:'trip-1' });
assert.equal(balance.available, 7);
balance = workflow.fulfillIssue(request, balance);
assert.deepEqual({onHand:balance.onHand,reserved:balance.reserved,available:balance.available},{onHand:7,reserved:0,available:7});

assert.equal(operations.readiness([{ itemId:item.id, locationId:location.id, requiredQuantity:8, purpose:'TRIP', referenceId:'trip-2' }],[balance]).ready,false);
assert.throws(()=>workflow.validateTransfer({...request,sourceLocationId:'wh-1',destinationLocationId:'wh-1'}));
assert.throws(()=>foundation.stockBalance(item.id,location.id,1,2));
assert.throws(()=>foundation.validateItem({...item,id:'item-2',qrCode:undefined}));

const snapshot=governance.snapshot([item],[foundation.stockBalance(item.id,location.id,2,0)],2,'2026-09-23T00:00:00.000Z');
assert.deepEqual(snapshot.lowStockItems,[item.id]);
assert.ok(governance.automationSignals(snapshot).includes('REVIEW_REORDER_LEVELS'));
console.log('Inventory validation passed.');
