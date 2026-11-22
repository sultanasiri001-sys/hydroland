import { BadRequestException, Injectable } from '@nestjs/common';
import { StockBalance, calculateAvailableStock } from './inventory.domain';

export type InventoryMovementType = 'RECEIPT' | 'ISSUE' | 'TRANSFER' | 'ADJUSTMENT';
export type InventoryRequestStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'FULFILLED';

export interface InventoryRequest {
  id: string;
  itemId: string;
  sourceLocationId?: string;
  destinationLocationId?: string;
  quantity: number;
  status: InventoryRequestStatus;
  requestedBy: string;
  approvedBy?: string;
}

@Injectable()
export class InventoryWorkflowService {
  approve(request: InventoryRequest, approverId: string): InventoryRequest {
    if (request.status !== 'REQUESTED') throw new BadRequestException('Only requested inventory actions can be approved.');
    if (!approverId) throw new BadRequestException('Approver identity is required.');
    if (request.quantity <= 0) throw new BadRequestException('Inventory quantity must be positive.');
    return { ...request, status: 'APPROVED', approvedBy: approverId };
  }

  reserve(balance: StockBalance, quantity: number): StockBalance {
    if (quantity <= 0 || quantity > balance.available) throw new BadRequestException('Insufficient available stock.');
    const reserved = balance.reserved + quantity;
    return { ...balance, reserved, available: calculateAvailableStock(balance.onHand, reserved) };
  }

  fulfillIssue(request: InventoryRequest, balance: StockBalance): StockBalance {
    if (request.status !== 'APPROVED') throw new BadRequestException('Inventory issue requires approval.');
    if (request.itemId !== balance.itemId) throw new BadRequestException('Inventory item mismatch.');
    if (!request.id?.trim() || !request.approvedBy || !Number.isFinite(request.quantity) || request.quantity <= 0
      || (request.sourceLocationId && request.sourceLocationId !== balance.locationId)) {
      throw new BadRequestException('Invalid inventory issue identity, quantity or location.');
    }
    const previous = balance.fulfilledIssues?.find(issue => issue.requestId === request.id);
    if (previous) {
      if (previous.quantity !== request.quantity || previous.requestedBy !== request.requestedBy || previous.approvedBy !== request.approvedBy) {
        throw new BadRequestException('Previously fulfilled inventory request has different details.');
      }
      return balance;
    }
    if (request.quantity > balance.reserved || request.quantity > balance.onHand) throw new BadRequestException('Approved quantity is not reserved.');
    const onHand = balance.onHand - request.quantity;
    const reserved = balance.reserved - request.quantity;
    const issue = { requestId: request.id, quantity: request.quantity, requestedBy: request.requestedBy, approvedBy: request.approvedBy };
    return { ...balance, onHand, reserved, available: calculateAvailableStock(onHand, reserved), fulfilledIssues: [...(balance.fulfilledIssues ?? []), issue] };
  }

  validateTransfer(request: InventoryRequest): InventoryRequest {
    if (!request.sourceLocationId || !request.destinationLocationId) throw new BadRequestException('Transfer locations are required.');
    if (request.sourceLocationId === request.destinationLocationId) throw new BadRequestException('Transfer locations must differ.');
    return request;
  }
}
