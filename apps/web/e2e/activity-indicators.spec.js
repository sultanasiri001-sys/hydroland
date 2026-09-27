import {test,expect} from '@playwright/test';

const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});

test('unread notifications and inbox indicators reach signed-in workspaces and clear when read',async({page})=>{
  const accountId='activity-e2e-account';
  const roles=['INSTRUCTOR','DIVE_CENTER','BOAT_OWNER','ORGANIZATION','ADMIN'].map((role,index)=>({id:`role-${index}`,role,status:'ACTIVE'}));
  const profile={id:accountId,email:'activity@hydroland.test',status:'ACTIVE',roleAssignments:roles,person:{firstName:'Activity',lastName:'E2E',phone:null,professional:null}};
  const notification={id:'notice-e2e',accountId,type:'MESSAGE_RECEIVED',status:'SENT',payload:{title:'رسالة جديدة'},createdAt:new Date().toISOString()};
  const latest={id:'message-e2e',conversationId:'conversation-e2e',senderAccountId:'recipient-e2e',senderEmail:'recipient@hydroland.test',senderFirstName:'Recipient',senderLastName:'E2E',kind:'TEXT',body:'رسالة غير مقروءة',mediaUrl:null,durationSec:null,createdAt:new Date().toISOString()};
  const participants=[{conversationId:'conversation-e2e',accountId,email:profile.email,firstName:'Activity',lastName:'E2E',lastReadAt:null},{conversationId:'conversation-e2e',accountId:'recipient-e2e',email:'recipient@hydroland.test',firstName:'Recipient',lastName:'E2E',lastReadAt:null}];
  const conversation={id:'conversation-e2e',title:'محادثة الاختبار',createdByAccountId:accountId,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),participants,latestMessage:latest};
  let notificationStatus='SENT',lastReadAt=null;
  const authorized=request=>request.headers().authorization==='Bearer activity-e2e-access';

  await page.route(/\/api\/v1\/me$/,route=>authorized(route.request())?json(route,profile):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/credentials$/,route=>authorized(route.request())?json(route,[]):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/me\/diver-profile$/,route=>authorized(route.request())?json(route,{profile:null,equipment:[]}):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/notifications$/,route=>authorized(route.request())?json(route,[{...notification,status:notificationStatus}]):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/notifications\/notice-e2e\/read$/,route=>{
    if(!authorized(route.request()))return json(route,{message:'Unauthorized'},401);
    notificationStatus='READ';return json(route,{id:'notice-e2e',status:'READ'});
  });
  await page.route(/\/api\/v1\/messages\/conversations$/,route=>{
    if(!authorized(route.request()))return json(route,{message:'Unauthorized'},401);
    return route.request().method()==='GET'?json(route,[{...conversation,participants:participants.map(p=>({...p,lastReadAt}))}]):json(route,{message:'Method not allowed'},405);
  });
  await page.route(/\/api\/v1\/messages\/conversations\/conversation-e2e$/,route=>authorized(route.request())?json(route,{...conversation,participants:participants.map(p=>({...p,lastReadAt})),messages:[latest]}):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/messages\/conversations\/conversation-e2e\/read$/,route=>{
    if(!authorized(route.request()))return json(route,{message:'Unauthorized'},401);
    lastReadAt=new Date(Date.now()+1000).toISOString();return json(route,{conversationId:'conversation-e2e',status:'READ'});
  });

  await page.setViewportSize({width:390,height:844});
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandAccountCenter&&window.HydrolandMessages&&window.HydrolandProfile&&window.HydrolandPortalAccess));
  const mobileMessages=page.locator('.mobile-nav button[data-hl-action="messages"]');
  await expect(page.locator('#top-notifications')).toBeHidden();
  await expect(page.locator('#top-messages')).toBeHidden();
  await page.locator('.hl-login-guest').click();
  await expect(page.locator('#top-notifications')).toBeHidden();
  await expect(page.locator('#top-messages')).toBeHidden();
  await expect(mobileMessages).toBeHidden();
  await expect(page.locator('[data-diver-notifications]')).toHaveCount(0);

  await page.evaluate(async()=>{
    sessionStorage.setItem('hl-access-token','activity-e2e-access');
    sessionStorage.setItem('hl-refresh-token','activity-e2e-refresh');
    window.HydrolandAuth.syncAuthUi();
    document.dispatchEvent(new CustomEvent('hydroland:auth-changed'));
    await window.HydrolandProfile.load();
  });
  await expect.poll(()=>page.locator('#top-notifications').getAttribute('data-unread')).toBe('1');
  await expect.poll(()=>page.locator('#top-messages').getAttribute('data-unread')).toBe('1');
  await expect(mobileMessages).toBeVisible();
  await expect(mobileMessages).toHaveAttribute('data-unread','1');
  await expect(page.locator('[data-diver-notifications]')).toHaveAttribute('data-unread','1');
  await expect(page.locator('[data-diver-messages]')).toHaveAttribute('data-unread','1');

  await page.setViewportSize({width:1280,height:900});
  for(const role of ['instructor','center','boat','organization','admin']){
    await page.locator('#role-switch').click();
    await page.locator(`#role-dialog [data-role="${role}"]`).click();
    const dashboard=page.locator(`.hl-role-dashboard[data-role="${role}"]`);
    await expect(dashboard).toBeVisible();
    await expect(dashboard.locator('[data-portal-notifications]')).toHaveAttribute('data-unread','1');
    await expect(dashboard.locator('[data-portal-messages]')).toHaveAttribute('data-unread','1');
    await page.locator('#exit-role').click();
  }

  await page.locator('#top-notifications').click();
  const notificationDialog=page.locator('#hl-notifications-dialog');
  await expect(notificationDialog).toBeVisible();
  await expect(notificationDialog.locator('[data-notification-id="notice-e2e"]')).toContainText('رسالة جديدة');
  await notificationDialog.locator('[data-mark-read]').click();
  await expect.poll(()=>page.locator('#top-notifications').getAttribute('data-unread')).toBeNull();
  await expect(page.locator('[data-diver-notifications]')).not.toHaveAttribute('data-unread',/./);

  await page.locator('.mobile-nav button[data-hl-action="messages"]').click();
  const messagesDialog=page.locator('#hl-messages-dialog');
  await expect(messagesDialog).toBeVisible();
  await messagesDialog.locator('[data-conversation-id="conversation-e2e"]').click();
  await expect(messagesDialog).toContainText('رسالة غير مقروءة');
  await expect.poll(()=>page.locator('#top-messages').getAttribute('data-unread')).toBeNull();
  await expect(page.locator('.mobile-nav button[data-hl-action="messages"]')).not.toHaveAttribute('data-unread',/./);
  await expect(page.locator('[data-diver-messages]')).not.toHaveAttribute('data-unread',/./);
});
