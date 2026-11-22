import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

interface Receipt {
  organizationId: string;
  lineId: string;
  receiptId: string;
  locationId: string;
  receivedBy: string;
  quantity: number;
}

// Internal posting operation for a previously authorized receipt against a persisted approved line.
@Injectable()
export class WarehouseReceivingService {
  constructor(private readonly db: DatabaseService) {}

  async receive(receipt: Receipt) {
    const { organizationId, lineId, receiptId, locationId, receivedBy, quantity } = receipt;
    const references = [organizationId, lineId, receiptId, locationId, receivedBy];
    if (references.some(value => typeof value !== 'string' || !value || value !== value.trim() || value.length > 150) ||
      !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 2147483647) {
      throw new BadRequestException('Invalid warehouse receipt.');
    }
    return this.db.serializable(async tx => {
      const key = { organizationId_receiptId: { organizationId, receiptId } };
      const previous = await tx.warehousePurchaseReceipt.findUnique({ where: key, include: { lot: true } });
      if (previous) {
        if (previous.lineId !== lineId || previous.receivedBy !== receivedBy ||
          previous.lot.locationId !== locationId || previous.lot.received !== quantity) {
          throw new ConflictException('The receipt reference has different details.');
        }
        return previous;
      }
      const line = await tx.warehousePurchaseLine.findUnique({ where: { organizationId_lineId: { organizationId, lineId } } });
      if (!line) throw new NotFoundException('Purchase line unavailable.');
      if (quantity > line.quantity - line.received) throw new ConflictException('Receipt exceeds the outstanding quantity.');
      await tx.warehousePurchaseLine.update({
        where: { organizationId_lineId: { organizationId, lineId } }, data: { received: { increment: quantity } },
      });
      await tx.warehouseStockLot.create({ data: {
        organizationId, lotId: receiptId, locationId, itemId: line.itemId, purchaseReference: line.purchaseReference,
        receiptReference: receiptId, unitCostMinor: line.unitCostMinor, received: quantity, onHand: quantity,
      } });
      return tx.warehousePurchaseReceipt.create({ data: { organizationId, receiptId, lineId, receivedBy }, include: { lot: true } });
    }).catch(error => {
      if (error?.code === 'P2002') throw new ConflictException('The receipt reference is already in use.');
      throw error;
    });
  }
}
