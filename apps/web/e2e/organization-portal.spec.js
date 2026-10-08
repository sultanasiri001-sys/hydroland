import {test,expect} from '@playwright/test';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';

const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});

async function install(page,{role='OWNER',displayName='شركة الاختبار'}={}){
 const state={membership:{id:'org-member-1',organizationId:'org-1',role,status:'ACTIVE',organization:{id:'org-1',displayName,kind:'COMPANY',legalName:null,registrationNumber:null,regionCode:'ASIR',status:'ACTIVE'}},members:[{id:'org-member-1',role:'OWNER',status:'ACTIVE',account:{email:'owner@example.invalid',person:{firstName:'سلطان',lastName:'المالك'}}}],writes:[],memberInvites:[],pendingMembers:null,membersRoute:null,requestCases:[{id:'case-1',type:'QUESTION',status:'OPEN',priority:'NORMAL',subject:'متابعة حجز الشركة',description:'نحتاج تحديث حالة الطلب',createdAt:'2026-10-05T08:00:00.000Z',updatedAt:'2026-10-05T08:00:00.000Z',interactions:[{id:'reply-1',actorType:'CUSTOMER',channel:'WEB',message:'تم إرسال الطلب',createdAt:'2026-10-05T08:00:00.000Z'}]}],requestWrites:[],replyWrites:[],pendingRequests:null,requestsRoute:null,bookings:[],bookingWrites:[],participantWrites:[],cancellations:[],incidents:[],incidentWrites:[]};
 const profile={id:'organization-user-1',email:'owner@example.invalid',status:'ACTIVE',roleAssignments:[{id:'organization-role-1',role:'ORGANIZATION',status:'ACTIVE'}],person:{firstName:'سلطان',lastName:'المالك'}};
 await page.route('**/api/v1/**',route=>json(route,[]));
 await page.route('**/api/v1/auth/google/config',route=>json(route,{enabled:false}));
 await page.route(/\/api\/v1\/me$/,route=>json(route,profile));
 await page.route(/\/api\/v1\/me\/diver-profile$/,route=>json(route,{profile:null,equipment:[]}));
 await page.route(/\/api\/v1\/organizations\/mine$/,route=>json(route,[state.membership]));
 await page.route(/\/api\/v1\/finance\/mine\/payments$/,route=>json(route,[]));
 await page.route(/\/api\/v1\/documents\/organizations\/org-1\/(templates|list)$/,route=>json(route,[]));
 await page.route(/\/api\/v1\/organizations\/org-1\/members$/,async route=>{state.membersRoute=route;if(state.pendingMembers)await state.pendingMembers;if(route.request().method()==='POST'){const body=route.request().postDataJSON(),member={id:'org-member-'+(state.memberInvites.length+2),organizationId:'org-1',role:body.role,status:'PENDING',updatedAt:'2026-10-05T09:00:00.000Z',account:{email:body.email,person:{firstName:'عضو',lastName:'جديد'}}};state.memberInvites.push(body);state.members.push(member);return json(route,member,201)}return json(route,state.members)});
 await page.route(/\/api\/v1\/organizations\/org-1\/requests(?:\?.*)?$/,async route=>{state.requestsRoute=route;if(state.pendingRequests)await state.pendingRequests;if(route.request().method()==='POST'){const body=route.request().postDataJSON();state.requestWrites.push(body);const record={id:'case-new-'+state.requestWrites.length,...body,status:'OPEN',priority:'NORMAL',createdAt:'2026-10-05T09:00:00.000Z',updatedAt:'2026-10-05T09:00:00.000Z',interactions:[{id:'reply-new',actorType:'CUSTOMER',channel:'WEB',message:body.description,createdAt:'2026-10-05T09:00:00.000Z'}]};state.requestCases.unshift(record);return json(route,record,201)}return json(route,{items:state.requestCases,total:state.requestCases.length,page:1,pageSize:20,totalPages:1})});
 await page.route(/\/api\/v1\/organizations\/org-1\/requests\/case-1\/replies$/,async route=>{const body=route.request().postDataJSON();state.replyWrites.push(body);return json(route,{id:'reply-new',actorType:'CUSTOMER',channel:'WEB',message:body.message,createdAt:'2026-10-05T09:10:00.000Z'},201)});
 await page.route(/\/api\/v1\/trips$/,route=>json(route,[{id:'trip-1',title:'رحلة الساحل',type:'BOAT',status:'OPEN',startsAt:'2026-12-01T08:00:00.000Z',remainingSeats:8,price:{configured:true,pricePerSeatMinor:25000,currency:'SAR'}}]));
 await page.route(/\/api\/v1\/organizations\/org-1\/bookings(?:\?.*)?$/,async route=>{if(route.request().method()==='POST'){const body=route.request().postDataJSON();state.bookingWrites.push(body);const booking={id:'booking-1',tripId:body.tripId,status:'PENDING',seats:body.seats,updatedAt:'2026-10-05T09:00:00.000Z',trip:{title:'رحلة الساحل',startsAt:'2026-12-01T08:00:00.000Z'},participants:(body.participantNames.length?body.participantNames:Array.from({length:body.seats},(_,i)=>`مشارك ${i+1}`)).map((fullName,i)=>({id:'participant-'+i,fullName,eligibilityStatus:'PENDING'}))};state.bookings.unshift(booking);return json(route,{...booking,price:{configured:true,pricePerSeatMinor:25000}},201)}return json(route,{items:state.bookings,total:state.bookings.length,page:1,pageSize:50,totalPages:1})});
 await page.route(/\/api\/v1\/organizations\/org-1\/bookings\/booking-1\/participants\/participant-0$/,async route=>{state.participantWrites.push(route.request().postDataJSON());return json(route,{ok:true})});
 await page.route(/\/api\/v1\/organizations\/org-1\/bookings\/booking-1\/cancel$/,async route=>{state.cancellations.push(route.request().postDataJSON());state.bookings[0].status='CANCELLED';return json(route,{status:'CANCELLED'})});
 await page.route(/\/api\/v1\/organizations\/org-1\/safety\/incidents$/,async route=>{if(route.request().method()==='POST'){const body=route.request().postDataJSON();state.incidentWrites.push(body);const record={id:'incident-1',...body,status:'OPEN',createdAt:'2026-10-05T09:00:00.000Z',trip:{title:'رحلة الساحل'}};state.incidents.unshift(record);return json(route,record,201)}return json(route,state.incidents)});
 await page.route(/\/api\/v1\/organizations\/org-1$/,async route=>{
  if(route.request().method()!=='PATCH')return json(route,{message:'Method not allowed'},405);
  const body=route.request().postDataJSON();state.writes.push(body);state.membership.organization={...state.membership.organization,...body};return json(route,state.membership.organization);
 });
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandOrganizations));
 await page.evaluate(async()=>{window.HydrolandAuth.acceptSession({accessToken:'organization-access',refreshToken:'organization-refresh'},window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load()});
 await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role="organization"]').click();
 await expect(page.locator('.hl-role-dashboard[data-role="organization"]')).toBeVisible();
 await expect(page.locator('.hl-organizations [data-org-list] [data-org-id="org-1"]')).toBeVisible();
 return state;
}

