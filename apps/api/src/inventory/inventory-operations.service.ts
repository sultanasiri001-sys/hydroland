import { BadRequestException, Injectable } from '@nestjs/common';
import { StockBalance } from './inventory.domain';
import { InventoryRequest, InventoryWorkflowService } from './inventory-workflow.service';

export interface OperationalStockRequirement {
  itemId: string;
  locationId: string;
  requiredQuantity: number;
  purpose: 'TRIP' | 'TRAINING' | 'RENTAL' | 'MAINTENANCE' | 'CENTER_OPERATION';
  referenceId: string;
}

export interface OperationalStockReadiness {
  ready: boolean;
  blockers: string[];
}

@Injectable()
export class InventoryOperationsService {
  constructor(private readonly workflow: InventoryWorkflowService) {}

  readiness(requirements: OperationalStockRequirement[], balances: StockBalance[]): OperationalStockReadiness {
    const blockers: string[] = [];
    for (const requirement of requirements) {
      const balance = balances.find((candidate) => candidate.itemId === requirement.itemId && candidate.locationId === requirement.locationId);
      if (!balance) {
        blockers.push(`MISSING_STOCK_BALANCE:${requirement.itemId}:${requirement.locationId}`);
        continue;
      }
      if (requirement.requiredQuantity <= 0) blockers.push(`INVALID_REQUIRED_QUANTITY:${requirement.itemId}`);
      else if (balance.available < requirement.requiredQuantity) blockers.push(`INSUFFICIENT_STOCK:${requirement.itemId}`);
    }
    return { ready: blockers.length === 0, blockers };
  }

  reserveForOperation(request: InventoryRequest, balance: StockBalance, requirement: OperationalStockRequirement): StockBalance {
    if (request.itemId !== requirement.itemId || balance.itemId !== requirement.itemId) throw new BadRequestException('Operational stock item mismatch.');
    if (balance.locationId !== requirement.locationId) throw new BadRequestException('Operational stock location mismatch.');
    if (request.quantity !== requirement.requiredQuantity) throw new BadRequestException('Operational stock quantity mismatch.');
    if (!requirement.referenceId) throw new BadRequestException('Operational reference is required.');
    return this.workflow.reserve(balance, requirement.requiredQuantity);
  }
}
