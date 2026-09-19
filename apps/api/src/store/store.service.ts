import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class StoreService {
  constructor(private readonly prisma: DatabaseService) {}

  listProducts() {
    return this.prisma.storeProduct.findMany({ where: { status: 'ACTIVE' }, orderBy: { nameAr: 'asc' } });
  }

  async createOrder(accountId: string, items: { productId: string; quantity: number }[]) {
    if (!items?.length) throw new BadRequestException('Order requires items');

    const quantities = new Map<string, number>();
    for (const item of items) {
      if (!item?.productId || !Number.isInteger(item.quantity) || item.quantity < 1) {
        throw new BadRequestException('Invalid order item');
      }
      quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
    }
    const normalizedItems = [...quantities].map(([productId, quantity]) => ({ productId, quantity }));

    return this.prisma.serializable(async (tx) => {
      const products = await tx.storeProduct.findMany({
        where: { id: { in: normalizedItems.map((item) => item.productId) }, status: 'ACTIVE' },
      });
      const productMap = new Map(products.map((product) => [product.id, product]));

      let totalMinor = 0;
      for (const item of normalizedItems) {
        const product = productMap.get(item.productId);
        if (!product) throw new NotFoundException('Product unavailable');
        totalMinor += product.priceMinor * item.quantity;
      }

      for (const item of normalizedItems) {
        const updated = await tx.storeProduct.updateMany({
          where: { id: item.productId, status: 'ACTIVE', stockQuantity: { gte: item.quantity } },
          data: { stockQuantity: { decrement: item.quantity } },
        });
        if (updated.count !== 1) throw new BadRequestException('Insufficient stock');
      }

      return tx.storeOrder.create({
        data: {
          accountId,
          totalMinor,
          items: {
            create: normalizedItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPriceMinor: productMap.get(item.productId)!.priceMinor,
            })),
          },
        },
        include: { items: true },
      });
    });
  }

  listMine(accountId: string) {
    return this.prisma.storeOrder.findMany({
      where: { accountId },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
