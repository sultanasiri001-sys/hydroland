import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PDFDocument} from 'pdf-lib';

// Reuses the isolated, reconciled course and authenticated actors from the checkout suite.
export async function verifyAccountInvoices({db,base,owner,buyer,accountant,account,center,id}) {
  const [trainer,boatOwner]=await Promise.all([account('invoice-trainer'),account('invoice-boat')]);
  const sign=(actor,role)=>db.roleAssignment.upsert({where:{accountId_role:{accountId:actor.id,role}},create:{accountId:actor.id,role,status:'ACTIVE'},update:{status:'ACTIVE'}});
  const member=(actor,org)=>db.organizationMember.upsert({where:{organizationId_accountId:{organizationId:org.id,accountId:actor.id}},create:{accountId:actor.id,organizationId:org.id,role:'OWNER',status:'ACTIVE'},update:{role:'OWNER',status:'ACTIVE'}});
  await Promise.all([sign(owner,'DIVE_CENTER'),sign(trainer,'INSTRUCTOR'),sign(boatOwner,'BOAT_OWNER'),member(owner,center)]);
  const marine=await db.organization.create({data:{ownerId:boatOwner.id,kind:'MARINE_OPERATOR',status:'ACTIVE',displayName:'SYNTHETIC operator'}});
  await member(boatOwner,marine);
  const headers=actor=>({authorization:'Bearer '+actor.token});
  const get=(actor,path)=>fetch(base+'/api/v1/account/invoices'+path,{headers:headers(actor)});
  const list=async(actor,view='all')=>{const r=await get(actor,'?view='+view);assert.equal(r.status,200,await r.clone().text());return (await r.json()).items;};
  const key=(type,ref)=>'/'+type+'/'+ref+'/document';
  const pdf=await PDFDocument.create();pdf.addPage([595.28,841.89]);
  const bytes=Buffer.from(await pdf.save()),num='TEST-'+randomUUID();
  const attach=(actor,path,number=num)=>{
    const data=new FormData();data.set('number',number);data.set('document',new Blob([bytes],{type:'application/pdf'}),'test.pdf');
    return fetch(base+'/api/v1/account/invoices'+path,{method:'POST',headers:headers(actor),body:data});
  };
  const has=(rows,ref)=>rows.find(r=>r.sourceId===ref);
  const course=key('TRAINING_ENROLLMENT',id);
  assert.equal(has(await list(buyer,'purchases'),id).hasDocument,false);
  assert.ok(has(await list(accountant,'sales'),id));assert.ok(!has(await list(trainer),id));
  assert.equal((await attach(buyer,course)).status,404);
  const copies=await Promise.all([attach(owner,course),attach(owner,course)]);
  for(const response of copies)assert.equal(response.status,201,await response.clone().text());
  assert.equal((await attach(owner,course,num+'-different')).status,409);
  assert.deepEqual(Buffer.from(await (await get(buyer,course)).arrayBuffer()),bytes);
  assert.equal((await get(boatOwner,course)).status,404);
  assert.equal(has(await list(buyer,'purchases'),id).number,num);
  // Personal trip purchase by the trainer from the boat operator.
  const trip=await db.trip.create({data:{title:'SYNTHETIC boat trip',type:'BOAT',startsAt:new Date(),endsAt:new Date(),capacity:4,organizationId:marine.id}});
  const tripPayment=async organizationId=>{
    const b=await db.booking.create({data:{accountId:trainer.id,tripId:trip.id,organizationId}});
    const p=await db.payment.create({data:{bookingId:b.id,accountId:trainer.id,status:'CAPTURED',amountMinor:10000,idempotencyKey:randomUUID(),
      contractSnapshot:{issuer:{organizationId:marine.id},buyerOrganizationId:organizationId}}});
    await db.invoice.create({data:{paymentId:p.id,number:'HL-DRAFT-'+p.id}});
    return p.id;
  };
  const personal=await tripPayment(null),orgPurchase=await tripPayment(center.id);
  assert.ok(has(await list(trainer,'purchases'),personal));
  assert.ok(!has(await list(trainer),orgPurchase));assert.ok(has(await list(owner,'purchases'),orgPurchase));
  assert.equal((await attach(boatOwner,key('TRIP_PAYMENT',personal),'BOAT-'+num)).status,201);
  assert.deepEqual(Buffer.from(await (await get(trainer,key('TRIP_PAYMENT',personal))).arrayBuffer()),bytes);
  // Single-supplier goods and historical mixed-supplier/unknown baskets.
  const product=await db.storeProduct.create({data:{sku:randomUUID(),nameAr:'SYNTHETIC goods',organizationId:center.id,priceMinor:200}});
  const goods=async sellers=>{
    const order=await db.storeOrder.create({data:{accountId:boatOwner.id,totalMinor:200*sellers.length,
      items:{create:sellers.map(seller=>({productId:product.id,quantity:1,unitPriceMinor:200,...seller&&{contractSnapshot:{issuer:{organizationId:seller}}}}))}}});
    await db.storePayment.create({data:{orderId:order.id,accountId:boatOwner.id,amountMinor:order.totalMinor,status:'CAPTURED',idempotencyKey:randomUUID(),
      invoice:{create:{number:'STORE-'+order.id,status:'ISSUED',issuedAt:new Date()}}}});
    return order.id;
  };
  const single=await goods([center.id]),mixed=await goods([center.id,marine.id]),unknown=await goods([null]);
  assert.ok(has(await list(owner,'sales'),single));assert.ok(!has(await list(owner,'sales'),mixed));assert.ok(!has(await list(owner,'sales'),unknown));
  assert.ok(has(await list(boatOwner,'purchases'),mixed));assert.ok(!has(await list(boatOwner,'sales'),mixed));
  assert.equal((await attach(owner,key('STORE_ORDER',single),'STORE-'+single)).status,201);
  assert.deepEqual(Buffer.from(await (await get(boatOwner,key('STORE_ORDER',single))).arrayBuffer()),bytes);
  // Only a separately approved independent service gives the trainer a sales invoice.
  const unit=await db.orgUnit.findFirstOrThrow({where:{organizationId:center.id}});
  await db.employment.create({data:{accountId:trainer.id,organizationId:center.id,orgUnitId:unit.id,workerClass:'INDEPENDENT_PROFESSIONAL',status:'ACTIVE'}});
  const terms={organizationId:center.id,instructorAccountId:trainer.id,currency:'SAR',rateBps:0,recordedByAccountId:owner.id};
  await db.instructorCompensationAgreement.create({data:{...terms,revision:1,mode:'FIXED',fixedMinor:700}});
  const earning=await db.instructorEarning.create({data:{trainingEnrollmentId:id,instructorAccountId:trainer.id,centerOrganizationId:center.id,amountMinor:700,status:'APPROVED',approvedByAccountId:owner.id,approvedAt:new Date()}});
  assert.equal(has(await list(trainer,'sales'),earning.id).amountMinor,700);
  assert.ok(has(await list(owner,'purchases'),earning.id));assert.ok(!has(await list(buyer),earning.id));
  const contractDoc=key('INSTRUCTOR_SERVICE',earning.id);
  assert.equal((await attach(trainer,contractDoc,'INSTRUCTOR-'+num)).status,201);
  assert.deepEqual(Buffer.from(await (await get(owner,contractDoc)).arrayBuffer()),bytes);
  await db.instructorCompensationAgreement.create({data:{...terms,revision:2,mode:'SALARY_ONLY',fixedMinor:0}});
  const salaryEnrollment=await db.trainingEnrollment.create({data:{studentAccountId:buyer.id,courseCode:'SALARY',centerOrganizationId:center.id}});
  const salary=await db.instructorEarning.create({data:{trainingEnrollmentId:salaryEnrollment.id,instructorAccountId:trainer.id,centerOrganizationId:center.id,amountMinor:700,status:'APPROVED',approvedByAccountId:owner.id,approvedAt:new Date()}});
  assert.ok(!has(await list(trainer),salary.id));assert.ok(has(await list(trainer),earning.id));
  await db.roleAssignment.update({where:{accountId_role:{accountId:boatOwner.id,role:'BOAT_OWNER'}},data:{status:'SUSPENDED'}});
  assert.equal((await get(boatOwner,key('TRIP_PAYMENT',personal))).status,404);
  assert.equal((await get(boatOwner,key('STORE_ORDER',single))).status,200);
  return {bytes,num};
}
