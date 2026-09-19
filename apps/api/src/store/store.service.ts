import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class StoreService {
  constructor(private readonly prisma: DatabaseService) {}

  listProducts() {
    return this.prisma.storeProduct.findMany({ where: { status: 'ACTIVE' }, orderBy: { nameAr: 'asc' } });
  }


  private validateProductInput(input: { sku?: string; nameAr?: string; priceMinor?: number; currency?: string; stockQuantity?: number; status?: string }, creating = false) {
    if (creating && (!input.sku?.trim() || !input.nameAr?.trim())) throw new BadRequestException('SKU and Arabic name are required');
    if (input.priceMinor !== undefined && (!Number.isInteger(input.priceMinor) || input.priceMinor < 0)) throw new BadRequestException('Invalid product price');
    if (input.stockQuantity !== undefined && (!Number.isInteger(input.stockQuantity) || input.stockQuantity < 0)) throw new BadRequestException('Invalid stock quantity');
    if (input.currency !== undefined && !/^[A-Z]{3}$/.test(input.currency)) throw new BadRequestException('Invalid currency');
    if (input.status !== undefined && !['DRAFT','ACTIVE','INACTIVE'].includes(input.status)) throw new BadRequestException('Invalid product status');
  }

  listAdminProducts() {
    return this.prisma.storeProduct.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async createProduct(input: { sku:string; nameAr:string; nameEn?:string; description?:string; priceMinor:number; currency?:string; stockQuantity:number; status?:'DRAFT'|'ACTIVE'|'INACTIVE' }) {
    this.validateProductInput(input, true);
    const existing=await this.prisma.storeProduct.findUnique({where:{sku:input.sku.trim()}});
    if(existing)throw new BadRequestException('SKU already exists');
    return this.prisma.storeProduct.create({data:{sku:input.sku.trim(),nameAr:input.nameAr.trim(),nameEn:input.nameEn?.trim()||null,description:input.description?.trim()||null,priceMinor:input.priceMinor,currency:input.currency||'SAR',stockQuantity:input.stockQuantity,status:input.status||'DRAFT'}});
  }

  async updateProduct(productId:string,input:{sku?:string;nameAr?:string;nameEn?:string;description?:string;priceMinor?:number;currency?:string;stockQuantity?:number;status?:'DRAFT'|'ACTIVE'|'INACTIVE'}) {
    this.validateProductInput(input);
    const current=await this.prisma.storeProduct.findUnique({where:{id:productId}});
    if(!current)throw new NotFoundException('Product not found');
    if(input.sku!==undefined&&!input.sku.trim())throw new BadRequestException('SKU cannot be empty');
    if(input.nameAr!==undefined&&!input.nameAr.trim())throw new BadRequestException('Arabic name cannot be empty');
    if(input.sku&&input.sku.trim()!==current.sku){const duplicate=await this.prisma.storeProduct.findUnique({where:{sku:input.sku.trim()}});if(duplicate)throw new BadRequestException('SKU already exists')}
    return this.prisma.storeProduct.update({where:{id:productId},data:{...(input.sku!==undefined?{sku:input.sku.trim()}:{}),...(input.nameAr!==undefined?{nameAr:input.nameAr.trim()}:{}),...(input.nameEn!==undefined?{nameEn:input.nameEn.trim()||null}:{}),...(input.description!==undefined?{description:input.description.trim()||null}:{}),...(input.priceMinor!==undefined?{priceMinor:input.priceMinor}:{}),...(input.currency!==undefined?{currency:input.currency}:{}),...(input.stockQuantity!==undefined?{stockQuantity:input.stockQuantity}:{}),...(input.status!==undefined?{status:input.status}:{})}});
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
