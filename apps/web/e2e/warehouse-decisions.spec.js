import { test, expect } from '@playwright/test';

test('staff opens warehouse decisions from the profile, reviews the actual count and clears it on logout', async ({page}) => {
  const requests=[];
  const response=(route,data)=>route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
  await page.route('**/api/v1/**',r=>response(r,[]));
  await page.route(/\/api\/v1\/me$/,r=>response(r,{id:'fixture-staff',status:'ACTIVE',person:{firstName:'Test',lastName:'Staff'},roleAssignments:[{role:'STAFF',status:'ACTIVE'}]}));
  await page.route('**/warehouse/workspace',r=>response(r,{organizationId:'fixture',inventory:true,custody:[],lots:[],requests:[
    {id:'COUNT-1',kind:'COUNT',digest:'a'.repeat(64),details:{lotId:'receipt-1',expected:12,counted:9,reason:'<private fixture>'},review:requests.length===0}
  ]}));
  await page.route('**/warehouse/requests/COUNT-1/review',route=>{requests.push(route.request().postDataJSON());return response(route,{});});
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.HydrolandAuth && window.HydrolandProfile);
  await page.evaluate(async()=>{
    window.HydrolandAuth.acceptSession({accessToken:'warehouse-fixture',refreshToken:'warehouse-refresh'},window.HydrolandAuth.beginAuthAttempt());
    await window.HydrolandProfile.load();
  });
  await page.locator('#profile-open').click();
  await page.getByRole('button',{name:'المستودع والعهد',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'المستودع والعهد'});
  await dialog.locator('summary').filter({hasText:'COUNT-1'}).click();
  await expect(dialog).toContainText('فرق الجرد · -3');
  await expect(dialog).toContainText('<private fixture>');
  await dialog.getByRole('button',{name:'مراجعة',exact:true}).click();
  await expect(dialog.getByRole('status')).toContainText('تم الحفظ');
  expect(requests).toEqual([{digest:'a'.repeat(64)}]);
  await page.evaluate(()=>document.dispatchEvent(new Event('hydroland:session-cleared')));
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText('<private fixture>',{exact:false})).toHaveCount(0);
});

test('executive reads procurement grounds before signing the final decision', async ({page}) => {
  const posted=[];
  const response=(r,data)=>r.fulfill({contentType:'application/json',body:JSON.stringify(data)});
  await page.route('**/api/v1/**',r=>response(r,[]));
  await page.route(/\/api\/v1\/me$/,r=>response(r,{id:'owner-test',status:'ACTIVE',person:{firstName:'Owner',lastName:'Test'},roleAssignments:[{role:'ADMIN',status:'ACTIVE'}]}));
  await page.route('**/warehouse/workspace',r=>response(r,{organizationId:'fixture',executive:true,inventory:false,custody:[],lots:[],requests:[{
    id:'PO-test',kind:'PURCHASE',digest:'a'.repeat(64),finalDigest:'b'.repeat(64),details:{quantity:12},reviewedAt:'2026-11-22T00:00:00Z',
    recommendedAt:'2026-11-22T00:01:00Z',recommendation:'DECLINE',recommendationNote:'الكمية تتجاوز الاحتياج',finalize:!posted.length
  }]}));
  await page.route('**/warehouse/requests/PO-test/finalize',r=>{posted.push(r.request().postDataJSON());return response(r,{});});
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.HydrolandAuth && window.HydrolandProfile);
  await page.evaluate(async()=>{
    window.HydrolandAuth.acceptSession({accessToken:'warehouse-executive',refreshToken:'warehouse-refresh'},window.HydrolandAuth.beginAuthAttempt());
    await window.HydrolandProfile.load();
  });
  await page.locator('#profile-open').click();
  await page.getByRole('button',{name:'المستودع والعهد',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'المستودع والعهد'});
  await dialog.locator('summary').filter({hasText:'PO-test'}).click();
  await expect(dialog).toContainText('الكمية تتجاوز الاحتياج');
  await dialog.getByLabel('قرار الإدارة العليا').selectOption('DECLINE');
  await dialog.getByLabel('مسوغات القرار').fill('اعتماد توصية المشتريات بالرفض');
  await dialog.getByRole('button',{name:'تسجيل القرار'}).click();
  await expect(dialog.getByRole('status')).toContainText('تم الحفظ');
  expect(posted).toEqual([{digest:'b'.repeat(64),decision:'DECLINE',note:'اعتماد توصية المشتريات بالرفض'}]);
});

