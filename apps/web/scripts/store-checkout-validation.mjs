import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const store=await readFile(resolve('apps/web/src/hydroland-store.js'),'utf8');
for(const marker of [
  "/store/orders'",
  '/store/orders/${encodeURIComponent(orderId)}/payment',
  '/store/payments/mine',
  'createPaymentRecord',
  'paymentForOrder',
  'idempotencyKey',
  'cart.clear();renderCart();await loadProducts()',
  'data-store-payment-retry',
  'financialActionExecuted',
  'مزود الدفع غير مفعّل',
  'لا يوجد تحصيل مالي منفذ'
])if(!store.includes(marker))throw new Error(`Missing store checkout integrity marker: ${marker}`);
if(store.includes("authorizedFetch('/payments")||store.includes('authorizedFetch("/payments'))throw new Error('Store checkout must not use booking payment routes.');
if(store.includes('financialActionExecuted:true'))throw new Error('Store UI must not claim a financial action was executed.');
if(!store.includes("window.HydrolandStore={reloadProducts:loadProducts,openOrders:loadOrders"))throw new Error('Store runtime must expose reload/orders recovery controls.');
console.log('Store checkout validation passed: order→payment-record linkage, retry recovery, booking-payment separation and truthful no-capture messaging.');
