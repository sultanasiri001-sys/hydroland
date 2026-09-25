import { PrismaClient } from '@prisma/client';
import { createHmac } from 'node:crypto';

const db=new PrismaClient();
const base=process.env.STORE_E2E_BASE_URL||'http://127.0.0.1:3101/api/v1';
const secret=process.env.JWT_SECRET;if(!secret)throw new Error('JWT_SECRET required');
const suffix=Date.now().toString();
const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
const tokenFor=id=>{const now=Math.floor(Date.now()/1000),body=`${enc({alg:'HS256',typ:'JWT'})}.${enc({sub:id,iat:now,exp:now+900})}`;return `${body}.${createHmac('sha256',secret).update(body).digest('base64url')}`;};
const headers=token=>({authorization:`Bearer ${token}`,'content-type':'application/json'});
const bodyOf=async response=>{const body=await response.json().catch(()=>null);return{response,body}};
const expectOk=async response=>{const {body}=await bodyOf(response);if(!response.ok)throw new Error(`HTTP ${response.status}: ${JSON.stringify(body)}`);return body};
const accounts=[];const persons=[];const orderIds=[];const paymentIds=[];let product=null;let adminRole=null;
try{
  for(const name of ['buyer','other','admin']){
    const person=await db.person.create({data:{firstName:name,lastName:'StoreE2E'}});persons.push(person);
    const account=await db.account.create({data:{personId:person.id,email:`${name}-${suffix}@example.invalid`,passwordHash:'e2e',status:'ACTIVE',emailVerifiedAt:new Date()}});accounts.push(account);
  }
  const [buyer,other,admin]=accounts;
  adminRole=await db.roleAssignment.create({data:{accountId:admin.id,role:'ADMIN',status:'ACTIVE',activeAt:new Date(),scope:{purpose:'STORE_E2E'}}});
  product=await db.storeProduct.create({data:{sku:`STORE-E2E-${suffix}`,nameAr:'منظم غوص تجريبي',nameEn:'E2E regulator',priceMinor:12500,currency:'SAR',stockQuantity:5,status:'ACTIVE'}});
  const buyerToken=tokenFor(buyer.id),otherToken=tokenFor(other.id),adminToken=tokenFor(admin.id);

  let response=await fetch(base+'/store/orders',{method:'POST',headers:headers(buyerToken),body:JSON.stringify({items:[{productId:product.id,quantity:2}]})});
  let order=await expectOk(response);orderIds.push(order.id);
  if(order.totalMinor!==25000||order.items?.[0]?.quantity!==2)throw new Error('Store order total/items mismatch');
  let stock=await db.storeProduct.findUnique({where:{id:product.id},select:{stockQuantity:true}});if(stock?.stockQuantity!==3)throw new Error(`Expected stock 3 after order, got ${stock?.stockQuantity}`);

  const key=`store-e2e-${suffix}`;
  response=await fetch(base+`/store/orders/${order.id}/payment`,{method:'POST',headers:headers(buyerToken),body:JSON.stringify({idempotencyKey:key})});
  const payment=await expectOk(response);paymentIds.push(payment.id);
  if(payment.status!=='CREATED'||payment.orderId!==order.id||payment.amountMinor!==25000||payment.provider!=='NOT_SELECTED'||payment.financialActionExecuted!==false)throw new Error('Store payment record truth boundary mismatch');

  response=await fetch(base+`/store/orders/${order.id}/payment`,{method:'POST',headers:headers(buyerToken),body:JSON.stringify({idempotencyKey:key})});
  const duplicate=await expectOk(response);if(duplicate.id!==payment.id)throw new Error('Idempotent store payment retry returned a different payment');

  response=await fetch(base+`/store/orders/${order.id}/payment`,{method:'POST',headers:headers(otherToken),body:JSON.stringify({idempotencyKey:`other-${suffix}`})});
  if(response.status!==404)throw new Error(`Other account payment expected 404, got ${response.status}`);

  response=await fetch(base+'/store/orders',{method:'POST',headers:headers(buyerToken),body:JSON.stringify({items:[{productId:product.id,quantity:1}]})});
  const secondOrder=await expectOk(response);orderIds.push(secondOrder.id);
  stock=await db.storeProduct.findUnique({where:{id:product.id},select:{stockQuantity:true}});if(stock?.stockQuantity!==2)throw new Error(`Expected stock 2 after second order, got ${stock?.stockQuantity}`);
  response=await fetch(base+`/store/orders/${secondOrder.id}/payment`,{method:'POST',headers:headers(buyerToken),body:JSON.stringify({idempotencyKey:key})});
  if(response.status!==409)throw new Error(`Reused payment key expected 409, got ${response.status}`);

  response=await fetch(base+`/store/admin/orders/${secondOrder.id}/status`,{method:'PATCH',headers:headers(adminToken),body:JSON.stringify({status:'CANCELLED'})});
  const cancelled=await expectOk(response);if(cancelled.status!=='CANCELLED')throw new Error('Order cancellation did not persist');
  stock=await db.storeProduct.findUnique({where:{id:product.id},select:{stockQuantity:true}});if(stock?.stockQuantity!==3)throw new Error(`Cancellation did not restore stock; got ${stock?.stockQuantity}`);

  response=await fetch(base+'/store/orders',{method:'POST',headers:headers(buyerToken),body:JSON.stringify({items:[{productId:product.id,quantity:1}]})});
  const thirdOrder=await expectOk(response);orderIds.push(thirdOrder.id);
  response=await fetch(base+`/store/admin/orders/${thirdOrder.id}/status`,{method:'PATCH',headers:headers(adminToken),body:JSON.stringify({status:'CONFIRMED'})});
  await expectOk(response);
  response=await fetch(base+`/store/admin/orders/${thirdOrder.id}/status`,{method:'PATCH',headers:headers(adminToken),body:JSON.stringify({status:'FULFILLED'})});
  if(response.status!==409)throw new Error(`Unpaid fulfillment expected 409, got ${response.status}`);

  const mine=await expectOk(await fetch(base+'/store/payments/mine',{headers:headers(buyerToken)}));
  if(!Array.isArray(mine)||!mine.some(item=>item.id===payment.id&&item.orderId===order.id))throw new Error('Buyer payment list missing created store payment');

  console.log('Store checkout HTTP/DB E2E passed: server totals, atomic stock decrement, idempotent payment record, ownership isolation, key conflict, cancellation stock restoration, unpaid fulfillment block and truthful NOT_SELECTED provider state.');
} finally {
  if(paymentIds.length)await db.auditEvent.deleteMany({where:{resource:'StorePayment',resourceId:{in:paymentIds}}}).catch(()=>{});
  if(orderIds.length){
    await db.auditEvent.deleteMany({where:{resource:'StoreOrder',resourceId:{in:orderIds}}}).catch(()=>{});
    await db.storeInvoice.deleteMany({where:{payment:{orderId:{in:orderIds}}}}).catch(()=>{});
    await db.storePayment.deleteMany({where:{orderId:{in:orderIds}}}).catch(()=>{});
    await db.storeOrderItem.deleteMany({where:{orderId:{in:orderIds}}}).catch(()=>{});
    await db.storeOrder.deleteMany({where:{id:{in:orderIds}}}).catch(()=>{});
  }
  if(product)await db.storeProduct.delete({where:{id:product.id}}).catch(()=>{});
  if(adminRole)await db.roleAssignment.delete({where:{id:adminRole.id}}).catch(()=>{});
  for(const account of accounts){await db.session.deleteMany({where:{accountId:account.id}}).catch(()=>{});await db.account.delete({where:{id:account.id}}).catch(()=>{});}
  for(const person of persons)await db.person.delete({where:{id:person.id}}).catch(()=>{});
  await db.$disconnect();
}