test('custodian returns a partial quantity from an acknowledged issue',async({page})=>{
  const writes=[];
  const respond=(r,data)=>r.fulfill({contentType:'application/json',body:JSON.stringify(data)});
  await page.route('**/api/v1/**',r=>respond(r,[]));
  await page.route(/\/api\/v1\/me$/,r=>respond(r,{id:'custodian',status:'ACTIVE',person:{firstName:'Test',lastName:'Recipient'},roleAssignments:[]}));
  await page.route('**/warehouse/workspace',r=>respond(r,{organizationId:'fixture',inventory:false,executive:false,lots:[],requests:[],
    custody:[],held:[{requestId:'ISSUE-1',lotId:'LOT-1',quantity:3,returned:0,acknowledgedAt:'2026-11-22T01:00:00Z'}]}));
  await page.route('**/warehouse/returns/*',r=>{writes.push(r.request().postDataJSON());return respond(r,{});});
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.HydrolandAuth && window.HydrolandProfile);
  await page.evaluate(async()=>{
    window.HydrolandAuth.acceptSession({accessToken:'warehouse-recipient',refreshToken:'warehouse-refresh'},window.HydrolandAuth.beginAuthAttempt());
    await window.HydrolandProfile.load();
  });
  await page.locator('#profile-open').click();
  await page.getByRole('button',{name:'المستودع والعهد',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'المستودع والعهد'});
  await expect(dialog.getByText('طلب شراء',{exact:true})).toHaveCount(0);
  await dialog.locator('summary').filter({hasText:'إرجاع عهدة'}).click();
  await dialog.getByLabel('مرجع الصرف').fill('ISSUE-1');
  await dialog.getByLabel('الكمية',{exact:true}).fill('2');
  await dialog.getByRole('button',{name:'حفظ',exact:true}).click();
  await expect(dialog.getByRole('status')).toContainText('تم الحفظ');
  expect(writes).toEqual([{issueId:'ISSUE-1',quantity:2}]);
});

async function custodyFixture(page) {
  const state={accountId:'custodian',name:'Test',roles:[],holdReads:false,holdWrites:false,reads:[],writes:[],workspaceRequests:0,denied:false};
  const profile=()=>({id:state.accountId,status:'ACTIVE',person:{firstName:state.name,lastName:'Recipient'},roleAssignments:state.roles});
  const workspace=()=>({organizationId:'fixture',inventory:false,executive:false,lots:[],requests:[],custody:[],held:[{requestId:'ISSUE-'+state.accountId,lotId:'LOT-'+state.accountId,quantity:3,returned:0,acknowledgedAt:'2026-11-22T01:00:00Z'}]});
  const respond=(route,data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  await page.route('**/api/v1/**',route=>respond(route,[]));
  await page.route(/\/api\/v1\/me$/,route=>respond(route,profile()));
  await page.route('**/warehouse/workspace',async route=>{
    state.workspaceRequests++;
    const data=workspace();
    if(state.holdReads)await new Promise(resolve=>state.reads.push({release:async(status=200)=>{await respond(route,status===200?data:{message:'Warehouse access withdrawn'},status);resolve();}}));
    else await respond(route,state.denied?{message:'Warehouse access withdrawn'}:data,state.denied?403:200);
  });
  await page.route('**/warehouse/returns/*',async route=>{
    const write={body:route.request().postDataJSON()};state.writes.push(write);
    if(state.holdWrites)await new Promise(resolve=>{write.release=async()=>{await respond(route,{});resolve();};});
    else await respond(route,{});
  });
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.HydrolandAuth&&window.HydrolandProfile);
  state.signIn=async()=>page.evaluate(async()=>{
    window.HydrolandAuth.acceptSession({accessToken:'warehouse-session',refreshToken:'warehouse-refresh'},window.HydrolandAuth.beginAuthAttempt());
    await window.HydrolandProfile.load();
  });
  await state.signIn();
  state.dialog=page.getByRole('dialog',{name:'المستودع والعهد'});
  state.open=async()=>{
    await page.locator('#profile-open').click();
    await page.getByRole('button',{name:'المستودع والعهد',exact:true}).click();
    await expect(state.dialog.locator('summary').filter({hasText:'إرجاع عهدة'})).toBeVisible();
    await expect.poll(()=>state.dialog.locator(':scope > section').evaluate(node=>node.inert)).toBe(false);
  };
  state.fill=async()=>{
    await state.dialog.locator('summary').filter({hasText:'إرجاع عهدة'}).click();
    await state.dialog.getByLabel('مرجع الصرف').fill('ISSUE-'+state.accountId);
    await state.dialog.getByLabel('الكمية',{exact:true}).fill('2');
  };
  await state.open();
  return state;
}

