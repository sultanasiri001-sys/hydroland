import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { riyadhSevenDayRefundDeadline } from '../commerce/commerce-refund-policy';
import { DatabaseService } from '../database/database.service';
import { requireVerifiedStoreCollection, storeObject, storeCanonicalTime } from './store-checkout-contract';
import { StoreOfferingsService } from './store-offerings.service';

type Input = {requestId?: string; quantity?: number; receivedAt?: string; reason?: string};

function quantityRequest(input: Input) {
  if (!input || typeof input.requestId !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(input.requestId)
    || !Number.isSafeInteger(input.quantity) || input.quantity! < 1 || input.quantity! > 2147483647) {
    throw new BadRequestException('A request ID and a positive whole quantity are required.');
  }
  return {id: input.requestId, quantity: input.quantity!};
}

function receiptTime(value: unknown, earliest: Date) {
  if (!storeCanonicalTime(value) || Date.parse(value) < earliest.getTime() || Date.parse(value) > Date.now()) {
    throw new BadRequestException('Enter the actual receipt time within the order history.');
  }
  return new Date(value);
}

@Injectable()
export class StoreGoodsService {
  constructor(private readonly db: DatabaseService, private readonly audit: AuditService, private readonly offers: StoreOfferingsService) {}

  private async record<T>(work: (tx: Prisma.TransactionClient) => Promise<T>) {
    try { return await this.db.serializable(work); }
    catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
      return this.db.serializable(work);
    }
  }

  fulfillmentQueue(accountId:string) {
    return this.db.serializable(async tx=>{
      const org=await this.offers.providerScope(tx,accountId);
      const rows=await tx.storeOrderItem.findMany({where:{product:{organizationId:org.id},order:{status:{in:['CONFIRMED','FULFILLED']},payment:{status:'CAPTURED'}}},
        select:{id:true,orderId:true,quantity:true,contractSnapshot:true,deliveries:{select:{quantity:true}}},orderBy:{order:{createdAt:'desc'}},take:150});
      const items=rows.filter(row=>storeObject(storeObject(row.contractSnapshot).issuer).organizationId===org.id && storeObject(row.contractSnapshot).kind==='PHYSICAL_GOOD');
      const history=await this.fulfillmentHistory(tx,items.map(item=>item.id));
      return items.map(item=>({itemId:item.id,orderId:item.orderId,title:storeObject(item.contractSnapshot).title,
        remaining:item.quantity-item.deliveries.reduce((sum,d)=>sum+d.quantity,0),notice:history.get(item.id)??null})).filter(item=>item.remaining>0);
    });
  }

  private async fulfillmentHistory(tx:Prisma.TransactionClient,ids:string[]) {
    const rows=await tx.auditEvent.findMany({where:{resource:'StoreOrderItem',action:'STORE_FULFILLMENT_UPDATE',resourceId:{in:ids}},
      orderBy:[{occurredAt:'desc'},{id:'desc'}],distinct:['resourceId'],select:{resourceId:true,metadata:true,occurredAt:true}});
    return new Map(rows.map(row=>[row.resourceId,{...storeObject(row.metadata).notice,updatedAt:row.occurredAt.toISOString()}]));
  }

  customerFulfillment(accountId:string,orderId:string) {
    return this.db.serializable(async tx=>{
      const order=await tx.storeOrder.findFirst({where:{id:orderId,accountId},select:{items:{select:{id:true}}}});
      if(!order)throw new NotFoundException('Order not found.');
      const history=await this.fulfillmentHistory(tx,order.items.map(item=>item.id));
      return order.items.map(item=>({itemId:item.id,notice:history.get(item.id)??null}));
    });
  }

  setFulfillment(accountId:string,itemId:string,input:Record<string,unknown>){
    if(!input||typeof input!=='object'||Object.keys(input).some(k=>!['requestId','revision','state','carrier','tracking','pickup'].includes(k))
      ||typeof input.requestId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.requestId)
      ||typeof input.revision!=='number'||!Number.isSafeInteger(input.revision)||input.revision<0
      ||!['PACKING','PICKUP_READY','SHIPPED'].includes(String(input.state)))throw new BadRequestException('تحقق من بيانات التجهيز.');
    const value=(key:string,max:number)=>{const supplied=input[key]??'';if(typeof supplied!=='string'||supplied.length>max||/[\u0000-\u001f]/.test(supplied))throw new BadRequestException('تحقق من بيانات التسليم.');return supplied.trim()};
    const state=String(input.state),carrier=value('carrier',100),tracking=value('tracking',140),pickup=value('pickup',320),requestId=input.requestId,revision=input.revision;
    if((state==='SHIPPED')!==Boolean(carrier&&tracking) || (state!=='SHIPPED'&&(carrier||tracking)) || (state==='PICKUP_READY')!==Boolean(pickup))throw new BadRequestException('أدخل شركة الشحن ورقم التتبع أو موقع الاستلام بحسب طريقة التسليم.');
    const change={state,carrier,tracking,pickup};
    return this.db.serializable(async tx=>{
      const org=await this.offers.providerScope(tx,accountId);
      await tx.$queryRaw`SELECT id FROM "StoreOrderItem" WHERE id::text=${itemId} FOR UPDATE`;
      const item=await tx.storeOrderItem.findFirst({where:{id:itemId,product:{organizationId:org.id}},include:{order:{include:{items:true,payment:true}},deliveries:{select:{quantity:true}}}});
      if(!item||storeObject(storeObject(item.contractSnapshot).issuer).organizationId!==org.id)throw new NotFoundException('Order item not found.');
      const filter={resource:'StoreOrderItem',resourceId:itemId,action:'STORE_FULFILLMENT_UPDATE'};
      const previous=await tx.auditEvent.findFirst({where:{...filter,metadata:{path:['requestId'],equals:requestId}}});
      if(previous){
        const saved=storeObject(storeObject(previous.metadata).notice);
        if(saved.state!==state||saved.carrier!==carrier||saved.tracking!==tracking||saved.pickup!==pickup)throw new ConflictException('تغيرت بيانات الطلب المعاد.');
        return saved;
      }
      if(!['CONFIRMED','FULFILLED'].includes(item.order.status)||storeObject(item.contractSnapshot).kind!=='PHYSICAL_GOOD')throw new ConflictException('الطلب غير جاهز للتجهيز.');
      await requireVerifiedStoreCollection(tx,item.order);
      const quantity=item.quantity-item.deliveries.reduce((sum,d)=>sum+d.quantity,0);
      if(quantity<1)throw new ConflictException('سُجّل استلام الكمية كاملة.');
      const last=await tx.auditEvent.findFirst({where:filter,orderBy:[{occurredAt:'desc'},{id:'desc'}]});
      const prior=storeObject(storeObject(last?.metadata).notice);
      if((prior.revision??0)!==revision)throw new ConflictException('تغيرت حالة التجهيز. حدّث الطلب.');
      if(prior.state && prior.state!=='PACKING' && prior.state!==state)throw new ConflictException('سبق تسجيل التسليم بطريقة أخرى.');
      const notice={...change,quantity,revision:revision+1};
      const actor=await tx.account.findUniqueOrThrow({where:{id:accountId},select:{personId:true}});
      await tx.auditEvent.create({data:{...filter,actorId:actor.personId,occurredAt:new Date(Math.max(Date.now(),(last?.occurredAt.getTime()??0)+1)),
        metadata:{requestId,organizationId:org.id,orderId:item.orderId,notice}}});
      return notice;
    });
  }

  delivery(accountId: string, orderId: string, itemId: string, input: Input) {
    const {id, quantity} = quantityRequest(input);
    return this.record(async tx => {
      const item = await tx.storeOrderItem.findFirst({where: {id: itemId, orderId, order: {accountId}},
        include: {order: true, deliveries: true}});
      if (!item) throw new NotFoundException('Order item not found.');
      const original = storeObject(item.contractSnapshot), source = storeObject(original.source), issuer = storeObject(original.issuer);
      const policy = storeObject(storeObject(original.refundPolicy).snapshot);
      if (original.kind !== 'PHYSICAL_GOOD' || source.id !== itemId || source.parentId !== orderId || source.kind !== 'STORE_ORDER_ITEM'
        || original.customerAccountId !== accountId || original.quantity !== item.quantity || typeof issuer.organizationId !== 'string'
        || !issuer.organizationId || policy.lineId !== itemId || typeof policy.version !== 'string') {
        throw new ConflictException('Original goods terms require review.');
      }
      const receivedAt = receiptTime(input.receivedAt, item.order.createdAt);
      const previous = await tx.storeGoodsDelivery.findUnique({where: {id}});
      if (previous) {
        if (previous.itemId !== itemId || previous.customerAccountId !== accountId || previous.quantity !== quantity
          || previous.receivedAt.getTime() !== receivedAt.getTime()) throw new ConflictException('Request already used.');
        return previous;
      }
      if (!['CONFIRMED','FULFILLED'].includes(item.order.status) || (item.actualReceivedAt && !item.deliveries.length)) {
        throw new ConflictException('The delivery history requires review.');
      }
      const total = item.deliveries.reduce((sum, row) => sum + row.quantity, quantity);
      if (total > item.quantity) throw new ConflictException('Quantity exceeds the outstanding delivery.');
      const row = await tx.storeGoodsDelivery.create({data: {id, itemId, organizationId: issuer.organizationId, customerAccountId: accountId,
        quantity, receivedAt, policyVersion: policy.version}});
      if (total === item.quantity) {
        const lastReceipt = new Date(Math.max(receivedAt.getTime(), ...item.deliveries.map(r => r.receivedAt.getTime())));
        await tx.storeOrderItem.update({where: {id: itemId}, data: {actualReceivedAt: lastReceipt}});
      }
      await this.audit.record({actorId: accountId, action: 'STORE_GOODS_CUSTOMER_RECEIVED', resource: 'StoreGoodsDelivery',resourceId: id,
        metadata: {orderId, itemId, quantity, receivedAt: input.receivedAt, policyVersion: row.policyVersion}}, tx);
      return row;
    });
  }

  requestReturn(accountId: string, deliveryId: string, input: Input) {
    const {id, quantity} = quantityRequest(input);
    if (!input.reason || !['CHANGE_OF_MIND','DEFECT','NON_CONFORMITY','WARRANTY'].includes(input.reason)) throw new BadRequestException('Select a return reason.');
    const reason = input.reason;
    return this.record(async tx => {
      const delivery = await tx.storeGoodsDelivery.findFirst({where: {id: deliveryId, customerAccountId: accountId}, include: {returns: true}});
      if (!delivery) throw new NotFoundException('Delivery not found.');
      const previous = await tx.storeGoodsReturn.findUnique({where: {id}});
      if (previous) {
        if (previous.deliveryId !== deliveryId || previous.quantity !== quantity || previous.reason !== reason) throw new ConflictException('Request already used.');
        return previous;
      }
      if (delivery.returns.reduce((sum, row) => sum + row.quantity, quantity) > delivery.quantity) throw new ConflictException('Quantity exceeds the remaining delivered goods.');
      const row = await tx.storeGoodsReturn.create({data: {id, deliveryId, quantity, reason}});
      await this.audit.record({actorId: accountId, action: 'STORE_GOODS_RETURN_REQUESTED', resource: 'StoreGoodsReturn', resourceId: id,
        metadata: {itemId: delivery.itemId, deliveryId, quantity, reason, originalPolicyVersion: delivery.policyVersion,
          ordinaryReturnDeadline: riyadhSevenDayRefundDeadline(delivery.receivedAt.toISOString())}}, tx);
      return row;
    });
  }

  listReturns(accountId: string, received = false) {
    return this.db.serializable(async tx => {
      const center = await this.offers.providerScope(tx, accountId);
      return tx.storeGoodsReturn.findMany({where: {delivery: {organizationId: center.id}, sellerReceivedAt: received ? {not:null} : null},
        orderBy: [{requestedAt: 'asc'}, {id: 'asc'}], take: 100, select: {id: true, quantity: true, reason: true, requestedAt: true,
          delivery: {select: {itemId: true, item: {select: {orderId: true, contractSnapshot: true}}}}}}).then(rows => rows.map(row => ({
            id: row.id, quantity: row.quantity, reason: row.reason, requestedAt: row.requestedAt, orderId: row.delivery.item.orderId,
            title: storeObject(row.delivery.item.contractSnapshot).title
          })));
    });
  }

  verifyRemedy(accountId: string, id: string, input: {basis?: string; evidenceReference?: string}) {
    if (!input || !['ELIGIBLE_UNUSED','VERIFIED_RIGHT'].includes(input.basis || '') || typeof input.evidenceReference !== 'string'
      || !input.evidenceReference.trim() || input.evidenceReference.length > 200) throw new BadRequestException('Document the basis and evidence reference for this return.');
    return this.db.serializable(async tx=>{
      const center = await this.offers.providerScope(tx,accountId);
      const row = await tx.storeGoodsReturn.findFirst({where:{id,delivery:{organizationId:center.id}},include:{delivery:true}});
      if (!row) throw new NotFoundException('Return not found.');
      if (!row.sellerReceivedAt || row.delivery.customerAccountId===accountId) throw new ConflictException('An independent seller must verify the returned goods.');
      if (input.basis==='ELIGIBLE_UNUSED' && (row.reason!=='CHANGE_OF_MIND' || row.requestedAt.toISOString()>riyadhSevenDayRefundDeadline(row.delivery.receivedAt.toISOString()))) {
        throw new ConflictException('This claim requires a separately verified remedy.');
      }
      const key = {action:'STORE_GOODS_REFUND_REMEDY_VERIFIED',resource:'StoreGoodsReturn',resourceId:id};
      const existing=await tx.auditEvent.findFirst({where:key});
      if (existing) {
        const saved=storeObject(existing.metadata);
        if (saved.evidenceReference!==input.evidenceReference || saved.basis!==input.basis) throw new ConflictException('A remedy has already been recorded for this return.');
        return {id,reviewId:existing.id};
      }
      const review=await this.audit.record({...key,actorId:accountId,metadata:{organizationId:center.id,quantity:row.quantity,receiptTime:row.sellerReceivedAt.toISOString(),
        basis:input.basis,evidenceReference:input.evidenceReference,reviewerAccountId:accountId}},tx);
      return {id,reviewId:review.id};
    });
  }

  receiveReturn(accountId: string, returnId: string, input: Input) {
    return this.db.serializable(async tx => {
      const center = await this.offers.providerScope(tx, accountId);
      const row = await tx.storeGoodsReturn.findFirst({where: {id: returnId, delivery: {organizationId: center.id}},include: {delivery: true}});
      if (!row) throw new NotFoundException('Return not found.');
      const receivedAt = receiptTime(input?.receivedAt, row.delivery.receivedAt);
      if (row.sellerReceivedAt) {
        if (row.sellerReceivedAt.getTime() !== receivedAt.getTime() || row.sellerAccountId !== accountId) throw new ConflictException('The return receipt was already recorded.');
        return {id: row.id, sellerReceivedAt: row.sellerReceivedAt};
      }
      const updated = await tx.storeGoodsReturn.update({where: {id: returnId}, data: {sellerReceivedAt: receivedAt, sellerRecordedAt: new Date(), sellerAccountId: accountId},
        select: {id: true, sellerReceivedAt: true}});
      await this.audit.record({actorId: accountId, action: 'STORE_GOODS_SELLER_RECEIVED_RETURN', resource: 'StoreGoodsReturn', resourceId: returnId,
        metadata: {organizationId: center.id, itemId: row.delivery.itemId, quantity: row.quantity, receivedAt: updated.sellerReceivedAt!.toISOString()}}, tx);
      return updated;
    });
  }
}
