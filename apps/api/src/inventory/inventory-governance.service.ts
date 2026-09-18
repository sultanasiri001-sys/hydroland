import { Injectable } from '@nestjs/common';
import { InventoryItem, StockBalance } from './inventory.domain';

export interface InventoryGovernanceSnapshot {
  totalItems: number;
  locationsTracked: number;
  totalOnHand: number;
  totalReserved: number;
  lowStockItems: string[];
  stockoutItems: string[];
  alerts: string[];
  generatedAt: string;
}

@Injectable()
export class InventoryGovernanceService {
  snapshot(items: InventoryItem[], balances: StockBalance[], lowStockThreshold = 2, at = new Date().toISOString()): InventoryGovernanceSnapshot {
    const activeItemIds = new Set(items.filter((item) => item.status === 'ACTIVE').map((item) => item.id));
    const activeBalances = balances.filter((balance) => activeItemIds.has(balance.itemId));
    const lowStockItems = [...new Set(activeBalances.filter((balance) => balance.available > 0 && balance.available <= lowStockThreshold).map((balance) => balance.itemId))];
    const stockoutItems = [...new Set(activeBalances.filter((balance) => balance.available === 0).map((balance) => balance.itemId))];
    const alerts: string[] = [];
    if (stockoutItems.length) alerts.push('STOCKOUT_DETECTED');
    if (lowStockItems.length) alerts.push('LOW_STOCK_DETECTED');
    if (activeBalances.some((balance) => balance.reserved > balance.onHand)) alerts.push('INVALID_RESERVATION_STATE');

    return {
      totalItems: activeItemIds.size,
      locationsTracked: new Set(activeBalances.map((balance) => balance.locationId)).size,
      totalOnHand: activeBalances.reduce((sum, balance) => sum + balance.onHand, 0),
      totalReserved: activeBalances.reduce((sum, balance) => sum + balance.reserved, 0),
      lowStockItems,
      stockoutItems,
      alerts,
      generatedAt: at,
    };
  }

  automationSignals(snapshot: InventoryGovernanceSnapshot): string[] {
    const signals: string[] = [];
    if (snapshot.stockoutItems.length) signals.push('CREATE_REPLENISHMENT_REQUEST');
    if (snapshot.lowStockItems.length) signals.push('REVIEW_REORDER_LEVELS');
    if (snapshot.alerts.includes('INVALID_RESERVATION_STATE')) signals.push('REQUIRE_INVENTORY_RECONCILIATION');
    return signals;
  }
}