test('delayed identical profile refresh preserves a custody form and still rechecks warehouse access',async({page})=>{
  const state=await custodyFixture(page);await state.fill();
  state.holdReads=true;state.name='Updated';
  await page.evaluate(()=>window.HydrolandProfile.load());
  await expect.poll(()=>state.reads.length).toBe(1);
  await expect(state.dialog).toBeVisible();
  await expect(state.dialog.getByLabel('مرجع الصرف')).toHaveValue('ISSUE-custodian');
  await expect(state.dialog.getByLabel('الكمية',{exact:true})).toHaveValue('2');
  await expect.poll(()=>state.dialog.locator(':scope > section').evaluate(node=>node.inert)).toBe(true);
  state.holdReads=false;await state.reads[0].release();
  await expect.poll(()=>state.dialog.locator(':scope > section').evaluate(node=>node.inert)).toBe(false);
  await expect(state.dialog.getByLabel('الكمية',{exact:true})).toBeVisible();
  await expect(state.dialog.getByLabel('الكمية',{exact:true})).toHaveValue('2');
  await state.dialog.getByRole('button',{name:'إغلاق',exact:true}).click();
  await state.open();
  await state.fill();
  await state.dialog.getByRole('button',{name:'حفظ',exact:true}).click();
  await expect(state.dialog.getByRole('status')).toHaveText('تم الحفظ');
  expect(state.writes.map(write=>write.body)).toEqual([{issueId:'ISSUE-custodian',quantity:2}]);
});

test('profile refresh closes and clears custody when the server withdraws workspace access',async({page})=>{
  const state=await custodyFixture(page);await state.fill();
  state.denied=true;
  await page.evaluate(()=>window.HydrolandProfile.load());
  await expect(state.dialog).toBeHidden();
  await expect(page.getByText('ISSUE-custodian',{exact:false})).toHaveCount(0);
  await page.locator('#profile-open').click();
  await expect(page.getByRole('button',{name:'المستودع والعهد',exact:true})).toBeHidden();
  expect(state.writes).toHaveLength(0);
});