test('organization owner edits its profile and the saved values reload from the organization API',async({page})=>{
 const state=await install(page);const card=page.locator('[data-org-id="org-1"]');
 await card.locator('[data-org-edit]').click();const form=page.locator('[data-org-form]');
 await expect(form.locator('[name="displayName"]')).toHaveValue('شركة الاختبار');
 await form.locator('[name="displayName"]').fill('شركة HYDROLAND');await form.locator('[name="legalName"]').fill('شركة هيدرولاند البحرية');await form.locator('[name="registrationNumber"]').fill('CR-123');
 await form.locator('[type="submit"]').click();await expect(page.locator('[data-org-note]')).toContainText('حُفظت تعديلات الجهة');
 await expect(page.locator('[data-org-id="org-1"]')).toContainText('شركة HYDROLAND');
 expect(state.writes).toEqual([{displayName:'شركة HYDROLAND',kind:'COMPANY',legalName:'شركة هيدرولاند البحرية',registrationNumber:'CR-123',regionCode:'ASIR'}]);
});

test('organization managers see scoped memberships while ordinary members do not',async({page})=>{
 const state=await install(page);const card=page.locator('[data-org-id="org-1"]');await card.locator('[data-org-view-members]').click();
 const directory=page.locator('[data-org-members]');await expect(directory).toContainText('سلطان المالك');await expect(directory).toContainText('مالك الجهة');await expect(directory).toContainText('owner@example.invalid');
 await page.evaluate(()=>window.HydrolandAuth.terminateSession());
 expect(state.writes).toHaveLength(0);
});

