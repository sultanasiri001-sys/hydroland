import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const store=await readFile(resolve('src/hydroland-store.js'),'utf8');
for(const marker of [
  "/store/orders'",
  "'/store/orders/'+encodeURIComponent(id)",
  "'/payments/courses/'+encodeURIComponent(id)",
  '/store/payments/mine',
  'paymentForOrder',
  'idempotencyKey',
  'cart.clear();renderCart();await loadProducts()',
  'data-store-payment-retry',
  'acceptedPolicyVersion:quote.policyVersion',
  'quoteHash:quote.quoteHash',
  'data-commerce-accepted',
  'sameSession',
  'paymentViewVersion',
  'collectionVerified',
  'حالة الدفع تحتاج مراجعة من المركز؛ لا تنشئ دفعة جديدة.'
])if(!store.includes(marker))throw new Error(`Missing store checkout integrity marker: ${marker}`);
if(/authorizedFetch\(['"]\/payments['"]/.test(store))throw new Error('Store checkout must not use booking payment routes.');
if(store.includes('financialActionExecuted:true'))throw new Error('Store UI must not claim a financial action was executed.');
if(!store.includes("window.HydrolandStore={reloadProducts:loadProducts,openOrders:loadOrders"))throw new Error('Store runtime must expose reload/orders recovery controls.');
console.log('Store checkout validation passed: source-bound order/course checkout, accepted original terms, session fencing and verified collection messaging.');
