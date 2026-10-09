import assert from 'node:assert/strict';
import {PrismaClient} from '@prisma/client';
import {createHmac,randomUUID} from 'node:crypto';
const db=new PrismaClient(),base=process.env.STORE_E2E_BASE_URL||'http://127.0.0.1:3101/api/v1';
const secret=process.env.JWT_SECRET;if(!secret)throw new Error('JWT_SECRET required');
const enc=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
const token=id=>{const now=Math.floor(Date.now()/1000),body=`${enc({alg:'HS256',typ:'JWT'})}.${enc({sub:id,iat:now,exp:now+900})}`;return `${body}.${createHmac('sha256',secret).update(body).digest('base64url')}`};
const accounts=[],persons=[],organizations=[],ids=[],orderIds=[];
async function request(account,path,method='GET',body){
 const response=await fetch(base+path,{method,headers:{'content-type':'application/json',...(account?{authorization:'Bearer '+token(account.id)}:{})},...(body?{body:JSON.stringify(body)}:{})});
 return {status:response.status,body:await response.json().catch(()=>null)};
}
const ok=result=>{assert.ok(result.status>=200&&result.status<300,JSON.stringify(result));return result.body};
try{
 for(const name of ['owner-a','owner-b','staff','buyer-a','buyer-b']){
   const person=await db.person.create({data:{firstName:name,lastName:'StoreOffers'}});persons.push(person);
   accounts.push(await db.account.create({data:{personId:person.id,email:`store-offer-${name}-${randomUUID()}@example.invalid`,passwordHash:'test',status:'ACTIVE',emailVerifiedAt:new Date()}}));
 }
 const[a,b,staff,buyer,other]=accounts;
 for(const owner of [a,b]){
   const org=await db.organization.create({data:{displayName:'Store '+owner.id,kind:'DIVE_CENTER',status:'ACTIVE',ownerId:owner.id}});organizations.push(org);
   await db.organizationMember.create({data:{organizationId:org.id,accountId:owner.id,role:'OWNER',status:'ACTIVE'}});
   await db.roleAssignment.create({data:{accountId:owner.id,role:'DIVE_CENTER',status:'ACTIVE'}});
 }
 await db.organizationMember.create({data:{organizationId:organizations[0].id,accountId:staff.id,role:'STAFF',status:'ACTIVE'}});
 await db.roleAssignment.create({data:{accountId:staff.id,role:'DIVE_CENTER',status:'ACTIVE'}});
 assert.equal((await request(null,'/store/provider/catalog')).status,401);
 assert.equal((await request(staff,'/store/provider/catalog')).status,403);
 const productId=randomUUID();ids.push(productId);
 const product={requestId:productId,sku:'offer-'+productId,nameAr:'خدمة صيانة',description:'تنسيق الموعد مع المركز',kind:'SERVICE',priceMinor:12550,stockQuantity:2,status:'ACTIVE'};
 assert.equal((await request(a,'/store/provider/products','POST',{...product,organizationId:organizations[1].id})).status,400);
 const created=await Promise.all([1,2].map(()=>request(a,'/store/provider/products','POST',product)));
 for(const result of created){assert.equal(ok(result).id,productId);assert.equal(result.body.organizationId,organizations[0].id)}
 assert.equal((await db.storeProduct.count({where:{id:productId}})),1);
 assert.equal((await request(a,'/store/provider/products','POST',{...product,nameAr:'changed'})).status,409);
 assert.ok(ok(await request(null,'/store/products')).some(p=>p.id===productId&&p.kind==='SERVICE'));
 assert.ok(!ok(await request(b,'/store/provider/catalog')).products.some(p=>p.id===productId));
 const {requestId,...fields}=product,revision=created[0].body.updatedAt;
 assert.equal((await request(b,'/store/provider/products/'+productId,'PATCH',{...fields,expectedUpdatedAt:revision})).status,404);
 const updated=ok(await request(a,'/store/provider/products/'+productId,'PATCH',{...fields,nameAr:'خدمة معدلة',expectedUpdatedAt:revision}));
 assert.equal((await request(a,'/store/provider/products/'+productId,'PATCH',{...fields,expectedUpdatedAt:revision})).status,409);
 const order=ok(await request(buyer,'/store/orders','POST',{items:[{productId,quantity:1}]}));orderIds.push(order.id);assert.equal(order.totalMinor,12550);
 let p=await db.storeProduct.findUniqueOrThrow({where:{id:productId}});
 ok(await request(a,'/store/provider/products/'+productId+'/status','PATCH',{status:'INACTIVE',expectedUpdatedAt:p.updatedAt}));
 assert.ok(!ok(await request(null,'/store/products')).some(p=>p.id===productId));
 assert.equal((await request(buyer,'/store/orders','POST',{items:[{productId,quantity:1}]})).status,404);
 p=await db.storeProduct.findUniqueOrThrow({where:{id:productId}});
 assert.equal((await request(a,'/store/provider/products/'+productId,'DELETE',{expectedUpdatedAt:p.updatedAt})).status,409);
 assert.equal(await db.storeOrder.count({where:{id:order.id}}),1);

 const courseId=randomUUID();ids.push(courseId);
 const startsAt=new Date(Date.now()+86400000*30).toISOString(),endsAt=new Date(Date.now()+86400000*31).toISOString();
 const course={requestId:courseId,courseCode:'OPEN-WATER',title:'دورة مياه مفتوحة',description:'برنامج المركز',locationName:'جدة',startsAt,endsAt,capacity:1,priceMinor:100000,status:'ACTIVE'};
 const c=ok(await request(a,'/store/provider/courses','POST',course));
 assert.equal((await request(b,'/store/provider/courses/'+courseId+'/status','PATCH',{status:'INACTIVE',expectedUpdatedAt:c.updatedAt})).status,404);
 assert.equal(ok(await request(null,'/store/courses')).find(c=>c.id===courseId).remainingSeats,1);
 const enrollments=await Promise.all([buyer,other].map(account=>request(account,'/store/courses/'+courseId+'/enroll','POST')));
 assert.equal(enrollments.filter(r=>r.status===201).length,1);assert.equal(enrollments.filter(r=>r.status===409).length,1);
 const index=enrollments.findIndex(r=>r.status===201),student=[buyer,other][index],enrollment=enrollments[index].body;
 assert.equal(enrollment.centerOrganizationId,organizations[0].id);assert.equal(enrollment.status,'PENDING');assert.equal(enrollment.metadata.priceMinor,100000);assert.equal(enrollment.metadata.financialActionExecuted,false);
 assert.equal(ok(await request(student,'/store/courses/'+courseId+'/enroll','POST')).id,enrollment.id);
 assert.equal(ok(await request(null,'/store/courses')).find(c=>c.id===courseId).remainingSeats,0);
 const {requestId:cid,...courseFields}=course;
 assert.equal((await request(a,'/store/provider/courses/'+courseId,'PATCH',{...courseFields,locationName:'موقع آخر',expectedUpdatedAt:c.updatedAt})).status,409);
 const edit=ok(await request(a,'/store/provider/courses/'+courseId,'PATCH',{...courseFields,title:'عنوان محدث',priceMinor:110000,expectedUpdatedAt:c.updatedAt}));
 const saved=await db.trainingEnrollment.findUniqueOrThrow({where:{id:enrollment.id}});assert.equal(saved.metadata.priceMinor,100000);
 ok(await request(a,'/training/enrollments/'+enrollment.id+'/status','PATCH',{status:'CANCELLED'}));
 const nextStudent=student.id===buyer.id?other:buyer;
 ok(await request(nextStudent,'/store/courses/'+courseId+'/enroll','POST'));
 assert.equal((await request(a,'/training/enrollments/'+enrollment.id+'/status','PATCH',{status:'ACTIVE'})).status,409);
 ok(await request(a,'/store/provider/courses/'+courseId+'/status','PATCH',{status:'INACTIVE',expectedUpdatedAt:edit.updatedAt}));
 assert.equal((await request(other,'/store/courses/'+courseId+'/enroll','POST')).status,404);
 const stopped=await db.storeCourseOffer.findUniqueOrThrow({where:{id:courseId}});
 assert.equal((await request(a,'/store/provider/courses/'+courseId,'DELETE',{expectedUpdatedAt:stopped.updatedAt})).status,409);
 assert.equal(await db.trainingEnrollment.count({where:{id:enrollment.id}}),1);

 for(const type of ['products','courses']){
   const id=randomUUID();ids.push(id);const body=type==='products'?{...product,sku:'offer-'+id}:{...course};
   const row=ok(await request(a,'/store/provider/'+type,'POST',{...body,requestId:id,status:'DRAFT'}));
   assert.equal((await request(b,'/store/provider/'+type+'/'+id,'DELETE',{expectedUpdatedAt:row.updatedAt})).status,404);
   ok(await request(a,'/store/provider/'+type+'/'+id,'DELETE',{expectedUpdatedAt:row.updatedAt}));
 }
 // Suspended providers disappear from the public catalog and cannot sell via stale IDs.
 p=await db.storeProduct.update({where:{id:productId},data:{status:'ACTIVE'}});
 await db.storeCourseOffer.update({where:{id:courseId},data:{status:'ACTIVE'}});
 await db.organization.update({where:{id:organizations[0].id},data:{status:'SUSPENDED'}});
 assert.equal((await request(a,'/store/provider/catalog')).status,403);
 assert.ok(!ok(await request(null,'/store/products')).some(row=>row.id===productId));
 assert.ok(!ok(await request(null,'/store/courses')).some(row=>row.id===courseId));
 assert.equal((await request(buyer,'/store/orders','POST',{items:[{productId,quantity:1}]})).status,404);
 assert.equal((await request(buyer,'/store/courses/'+courseId+'/enroll','POST')).status,404);
 console.log('Unified store HTTP/DB E2E passed: provider isolation, stale revisions, idempotent creation/enrollment, concurrent capacity, price snapshots, suspension, stopping and restricted deletion.');
}finally{
 const enrollments=await db.trainingEnrollment.findMany({where:{storeCourseOfferId:{in:ids}},select:{id:true}});
 await db.auditEvent.deleteMany({where:{resourceId:{in:[...ids,...enrollments.map(row=>row.id)]}}});
 await db.trainingEnrollment.deleteMany({where:{storeCourseOfferId:{in:ids}}});
 await db.storeOrderItem.deleteMany({where:{orderId:{in:orderIds}}});await db.storeOrder.deleteMany({where:{id:{in:orderIds}}});
 await db.storeProduct.deleteMany({where:{id:{in:ids}}});await db.storeCourseOffer.deleteMany({where:{id:{in:ids}}});
 await db.organizationMember.deleteMany({where:{organizationId:{in:organizations.map(row=>row.id)}}});await db.organization.deleteMany({where:{id:{in:organizations.map(row=>row.id)}}});
 await db.roleAssignment.deleteMany({where:{accountId:{in:accounts.map(row=>row.id)}}});
 await db.account.deleteMany({where:{id:{in:accounts.map(row=>row.id)}}});await db.person.deleteMany({where:{id:{in:persons.map(row=>row.id)}}});await db.$disconnect();
}
