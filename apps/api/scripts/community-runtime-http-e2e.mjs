import {PrismaClient} from '@prisma/client';
import {createHmac} from 'node:crypto';

const db=new PrismaClient();
const base=process.env.COMMUNITY_E2E_BASE_URL||'http://127.0.0.1:3101/api/v1';
const secret=process.env.JWT_SECRET;if(!secret)throw new Error('JWT_SECRET required');
const suffix=Date.now().toString();
const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
const tokenFor=id=>{const now=Math.floor(Date.now()/1000),body=encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:id,iat:now,exp:now+900});return body+'.'+createHmac('sha256',secret).update(body).digest('base64url');};
const headers=token=>({authorization:'Bearer '+token,'content-type':'application/json'});
const expectOk=async response=>{const body=await response.json().catch(()=>null);if(!response.ok)throw new Error('HTTP '+response.status+': '+JSON.stringify(body));return body;};

const people=[],accounts=[];let adminRole=null,postId=null,eventId=null,registrationId=null,engagementId=null;
try{
  for(const name of ['member','other','admin']){
    const person=await db.person.create({data:{firstName:name,lastName:'CommunityE2E'}});
    people.push(person);
    const account=await db.account.create({data:{personId:person.id,email:'community-'+name+'-'+suffix+'@example.invalid',passwordHash:'e2e',status:'ACTIVE',emailVerifiedAt:new Date()}});
    accounts.push(account);
  }
  const [member,other,admin]=accounts;
  adminRole=await db.roleAssignment.create({data:{accountId:admin.id,role:'ADMIN',status:'ACTIVE',activeAt:new Date(),scope:{purpose:'COMMUNITY_RUNTIME_E2E'}}});
  const memberToken=tokenFor(member.id),otherToken=tokenFor(other.id),adminToken=tokenFor(admin.id);

  let response=await fetch(base+'/community/posts');
  const initiallyPublic=await expectOk(response);if(!Array.isArray(initiallyPublic))throw new Error('Public community posts response must be an array');

  response=await fetch(base+'/community/posts',{method:'POST',headers:headers(memberToken),body:JSON.stringify({title:'ق',body:'قصير'})});
  if(response.status!==400)throw new Error('Invalid community post expected 400, got '+response.status);
  const post=await expectOk(await fetch(base+'/community/posts',{method:'POST',headers:headers(memberToken),body:JSON.stringify({title:'مبادرة تنظيف الشعاب',body:'نبحث عن متطوعين للمشاركة في تنظيف الشعاب ودعم البيئة البحرية.'})}));
  postId=post.id;if(post.status!=='PENDING_REVIEW'||post.authorAccountId!==member.id)throw new Error('Community post did not persist as member-owned pending review');
  const minePosts=await expectOk(await fetch(base+'/community/posts/mine',{headers:headers(memberToken)}));
  if(!minePosts.some(item=>item.id===postId))throw new Error('Member post list is missing its own post');
  const otherPosts=await expectOk(await fetch(base+'/community/posts/mine',{headers:headers(otherToken)}));
  if(otherPosts.some(item=>item.id===postId))throw new Error('Other member can view a private pending post');
  const unpublished=await expectOk(await fetch(base+'/community/posts'));
  if(unpublished.some(item=>item.id===postId))throw new Error('Pending post leaked into the public feed');
  response=await fetch(base+'/community/admin/posts',{headers:headers(memberToken)});
  if(response.status!==403)throw new Error('Non-admin post queue expected 403, got '+response.status);
  const published=await expectOk(await fetch(base+'/community/admin/posts/'+postId+'/status',{method:'PATCH',headers:headers(adminToken),body:JSON.stringify({status:'PUBLISHED',reviewNotes:'محتوى مناسب للنشر'})}));
  if(published.status!=='PUBLISHED'||published.reviewedByAccountId!==admin.id||!published.publishedAt)throw new Error('Admin post publication did not persist review evidence');
  const publicPosts=await expectOk(await fetch(base+'/community/posts'));
  if(!publicPosts.some(item=>item.id===postId&&item.author?.id===member.id))throw new Error('Published post is missing from the public feed');

  response=await fetch(base+'/community/admin/events',{method:'POST',headers:headers(memberToken),body:JSON.stringify({title:'فعالية غير مسموحة'})});
  if(response.status!==403)throw new Error('Non-admin event creation expected 403, got '+response.status);
  const event=await expectOk(await fetch(base+'/community/admin/events',{method:'POST',headers:headers(adminToken),body:JSON.stringify({title:'تنظيف شاطئ القحمة',description:'فعالية تطوعية لحماية الساحل ورفع الوعي البيئي.',locationName:'شاطئ القحمة',startsAt:'2030-02-10T08:00:00.000Z',endsAt:'2030-02-10T12:00:00.000Z',capacity:1,status:'PUBLISHED'})}));
  eventId=event.id;if(event.status!=='PUBLISHED'||event.createdByAccountId!==admin.id||event.capacity!==1)throw new Error('Published community event did not persist');
  const publicEvents=await expectOk(await fetch(base+'/community/events'));
  if(!publicEvents.some(item=>item.id===eventId))throw new Error('Published event is missing from the public event feed');
  const registration=await expectOk(await fetch(base+'/community/events/'+eventId+'/volunteers',{method:'POST',headers:headers(memberToken)}));
  registrationId=registration.id;if(registration.status!=='REGISTERED'||registration.accountId!==member.id)throw new Error('Volunteer registration did not persist member ownership');
  response=await fetch(base+'/community/events/'+eventId+'/volunteers',{method:'POST',headers:headers(otherToken)});
  if(response.status!==409)throw new Error('Full event registration expected 409, got '+response.status);
  response=await fetch(base+'/community/volunteers/'+registrationId+'/cancel',{method:'PATCH',headers:headers(otherToken)});
  if(response.status!==404)throw new Error('Other member volunteer cancellation expected 404, got '+response.status);
  const reviewedRegistration=await expectOk(await fetch(base+'/community/admin/volunteers/'+registrationId+'/status',{method:'PATCH',headers:headers(adminToken),body:JSON.stringify({status:'ATTENDED',approvedMinutes:120,reviewNotes:'حضر كامل الفعالية'})}));
  if(reviewedRegistration.status!=='ATTENDED'||reviewedRegistration.approvedMinutes!==120||reviewedRegistration.reviewedByAccountId!==admin.id)throw new Error('Volunteer attendance and approved minutes did not persist');
  const volunteerWork=await expectOk(await fetch(base+'/community/volunteers/mine',{headers:headers(memberToken)}));
  if(volunteerWork.approvedMinutes!==120||!volunteerWork.registrations.some(item=>item.id===registrationId&&item.event?.id===eventId))throw new Error('Member volunteer work summary is missing approved time evidence');

  const engagement=await expectOk(await fetch(base+'/community/engagement-requests',{method:'POST',headers:headers(memberToken),body:JSON.stringify({type:'CONSULTATION',subject:'استشارة السلامة البحرية',description:'أحتاج استشارة حول تجهيزات السلامة المناسبة للغوص الجماعي.',requestedFor:'2030-02-15T10:00:00.000Z'})}));
  engagementId=engagement.id;if(engagement.status!=='OPEN'||engagement.requesterAccountId!==member.id)throw new Error('Engagement request did not persist as member-owned open request');
  const otherRequests=await expectOk(await fetch(base+'/community/engagement-requests/mine',{headers:headers(otherToken)}));
  if(otherRequests.some(item=>item.id===engagementId))throw new Error('Other member can view a private engagement request');
  response=await fetch(base+'/community/admin/engagement-requests',{headers:headers(memberToken)});
  if(response.status!==403)throw new Error('Non-admin engagement queue expected 403, got '+response.status);
  const scheduled=await expectOk(await fetch(base+'/community/admin/engagement-requests/'+engagementId+'/status',{method:'PATCH',headers:headers(adminToken),body:JSON.stringify({status:'SCHEDULED',scheduledAt:'2030-02-16T09:30:00.000Z',decisionNotes:'تمت جدولة الاستشارة مع مسؤول السلامة.'})}));
  if(scheduled.status!=='SCHEDULED'||scheduled.decidedByAccountId!==admin.id||!scheduled.scheduledAt)throw new Error('Admin engagement scheduling did not persist decision evidence');
  const myRequests=await expectOk(await fetch(base+'/community/engagement-requests/mine',{headers:headers(memberToken)}));
  if(!myRequests.some(item=>item.id===engagementId&&item.status==='SCHEDULED'))throw new Error('Member engagement list is missing scheduled request');

  console.log('Community HTTP/DB E2E passed: publication review, private ownership, capacity-safe volunteering, approved hours, and scheduled consultation lifecycle.');
}finally{
  if(engagementId)await db.communityEngagementRequest.deleteMany({where:{id:engagementId}}).catch(()=>{});
  if(registrationId)await db.communityVolunteerRegistration.deleteMany({where:{id:registrationId}}).catch(()=>{});
  if(eventId)await db.communityEvent.deleteMany({where:{id:eventId}}).catch(()=>{});
  if(postId)await db.communityPost.deleteMany({where:{id:postId}}).catch(()=>{});
  if(people.length)await db.auditEvent.deleteMany({where:{actorId:{in:people.map(person=>person.id)}}}).catch(()=>{});
  if(adminRole)await db.roleAssignment.deleteMany({where:{id:adminRole.id}}).catch(()=>{});
  for(const account of accounts){await db.session.deleteMany({where:{accountId:account.id}}).catch(()=>{});await db.account.deleteMany({where:{id:account.id}}).catch(()=>{});}
  for(const person of people)await db.person.deleteMany({where:{id:person.id}}).catch(()=>{});
  await db.$disconnect();
}
