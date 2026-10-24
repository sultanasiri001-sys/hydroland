import {test,expect} from '@playwright/test';

const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
const notice=()=>({id:'safety-test-e2e',type:'SAFETY_TEST',status:'SENT',createdAt:new Date().toISOString(),payload:{title:'تنبيه سلامة تجريبي — منطقة الرأس',message:'مثال تجريبي: خطر في منطقة الرأس. هذه محاكاة لحسابك فقط، ولا تعني وجود خطر فعلي في المنطقة.',areaLabel:'منطقة الرأس',isTest:true}});
const authenticate=page=>page.evaluate(()=>{
  const attempt=window.HydrolandAuth.beginAuthAttempt();
  window.HydrolandAuth.acceptSession({accessToken:'notification-e2e-access',refreshToken:'notification-e2e-refresh'},attempt);
});

async function setup(page){
  const state={rows:[],listFails:false,createFails:false,creates:0,waitForCreate:null};
  const authorized=route=>route.request().headers().authorization==='Bearer notification-e2e-access';
  await page.route(/\/api\/v1\/me$/,route=>json(route,{id:'notification-e2e-account',email:'notifications@example.invalid',status:'ACTIVE',roleAssignments:[],person:{firstName:'Notification',lastName:'Test',professional:null}}));
  await page.route(/\/api\/v1\/credentials$/,route=>json(route,[]));
  await page.route(/\/api\/v1\/me\/diver-profile$/,route=>json(route,{profile:null,equipment:[]}));
  await page.route(/\/api\/v1\/messages\/conversations$/,route=>json(route,[]));
  await page.route(/\/api\/v1\/notifications$/,route=>{
    if(!authorized(route))return json(route,[]);
    if(state.listFails)return json(route,{message:'تعذر تحميل الإشعارات مؤقتًا'},503);
    // During a rolling deployment, old API responses must not surface auth challenges either.
    return json(route,[...state.rows,{id:'challenge-e2e',type:'AUTH_PASSWORD_RESET',status:'PENDING',payload:{purpose:'RESET_PASSWORD',expiresAt:'private-auth-metadata'}}]);
  });
  await page.route(/\/api\/v1\/notifications\/safety-test$/,async route=>{
    if(!authorized(route))return json(route,{message:'Unauthorized'},401);
    expect(route.request().method()).toBe('POST');expect(route.request().postData()).toBeNull();
    state.creates++;
    if(state.waitForCreate)await state.waitForCreate;
    if(state.createFails)return json(route,{message:'تعذر إنشاء التنبيه التجريبي. حاول مرة أخرى.'},503);
    const created=!state.rows.length;
    if(created)state.rows.push(notice());
    return json(route,{created,notification:state.rows[0]});
  });
  await page.route(/\/api\/v1\/notifications\/safety-test-e2e\/read$/,route=>{
    if(!authorized(route))return json(route,{message:'Unauthorized'},401);
    state.rows[0].status='READ';return json(route,{id:'safety-test-e2e',status:'READ'});
  });
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandAccountCenter&&window.HydrolandAuth&&window.HydrolandProfile));
  await authenticate(page);
  await page.evaluate(()=>window.HydrolandAccountCenter.openNotifications());
  return state;
}

test('self-only safety test has clear Arabic simulation labels, persists and clears its unread badge',async({page},testInfo)=>{
  await page.setViewportSize({width:390,height:844});
  const state=await setup(page),dialog=page.getByRole('dialog',{name:'الإشعارات'});
  await expect(dialog).toContainText('لا توجد إشعارات جديدة');
  await expect(dialog).not.toContainText('RESET_PASSWORD');
  await expect(page.locator('#top-notifications')).not.toHaveAttribute('data-unread',/./);
  await dialog.getByRole('button',{name:'تجربة تنبيه سلامة'}).click();
  const card=dialog.locator('[data-notification-id="safety-test-e2e"]');
  await expect(card.getByRole('heading')).toHaveText('تنبيه سلامة تجريبي — منطقة الرأس');
  await expect(card).toContainText('تجريبي · حسابك فقط');
  await expect(card).toContainText('ليس بلاغًا عن خطر فعلي');
  await expect(card).toContainText('المنطقة: منطقة الرأس');
  await expect(page.locator('#top-notifications')).toHaveAttribute('data-unread','1');
  await expect(dialog).toHaveAttribute('dir','rtl');
  for(const width of [390,1280]){
    await page.setViewportSize({width,height:900});
    expect(await dialog.evaluate(element=>element.scrollWidth<=element.clientWidth+1)).toBe(true);
    await page.screenshot({path:testInfo.outputPath(`account-safety-notification-${width}.png`)});
  }
  await card.getByRole('button',{name:'تحديد كمقروء'}).click();
  await expect(card).toContainText('مقروء');
  await expect(page.locator('#top-notifications')).not.toHaveAttribute('data-unread',/./);
  await dialog.getByRole('button',{name:'تجربة تنبيه سلامة'}).click();
  await expect(dialog.getByRole('status')).toContainText('موجود بالفعل');
  await expect(dialog.locator('[data-notification-id]')).toHaveCount(1);
  expect(state.rows).toHaveLength(1);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandAccountCenter));
  await page.evaluate(()=>window.HydrolandAccountCenter.openNotifications());
  await expect(card).toContainText('مقروء');
});