test('organization owner sends an email invitation with a scoped role',async({page})=>{
 const state=await install(page);await page.locator('[data-org-id="org-1"] [data-org-view-members]').click();const invite=page.locator('[data-org-invite]');
 await invite.locator('[name="email"]').fill('member@example.invalid');await invite.locator('[name="role"]').selectOption('STAFF');await invite.locator('[type="submit"]').click();
 await expect(page.locator('[data-org-members]')).toContainText('عضو جديد');await expect(page.locator('[data-org-members]')).toContainText('دعوة معلّقة');expect(state.memberInvites).toEqual([{email:'member@example.invalid',role:'STAFF'}]);
});

test('view-only organization member cannot edit or enumerate organization memberships',async({page})=>{
 const state=await install(page,{role:'VIEWER'});const card=page.locator('[data-org-id="org-1"]');
 await expect(card.locator('[data-org-edit]')).toHaveCount(0);await expect(card.locator('[data-org-view-members]')).toHaveCount(0);
 expect(state.writes).toHaveLength(0);
});

test('organization directory escapes profile fields and drops late responses after logout',async({page})=>{
 const state=await install(page,{displayName:'<img src=x onerror="window.orgXss=1">'});const card=page.locator('[data-org-id="org-1"]');
 await expect(card).toContainText('<img src=x');await expect(card.locator('img')).toHaveCount(0);expect(await page.evaluate(()=>window.orgXss)).toBeUndefined();
 let release;state.pendingMembers=new Promise(resolve=>release=resolve);await card.locator('[data-org-view-members]').click();await expect.poll(()=>Boolean(state.membersRoute)).toBe(true);
 await page.evaluate(()=>window.HydrolandAuth.terminateSession());release();await expect(page.locator('[data-org-members]')).toBeHidden();await expect(page.locator('[data-org-members]')).not.toContainText('owner@example.invalid');
});

test('organization operator opens a case, replies, and sees the saved thread',async({page})=>{
 const state=await install(page,{role:'OPERATOR'});const card=page.locator('[data-org-id="org-1"]');await card.locator('[data-org-requests-open]').click();
 const requests=page.locator('[data-org-requests]');await expect(requests).toBeVisible();await expect(requests).toContainText('متابعة حجز الشركة');
 const create=requests.locator('[data-org-request-form]');await create.locator('[name="type"]').selectOption('SUPPORT');await create.locator('[name="subject"]').fill('طلب دعم جديد');await create.locator('[name="description"]').fill('نرجو التواصل بخصوص الرحلة القادمة');await create.locator('[type="submit"]').click();
 await expect(requests).toContainText('تم إرسال الطلب وحفظه');expect(state.requestWrites).toEqual([{type:'SUPPORT',subject:'طلب دعم جديد',description:'نرجو التواصل بخصوص الرحلة القادمة'}]);
 const firstCase=requests.locator('[data-org-case-id="case-1"]');await firstCase.locator('[name="message"]').fill('وصلنا، شكرًا');await firstCase.locator('[type="submit"]').click();await expect.poll(()=>state.replyWrites.length).toBe(1);expect(state.replyWrites).toEqual([{message:'وصلنا، شكرًا'}]);
});

test('organization viewer can read cases but cannot create or reply',async({page})=>{
 const state=await install(page,{role:'VIEWER'});await page.locator('[data-org-id="org-1"] [data-org-requests-open]').click();const requests=page.locator('[data-org-requests]');
 await expect(requests).toContainText('متابعة حجز الشركة');await expect(requests.locator('[data-org-request-form]')).toBeHidden();await expect(requests.locator('[data-org-case-reply]')).toHaveCount(0);expect(state.requestWrites).toHaveLength(0);expect(state.replyWrites).toHaveLength(0);
});

test('organization request content is escaped and late list data is discarded after logout',async({page})=>{
 const state=await install(page);state.requestCases[0].subject='<img src=x onerror="window.orgRequestXss=1">';
 await page.locator('[data-org-id="org-1"] [data-org-requests-open]').click();const requests=page.locator('[data-org-requests]');await expect(requests.locator('[data-org-case-id="case-1"]')).toContainText('<img src=x');await expect(requests.locator('img')).toHaveCount(0);expect(await page.evaluate(()=>window.orgRequestXss)).toBeUndefined();
 let release;state.pendingRequests=new Promise(resolve=>release=resolve);await page.locator('[data-org-requests-close]').click();state.requestsRoute=null;await page.locator('[data-org-id="org-1"] [data-org-requests-open]').click();await expect.poll(()=>Boolean(state.requestsRoute)).toBe(true);await page.evaluate(()=>window.HydrolandAuth.terminateSession());release();await expect(requests).toBeHidden();await expect(requests).not.toContainText('<img src=x');
});

