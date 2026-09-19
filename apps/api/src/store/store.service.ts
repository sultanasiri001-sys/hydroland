import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class StoreService {
  constructor(private readonly prisma: DatabaseService, private readonly audit: AuditService) {}

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

  async createPayment(accountId:string,orderId:string,idempotencyKey:string) {
    const key=idempotencyKey?.trim();
    if(!key)throw new BadRequestException('Idempotency key is required');
    const order=await this.prisma.storeOrder.findFirst({where:{id:orderId,accountId},include:{payment:true}});
    if(!order)throw new NotFoundException('Order not found');
    if(order.status==='CANCELLED'||order.status==='FULFILLED')throw new BadRequestException('Order is not eligible for payment');
    if(order.payment){
      if(order.payment.idempotencyKey!==key)throw new BadRequestException('Order already has a payment');
      return {...order.payment,provider:'NOT_SELECTED',financialActionExecuted:false};
    }
    const existing=await this.prisma.storePayment.findUnique({where:{idempotencyKey:key}});
    if(existing){
      if(existing.accountId!==accountId||existing.orderId!==orderId)throw new BadRequestException('Idempotency key cannot be reused');
      return {...existing,provider:'NOT_SELECTED',financialActionExecuted:false};
    }
    try {
      const payment=await this.prisma.storePayment.create({data:{orderId,accountId,amountMinor:order.totalMinor,currency:order.currency,idempotencyKey:key,status:'CREATED'}});
      await this.audit.record({action:'STORE_PAYMENT_CREATED',resource:'StorePayment',resourceId:payment.id,metadata:{accountId,orderId,amountMinor:payment.amountMinor,currency:payment.currency,status:payment.status,provider:'NOT_SELECTED',financialActionExecuted:false}});
      return {...payment,provider:'NOT_SELECTED',financialActionExecuted:false};
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code!=='P2002') throw error;
      const canonical=await this.prisma.storePayment.findFirst({where:{OR:[{orderId},{idempotencyKey:key}]}});
      if(canonical?.accountId===accountId&&canonical.orderId===orderId&&canonical.idempotencyKey===key)return {...canonical,provider:'NOT_SELECTED',financialActionExecuted:false};
      throw new ConflictException('Order already has a payment or idempotency key is already in use');
    }
  }

  listMyPayments(accountId:string) {
    return this.prisma.storePayment.findMany({where:{accountId},include:{invoice:true,order:{select:{id:true,status:true,totalMinor:true,currency:true}}},orderBy:{createdAt:'desc'}});
  }

  async adminFinanceSummary() {
    const [payments,invoices]=await Promise.all([
      this.prisma.storePayment.groupBy({by:['status','currency'],_count:{_all:true},_sum:{amountMinor:true}}),
      this.prisma.storeInvoice.groupBy({by:['status'],_count:{_all:true}}),
    ]);
    return {payments:payments.map(row=>({status:row.status,currency:row.currency,count:row._count._all,amountMinor:row._sum.amountMinor??0})),invoices:invoices.map(row=>({status:row.status,count:row._count._all})),provider:'NOT_SELECTED',financialActionExecuted:false};
  }

  listAdminPayments() {
    return this.prisma.storePayment.findMany({include:{invoice:true,order:{select:{id:true,status:true,totalMinor:true,currency:true}},account:{select:{id:true,email:true,person:{select:{firstName:true,lastName:true}}}}},orderBy:{createdAt:'desc'},take:200});
  }

  listAdminInvoices() {
    return this.prisma.storeInvoice.findMany({include:{payment:{include:{order:{select:{id:true,status:true,totalMinor:true,currency:true}},account:{select:{id:true,email:true}}}}},orderBy:{createdAt:'desc'},take:200});
  }

  listAdminOrders() {
    return this.prisma.storeOrder.findMany({ include: { account: { select: { id:true,email:true,person:{select:{firstName:true,lastName:true}} } }, items: { include: { product: true } } }, orderBy: { createdAt: 'desc' }, take: 200 });
  }

  async updateOrderStatus(orderId:string,status:'CREATED'|'CONFIRMED'|'CANCELLED'|'FULFILLED') {
    if(!['CREATED','CONFIRMED','CANCELLED','FULFILLED'].includes(status))throw new BadRequestException('Invalid order status');
    const allowed:Record<string,string[]>={CREATED:['CONFIRMED','CANCELLED'],CONFIRMED:['FULFILLED','CANCELLED'],CANCELLED:[],FULFILLED:[]};
    return this.prisma.serializable(async tx=>{
      const order=await tx.storeOrder.findUnique({where:{id:orderId},include:{items:true}});
      if(!order)throw new NotFoundException('Order not found');
      if(order.status===status)return order;
      if(!allowed[order.status]?.includes(status))throw new BadRequestException('Invalid order status transition');
      if(status==='FULFILLED'){
        const payment=await tx.storePayment.findUnique({where:{orderId},select:{status:true}});
        if(!payment||payment.status!=='CAPTURED')throw new ConflictException('Order cannot be fulfilled before payment is captured.');
      }

      const transitioned=await tx.storeOrder.updateMany({where:{id:orderId,status:order.status},data:{status}});
      if(transitioned.count!==1)throw new BadRequestException('Order status changed concurrently; retry');

      if(status==='CANCELLED'){
        for(const item of order.items)await tx.storeProduct.update({where:{id:item.productId},data:{stockQuantity:{increment:item.quantity}}});
      }
      const updated=await tx.storeOrder.findUniqueOrThrow({where:{id:orderId},include:{items:true}});
      await this.audit.record({action:'STORE_ORDER_STATUS_CHANGED',resource:'StoreOrder',resourceId:orderId,metadata:{from:order.status,to:status,stockRestored:status==='CANCELLED'}});
      return updated;
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
