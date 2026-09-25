import { test, expect } from '@playwright/test';

const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});

test('messages control is auth-gated and authenticated member can read text/voice and send text',async({page})=>{
  const profile={id:'sender-e2e',email:'sender@hydroland.test',status:'ACTIVE',roleAssignments:[],person:{firstName:'Sender',lastName:'E2E',phone:null,professional:null}};
  const participants=[{conversationId:'conversation-e2e',accountId:'sender-e2e',email:'sender@hydroland.test',firstName:'Sender',lastName:'E2E'},{conversationId:'conversation-e2e',accountId:'recipient-e2e',email:'recipient@hydroland.test',firstName:'Recipient',lastName:'E2E'}];
  const messages=[
    {id:'m-text',conversationId:'conversation-e2e',senderAccountId:'recipient-e2e',senderEmail:'recipient@hydroland.test',senderFirstName:'Recipient',senderLastName:'E2E',kind:'TEXT',body:'جاهزون للرحلة',mediaUrl:null,durationSec:null,createdAt:new Date().toISOString()},
    {id:'m-voice',conversationId:'conversation-e2e',senderAccountId:'recipient-e2e',senderEmail:'recipient@hydroland.test',senderFirstName:'Recipient',senderLastName:'E2E',kind:'VOICE',body:null,mediaUrl:'https://media.hydroland.test/e2e.m4a',durationSec:8,createdAt:new Date().toISOString()}
  ];
  const list=()=>[{id:'conversation-e2e',title:'رحلة جزيرة سمر',createdByAccountId:'sender-e2e',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),participants,latestMessage:messages[messages.length-1]}];
  const requireAuth=request=>request.headers().authorization==='Bearer messaging-e2e-access';
  await page.route(/\/api\/v1\/me$/,route=>requireAuth(route.request())?json(route,profile):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/credentials$/,route=>requireAuth(route.request())?json(route,[]):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/me\/diver-profile$/,route=>requireAuth(route.request())?json(route,{profile:null,equipment:[]}):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/messages\/conversations$/,async route=>{
    if(!requireAuth(route.request()))return json(route,{message:'Unauthorized'},401);
    if(route.request().method()==='GET')return json(route,list());
    return json(route,{id:'conversation-new',title:'New',participants:[]},201);
  });
  await page.route(/\/api\/v1\/messages\/conversations\/conversation-e2e$/,route=>requireAuth(route.request())?json(route,{...list()[0],messages}):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/messages\/conversations\/conversation-e2e\/read$/,route=>requireAuth(route.request())?json(route,{conversationId:'conversation-e2e',status:'READ'}):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/messages\/conversations\/conversation-e2e\/messages$/,route=>{
    if(!requireAuth(route.request()))return json(route,{message:'Unauthorized'},401);
    const body=route.request().postDataJSON();const created={id:'m-'+(messages.length+1),conversationId:'conversation-e2e',senderAccountId:'sender-e2e',senderEmail:'sender@hydroland.test',senderFirstName:'Sender',senderLastName:'E2E',kind:body.kind,body:body.body??null,mediaUrl:body.mediaUrl??null,durationSec:body.durationSec??null,createdAt:new Date().toISOString()};messages.push(created);return json(route,created,201);
  });

  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandMessages&&window.HydrolandAuth&&window.HydrolandProfile));
  await expect(page.locator('#top-messages')).toBeVisible();

  await page.locator('.hl-login-guest').click();
  await expect(page.locator('.hl-login')).toHaveClass(/hidden/);
  await page.locator('#top-messages').click();
  await expect(page.locator('.hl-login')).not.toHaveClass(/hidden/);
  await expect(page.locator('#hl-messages-dialog')).not.toBeVisible();

  await page.evaluate(async()=>{sessionStorage.setItem('hl-access-token','messaging-e2e-access');sessionStorage.setItem('hl-refresh-token','messaging-e2e-refresh');window.HydrolandAuth.syncAuthUi();await window.HydrolandProfile.load()});
  await page.locator('#top-messages').click();
  const dialog=page.locator('#hl-messages-dialog');await expect(dialog).toBeVisible();
  await expect(dialog.locator('[data-conversation-id="conversation-e2e"]')).toContainText('رحلة جزيرة سمر');
  await dialog.locator('[data-conversation-id="conversation-e2e"]').click();
  await expect(dialog).toContainText('جاهزون للرحلة');
  await expect(dialog.locator('audio[src="https://media.hydroland.test/e2e.m4a"]')).toHaveCount(1);
  await dialog.locator('textarea[name="body"]').fill('تم التأكيد من طرفي');
  await dialog.locator('[data-message-form] button[type="submit"]').click();
  await expect(dialog).toContainText('تم التأكيد من طرفي');
  expect(messages.at(-1)?.kind).toBe('TEXT');
  expect(messages.at(-1)?.body).toBe('تم التأكيد من طرفي');
});