test('notification load and test creation errors can be retried without false success',async({page})=>{
  const state=await setup(page),dialog=page.getByRole('dialog',{name:'الإشعارات'});
  state.listFails=true;
  await page.evaluate(()=>window.HydrolandAccountCenter.openNotifications());
  await expect(dialog.getByRole('alert')).toContainText('تعذر تحميل');
  state.listFails=false;
  await dialog.getByRole('button',{name:'إعادة المحاولة'}).click();
  await expect(dialog).toContainText('لا توجد إشعارات جديدة');
  state.createFails=true;
  await dialog.getByRole('button',{name:'تجربة تنبيه سلامة'}).click();
  await expect(dialog.getByRole('status')).toContainText('تعذر إنشاء');
  await expect(dialog.locator('[data-notification-id]')).toHaveCount(0);
  state.createFails=false;
  await dialog.getByRole('button',{name:'تجربة تنبيه سلامة'}).click();
  await expect(dialog.locator('[data-notification-id]')).toHaveCount(1);
});

test('pending safety test cannot reopen or leak the previous account notification after logout',async({page})=>{
  const state=await setup(page),dialog=page.getByRole('dialog',{name:'الإشعارات'});
  let release;state.waitForCreate=new Promise(resolve=>{release=resolve});
  await dialog.getByRole('button',{name:'تجربة تنبيه سلامة'}).click();
  await expect.poll(()=>state.creates).toBe(1);
  await expect(dialog.getByRole('button',{name:'تجربة تنبيه سلامة'})).toBeDisabled();
  await page.evaluate(()=>window.HydrolandAuth.terminateSession());
  await expect(dialog).not.toBeVisible();
  await page.evaluate(()=>{
    const attempt=window.HydrolandAuth.beginAuthAttempt();
    window.HydrolandAuth.acceptSession({accessToken:'other-e2e-access',refreshToken:'other-e2e-refresh'},attempt);
  });
  const response=page.waitForResponse(/\/notifications\/safety-test$/);release();await response;
  await page.evaluate(()=>window.HydrolandAccountCenter.openNotifications());
  await expect(dialog).toContainText('لا توجد إشعارات جديدة');
  await expect(dialog.locator('[data-notification-id]')).toHaveCount(0);
  await expect(page.locator('#top-notifications')).not.toHaveAttribute('data-unread',/./);
});

test('notification content is escaped and internal payload keys stay out of the interface',async({page})=>{
  const state=await setup(page),dialog=page.getByRole('dialog',{name:'الإشعارات'});
  state.rows=[{id:'message-e2e',type:'MESSAGE_RECEIVED',status:'SENT',payload:{title:'<img src=x onerror=alert(1)>',message:'رسالة من المنصة',conversationId:'private-conversation-id',messageId:'internal-message-id'},createdAt:new Date().toISOString()}];
  await page.evaluate(()=>window.HydrolandAccountCenter.openNotifications());
  await expect(dialog.getByRole('heading',{level:3})).toHaveText('<img src=x onerror=alert(1)>');
  await expect(dialog.locator('img')).toHaveCount(0);
  await expect(dialog).not.toContainText('private-conversation-id');
  await expect(dialog).not.toContainText('MESSAGE_RECEIVED');
});