test('profile refresh waits for a custody POST and the latest reconciliation retains its saved notice',async({page})=>{
  const state=await custodyFixture(page);await state.fill();state.holdWrites=true;
  await state.dialog.getByRole('button',{name:'حفظ',exact:true}).click();
  await expect.poll(()=>state.writes.length).toBe(1);
  const before=state.workspaceRequests;
  await page.evaluate(()=>window.HydrolandProfile.load());
  expect(state.workspaceRequests).toBe(before);
  await expect.poll(()=>state.dialog.locator(':scope > section').evaluate(node=>node.inert)).toBe(true);
  await state.dialog.locator('form').evaluate(form=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  expect(state.writes).toHaveLength(1);
  state.holdReads=true;await state.writes[0].release();
  await expect.poll(()=>state.reads.length).toBe(1);
  await page.evaluate(()=>window.HydrolandProfile.load());
  await expect.poll(()=>state.reads.length).toBe(2);
  await state.reads[0].release();
  await expect.poll(()=>state.dialog.locator(':scope > section').evaluate(node=>node.inert)).toBe(true);
  state.holdReads=false;await state.reads[1].release();
  await expect(state.dialog.getByRole('status')).toHaveText('تم الحفظ');
  await expect.poll(()=>state.dialog.locator(':scope > section').evaluate(node=>node.inert)).toBe(false);
  await expect(state.dialog.getByLabel('مرجع الصرف')).toHaveValue('');
  await expect(state.dialog.getByLabel('الكمية',{exact:true})).toHaveValue('');
  expect(state.writes).toHaveLength(1);
  await state.fill();
  await state.dialog.getByRole('button',{name:'تحديث',exact:true}).click();
  await expect(state.dialog.getByLabel('مرجع الصرف')).toHaveValue('');
});

test('an old account custody POST cannot unlock or repaint a new account operation',async({page})=>{
  const state=await custodyFixture(page);await state.fill();state.holdWrites=true;
  await state.dialog.getByRole('button',{name:'حفظ',exact:true}).click();
  await expect.poll(()=>state.writes.length).toBe(1);
  state.accountId='next-custodian';await state.signIn();
  await expect(state.dialog).toBeHidden();
  await expect(page.getByText('ISSUE-custodian',{exact:false})).toHaveCount(0);
  await state.open();await state.fill();
  await state.dialog.getByRole('button',{name:'حفظ',exact:true}).click();
  await expect.poll(()=>state.writes.length).toBe(2);
  await state.writes[0].release();
  await expect.poll(()=>state.dialog.locator(':scope > section').evaluate(node=>node.inert)).toBe(true);
  await expect(state.dialog.getByRole('status')).not.toHaveText('تم الحفظ');
  await state.dialog.locator('form').evaluate(form=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  expect(state.writes).toHaveLength(2);
  await state.writes[1].release();
  await expect(state.dialog.getByRole('status')).toHaveText('تم الحفظ');
  await expect.poll(()=>state.dialog.locator(':scope > section').evaluate(node=>node.inert)).toBe(false);
  expect(state.writes.map(write=>write.body.issueId)).toEqual(['ISSUE-custodian','ISSUE-next-custodian']);
});

test('custody reads cannot restore private data after authority changes, portal changes or logout',async({page})=>{
  const state=await custodyFixture(page);await state.fill();
  state.holdReads=true;await page.evaluate(()=>window.HydrolandProfile.load());
  await expect.poll(()=>state.reads.length).toBe(1);
  await page.evaluate(()=>document.dispatchEvent(new Event('hydroland:portal-cleared')));
  await expect(state.dialog).toBeHidden();
  state.holdReads=false;await state.reads[0].release();
  await expect(page.getByText('ISSUE-custodian',{exact:false})).toHaveCount(0);
  await page.evaluate(()=>window.HydrolandProfile.load());await state.open();
  state.roles=[{role:'STAFF',status:'ACTIVE'}];await page.evaluate(()=>window.HydrolandProfile.load());
  await expect(state.dialog).toBeHidden();
  await state.open();
  await page.evaluate(()=>document.dispatchEvent(new CustomEvent('hydroland:role-changed',{detail:{role:'diver'}})));
  await expect(state.dialog).toBeHidden();
  await state.open();state.holdReads=true;
  await page.evaluate(()=>window.HydrolandProfile.load());
  await expect.poll(()=>state.reads.length).toBe(2);
  await page.evaluate(()=>window.HydrolandAuth.logout());
  await expect(state.dialog).toBeHidden();
  state.holdReads=false;await state.reads[1].release();
  await expect(page.getByText('ISSUE-custodian',{exact:false})).toHaveCount(0);
  expect(state.writes).toHaveLength(0);
});