test('organization operator books a trip, submits participant snapshots and can update the roster',async({page})=>{
 const state=await install(page,{role:'OPERATOR'});await page.locator('[data-org-id="org-1"] [data-org-bookings-open]').click();
 const panel=page.locator('[data-org-bookings]');await expect(panel).toBeVisible();await panel.locator('[name="tripId"]').selectOption('trip-1');await panel.locator('[name="seats"]').fill('1');await panel.locator('[name="participantNames"]').fill('سارة الغامدي');await panel.locator('[data-org-booking-submit]').click();
 await expect(panel).toContainText('تم تسجيل طلب الحجز بحالة انتظار');expect(state.bookingWrites).toHaveLength(1);expect(state.bookingWrites[0]).toMatchObject({tripId:'trip-1',seats:1,participantNames:['سارة الغامدي']});
 const participant=panel.locator('[data-org-participant]');await participant.locator('[name="fullName"]').fill('سارة أ. الغامدي');await participant.locator('button').click();await expect.poll(()=>state.participantWrites.length).toBe(1);expect(state.participantWrites[0].expectedUpdatedAt).toBe('2026-10-05T09:00:00.000Z');
});

test('participant save preserves the displayed revision and submitted values during a delayed write',async({page})=>{
 const state=await install(page,{role:'OPERATOR'});
 state.bookings.push({id:'booking-1',tripId:'trip-1',status:'PENDING',seats:1,updatedAt:'2026-10-05T09:00:00.000Z',trip:{title:'رحلة الساحل',startsAt:'2026-12-01T08:00:00.000Z'},participants:[{id:'participant-0',fullName:'سارة الغامدي',eligibilityStatus:'PENDING'}]});
 await page.locator('[data-org-id="org-1"] [data-org-bookings-open]').click();
 const form=page.locator('[data-org-participant]');await expect(form).toBeVisible();
 // Another manager changed the saved booking after this form was rendered.
 state.bookings[0].updatedAt='2026-10-05T09:01:00.000Z';
 let release;const pending=new Promise(resolve=>release=resolve);
 await page.route(/\/api\/v1\/organizations\/org-1\/bookings\/booking-1\/participants\/participant-0$/,async route=>{state.participantWrites.push(route.request().postDataJSON());await pending;return json(route,{message:'تغير الحجز؛ حدّث الصفحة قبل تعديل القائمة.'},409)});
 await form.locator('[name="fullName"]').fill('سارة الاسم المرسل');await form.locator('button').click();
 await expect.poll(()=>state.participantWrites.length).toBe(1);await form.locator('[name="fullName"]').fill('سارة تعديل لاحق');release();
 expect(state.participantWrites[0].fullName).toBe('سارة الاسم المرسل');
 expect(state.participantWrites[0].expectedUpdatedAt).toBe('2026-10-05T09:00:00.000Z');
 await expect(page.locator('[data-org-note]')).toContainText('تغير الحجز');await expect(form.locator('button')).toBeEnabled();
});

test('organization staff submits a booking-linked safety incident',async({page})=>{
 const state=await install(page,{role:'STAFF'});state.bookings.push({id:'booking-1',tripId:'trip-1',status:'CONFIRMED',seats:1,updatedAt:'2026-10-05T09:00:00.000Z',trip:{title:'رحلة الساحل',startsAt:'2026-12-01T08:00:00.000Z'},participants:[]});
 await page.locator('[data-org-id="org-1"] [data-org-safety-open]').click();const panel=page.locator('[data-org-safety]');await expect(panel).toBeVisible();await panel.locator('[name="bookingId"]').selectOption('booking-1');await panel.locator('[name="title"]').fill('ملاحظة معدات');await panel.locator('[name="description"]').fill('تم رصد سترة تحتاج مراجعة قبل الرحلة.');await panel.locator('button[type="submit"]').click();
 await expect(panel).toContainText('تم تسجيل البلاغ');expect(state.incidentWrites).toMatchObject([{bookingId:'booking-1',severity:'LOW',title:'ملاحظة معدات'}]);
});
