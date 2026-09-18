export type InventoryItemStatus = 'ACTIVE' | 'QUARANTINED' | 'RETIRED';
export type InventoryLocationType = 'WAREHOUSE' | 'CENTER' | 'VESSEL' | 'FIELD';

export interface InventoryLocation {
  id: string;
  organizationId: string;
  centerId?: string;
  name: string;
  type: InventoryLocationType;
  active: boolean;
}

export interface InventoryItem {
  id: string;
  organizationId: string;
  sku: string;
  name: string;
  category: string;
  status: InventoryItemStatus;
  serialized: boolean;
  qrCode?: string;
}

export interface InventoryAsset {
  id: string;
  itemId: string;
  serialNumber?: string;
  locationId: string;
  ownerOrganizationId: string;
  assignedCenterId?: string;
  active: boolean;
}

export interface StockBalance {
  itemId: string;
  locationId: string;
  onHand: number;
  reserved: number;
  available: number;
}

export const calculateAvailableStock = (onHand: number, reserved: number): number => {
  if (!Number.isFinite(onHand) || !Number.isFinite(reserved) || onHand < 0 || reserved < 0 || reserved > onHand) {
    throw new Error('Invalid stock balance.');
  }
  return onHand - reserved;
};
