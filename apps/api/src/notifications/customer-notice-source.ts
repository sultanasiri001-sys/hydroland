import { Prisma } from '@prisma/client';
import { invoiceRegister, InvoiceKey, InvoiceRow } from '../payments/account-invoice-register';

/** Locks the native purchase and the buyer authority used by the shared invoice register. */
export async function lockInvoiceForCustomerNotice(tx:Prisma.TransactionClient,accountId:string,key:InvoiceKey){
  await tx.$queryRaw`SELECT id FROM "RoleAssignment" WHERE "accountId"::text=${accountId} FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM "OrganizationMember" WHERE "accountId"::text=${accountId} FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM "Employment" WHERE "accountId"::text=${accountId} FOR SHARE`;
  // Holding the parent also serializes new center/authority rows with their foreign key checks.
  await tx.$queryRaw`SELECT o.id FROM "Organization" o WHERE EXISTS(SELECT 1 FROM "OrganizationMember" m WHERE m."organizationId"=o.id AND m."accountId"::text=${accountId})
    OR EXISTS(SELECT 1 FROM "Employment" e WHERE e."organizationId"=o.id AND e."accountId"::text=${accountId}) ORDER BY o.id FOR UPDATE`;
  await tx.$queryRaw`SELECT u.id FROM "OrgUnit" u WHERE EXISTS(SELECT 1 FROM "Employment" e WHERE e."organizationId"=u."organizationId" AND e."accountId"::text=${accountId}) ORDER BY u.id FOR SHARE`;
  await tx.$queryRaw`SELECT p.id FROM "Position" p WHERE EXISTS(SELECT 1 FROM "Employment" e WHERE e."positionId"=p.id AND e."accountId"::text=${accountId}) ORDER BY p.id FOR SHARE`;
  if(key.sourceType==='TRIP_PAYMENT'){
    await tx.$queryRaw`SELECT id FROM "Payment" WHERE id::text=${key.sourceId} FOR UPDATE`;
    await tx.$queryRaw`SELECT b.id FROM "Booking" b JOIN "Payment" p ON p."bookingId"=b.id WHERE p.id::text=${key.sourceId} FOR SHARE OF b`;
    await tx.$queryRaw`SELECT t.id FROM "Trip" t JOIN "Booking" b ON b."tripId"=t.id JOIN "Payment" p ON p."bookingId"=b.id WHERE p.id::text=${key.sourceId} FOR SHARE OF t`;
    await tx.$queryRaw`SELECT id FROM "Invoice" WHERE "paymentId"::text=${key.sourceId} FOR SHARE`;
    await tx.$queryRaw`SELECT e.id FROM "CommerceCollectionEvidence" e JOIN "Payment" p ON e."sourceType"='ORGANIZATION_BOOKING_PREPAYMENT' AND e."sourceId"::text=p."bookingId"::text WHERE p.id::text=${key.sourceId} FOR SHARE OF e`;
  }else if(key.sourceType==='STORE_ORDER'){
    await tx.$queryRaw`SELECT id FROM "StoreOrder" WHERE id::text=${key.sourceId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "StoreOrderItem" WHERE "orderId"::text=${key.sourceId} FOR SHARE`;
    await tx.$queryRaw`SELECT id FROM "StorePayment" WHERE "orderId"::text=${key.sourceId} FOR SHARE`;
    await tx.$queryRaw`SELECT i.id FROM "StoreInvoice" i JOIN "StorePayment" p ON p.id=i."paymentId" WHERE p."orderId"::text=${key.sourceId} FOR SHARE OF i`;
  }else if(key.sourceType==='INSTRUCTOR_SERVICE'){
    await tx.$queryRaw`SELECT id FROM "InstructorEarning" WHERE id::text=${key.sourceId} FOR UPDATE`;
  }
  await tx.$queryRaw`SELECT id FROM "CommerceCollectionEvidence" WHERE "sourceType"=${key.sourceType} AND "sourceId"::text=${key.sourceId} FOR SHARE`;
  await tx.$queryRaw`SELECT "sourceId" FROM "AccountInvoiceDocument" WHERE "sourceType"=${key.sourceType} AND "sourceId"=${key.sourceId} FOR SHARE`;
  const [invoice]=await tx.$queryRaw<InvoiceRow[]>(invoiceRegister(accountId,key));
  return invoice;
}

export function issuedPurchase(invoice:InvoiceRow|undefined){
  return Boolean(invoice?.isPurchase&&invoice.number&&invoice.nativeStatus!=='VOID'
    && !(invoice.sourceType==='TRIP_PAYMENT'&&invoice.buyerOrganizationId&&!['ISSUED','PAID'].includes(invoice.nativeStatus||'')));
}
