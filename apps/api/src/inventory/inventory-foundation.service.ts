import { BadRequestException, Injectable } from '@nestjs/common';
import { InventoryAsset, InventoryItem, InventoryLocation, StockBalance, calculateAvailableStock } from './inventory.domain';

@Injectable()
export class InventoryFoundationService {
  validateItem(item: InventoryItem): InventoryItem {
    if (!item.id || !item.organizationId || !item.sku.trim() || !item.name.trim() || !item.category.trim()) {
      throw new BadRequestException('Inventory item identity is incomplete.');
    }
    if (item.serialized && !item.qrCode) throw new BadRequestException('Serialized inventory items require a QR code.');
    return item;
  }

  validateLocation(location: InventoryLocation): InventoryLocation {
    if (!location.id || !location.organizationId || !location.name.trim()) {
      throw new BadRequestException('Inventory location identity is incomplete.');
    }
    return location;
  }

  validateAsset(asset: InventoryAsset, item: InventoryItem, location: InventoryLocation): InventoryAsset {
    if (asset.itemId !== item.id) throw new BadRequestException('Asset item mismatch.');
    if (asset.locationId !== location.id) throw new BadRequestException('Asset location mismatch.');
    if (asset.ownerOrganizationId !== item.organizationId || location.organizationId !== item.organizationId) {
      throw new BadRequestException('Cross-organization inventory assignment is not allowed.');
    }
    if (item.serialized && !asset.serialNumber) throw new BadRequestException('Serialized inventory asset requires serial number.');
    return asset;
  }

  stockBalance(itemId: string, locationId: string, onHand: number, reserved: number): StockBalance {
    return { itemId, locationId, onHand, reserved, available: calculateAvailableStock(onHand, reserved) };
  }
}
