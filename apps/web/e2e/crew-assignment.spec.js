import {test,expect} from '@playwright/test';

// Shipped UI/auth and native command shapes. Real qualification, authority,
// serializable writes and rollback run in the separate HTTP/PostgreSQL suite.
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
const pending=extra=>({id:'assignment-native',tripId:'trip-native',tripTitle:'رحلة أصلية خاصة',roleType:'INSTRUCTOR',status:'PENDING',revision:4,
  accountId:'crew-browser-account',resourceId:'resource-native',startsAt:'2030-12-01T06:00:00Z',endsAt:'2030-12-01T09:00:00Z',
  qualification:{sourceReference:'F02-SOURCE-REV-3',sourceVersion:3,credentialCount:2},
  compensation:{kind:'INSTRUCTOR_AGREEMENT',mode:'FIXED',revision:2,currency:'SAR',fixedMinor:12500,rateBps:0,earningTiming:'AFTER VERIFIED COMPLETION',reversalTerms:'RETURN ON CANCELLATION',financialExecution:false},
  legacyUnverified:false,operationalReady:false,reasons:['F02_CREW_ACCEPTANCE_REQUIRED'],actions:['ACCEPT','REJECT','CANCEL'],...extra});
const workspace=extra=>({trips:[{id:'trip-native',title:'رحلة مركز الاختبار',startsAt:'2030-12-01T06:00:00Z'}],trip:{id:'trip-native',title:'رحلة مركز الاختبار'},
  resources:[{id:'resource-native',type:'INSTRUCTOR',name:'مكلّف أصلي'},{id:'resource-captain',type:'CAPTAIN',name:'قائد أصلي'}],
  sources:[{id:'source-instructor',roleType:'INSTRUCTOR',label:'F02-INSTRUCTOR · v3'},{id:'source-captain',roleType:'CAPTAIN',label:'F02-CAPTAIN · v2'}],
  assignments:[],canPrepareTemplate:false,templateReady:true,...extra});
const panel=page=>page.locator('.hl-crew-assignments');
const record=(page,id='assignment-native')=>panel(page).locator('[data-crew-id="'+id+'"]');

async function install(page,options={}){
  const state={items:[],workspace:workspace(),writes:[],reads:0,responses:0,holdRead:false,holdWrite:false,failWrite:false,locale:'ar',role:'INSTRUCTOR',...options};
  await page.setViewportSize({width:state.locale==='ar'?390:1280,height:900});
  await page.route('**/api/v1/**',route=>json(route,[]));
  await page.route('**/api/v1/auth/google/config',route=>json(route,{enabled:false}));
  await page.route(/\/api\/v1\/me$/,route=>json(route,{id:'crew-browser-account',email:'crew@example.invalid',status:'ACTIVE',emailVerifiedAt:'2026-11-01T00:00:00Z',person:{firstName:'عضو',lastName:'اختبار'},roleAssignments:[{role:state.role,status:'ACTIVE'}]}));
  await page.route(/\/api\/v1\/me\/diver-profile$/,route=>json(route,{profile:null,equipment:[]}));
  await page.route(/\/api\/v1\/trips\/crew\/assignments(?:\/[^?]*)?(?:\?.*)?$/,async route=>{
    const request=route.request(),path=new URL(request.url()).pathname.replace('/api/v1/trips/crew/assignments','');
    expect(request.headers().authorization).toBe('Bearer crew-access');
    if(request.method()==='GET'){
      state.reads++;const response=structuredClone(path==='/mine'?state.items:state.workspace);
      if(state.holdRead)await new Promise(resolve=>{state.releaseRead=resolve;});
      try{await json(route,response);}finally{state.responses++;}return;
    }
    const body=request.postDataJSON();state.writes.push({path,method:request.method(),body});
    if(state.holdWrite)await new Promise(resolve=>{state.releaseWrite=resolve;});
    if(state.denyWrite)return json(route,{message:'Private server details are never displayed'},403);
    if(state.failWrite){state.failWrite=false;return json(route,{message:'Private provider/debug payload'},503);}
    if(path==='/trips/trip-native/proposals'){
      const row=pending({id:'assignment-new',status:body.waitlisted?'WAITLISTED':'PROPOSED',revision:1,resourceId:body.resourceId,actions:body.waitlisted?['PROPOSE','DECLINE','CANCEL']:['DECLINE','CANCEL'],reasons:['F02_INDEPENDENT_APPROVAL_REQUIRED']});
      state.workspace.assignments.push(row);return json(route,row,201);
    }
    const [,id,action]=path.split('/'),item=[...state.items,...state.workspace.assignments].find(row=>row.id===id);
    expect(item,'Selected native assignment must be preserved').toBeTruthy();
    if(action==='respond'){
      expect(request.method()).toBe('PATCH');item.status=body.response;item.operationalReady=body.response==='ACCEPTED';item.reasons=item.operationalReady?[]:['F02_CREW_ACCEPTANCE_REQUIRED'];item.actions=['CANCEL'];
    }else{
      expect(action).toBe('commands');expect(request.method()).toBe('POST');
      item.status={PROPOSE:'PROPOSED',APPROVE:'PENDING',DECLINE:'REJECTED',CANCEL:'CANCELLED'}[body.action];
      item.actions=body.action==='PROPOSE'?['DECLINE','CANCEL']:body.action==='APPROVE'?['CANCEL']:[];
    }
    item.revision++;return json(route,{assignmentId:id,status:item.status,revision:item.revision,financialExecution:false},action==='respond'?200:201);
  });
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandCrewAssignments&&window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandSupport));
  await page.evaluate(locale=>window.HydrolandI18n.setLocale(locale),state.locale);
  await page.evaluate(async()=>{window.HydrolandAuth.acceptSession({accessToken:'crew-access',refreshToken:'crew-refresh'},window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load();});
  await page.locator('#profile-open').click();
  await page.locator('#profile-dialog [data-hl-crew-assignments]').click();
  await expect(panel(page)).toBeVisible();
  return state;
}

test('Arabic mobile crew reads frozen compensation and explicitly accepts the same native revision',async({page})=>{
  const unsafe='<img src=x onerror="window.crewInjected=true"> رحلة خاصة';
  const state=await install(page,{items:[pending({tripTitle:unsafe}),pending({id:'legacy-native',status:'ACCEPTED',legacyUnverified:true,compensation:null,qualification:null,actions:[],reasons:['F02_LEGACY_SOURCE_REVIEW_REQUIRED']})]});
  const item=record(page);await expect(item).toContainText('AFTER VERIFIED COMPLETION');await expect(item).toContainText('F02-SOURCE-REV-3');
  await expect(item).toContainText('بانتظار قبول الشخص بعد تحقق المصدر');await expect(record(page,'legacy-native')).toContainText('تكليف قديم يحتاج مراجعة المصدر');
  await expect(item.locator('img')).toHaveCount(0);expect(await page.evaluate(()=>window.crewInjected)).toBeUndefined();
  await item.getByRole('button',{name:'قبول المهمة',exact:true}).click();expect(state.writes).toHaveLength(0);
  await expect(panel(page).getByRole('status')).toHaveText('ثبّت موافقتك على تفاصيل التعويض قبل القبول.');
  await item.getByLabel('قرأت تفاصيل التعويض المحفوظة وأقبل هذا التكليف').check();
  await item.getByRole('button',{name:'قبول المهمة',exact:true}).click();
  await expect(item).toContainText('تحقق مصدر التأهيل');await expect(item).toContainText('مقبول');
  expect(state.writes).toEqual([{path:'/assignment-native/respond',method:'PATCH',body:{response:'ACCEPTED',expectedRevision:4,reason:'تم قبول تفاصيل التكليف والتعويض المحفوظة',requestId:expect.stringMatching(/^[0-9a-f-]{36}$/)}}]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});

test('manager creates a waitlist proposal using the selected role source and cannot self-approve it',async({page})=>{
  const state=await install(page,{role:'DIVE_CENTER'}),dialog=panel(page);
  await dialog.getByRole('button',{name:'إدارة الطاقم',exact:true}).click();
  await dialog.getByRole('combobox',{name:'المورد البشري',exact:true}).selectOption('resource-native');
  const sources=dialog.getByRole('combobox',{name:'مصدر التأهيل المعتمد',exact:true});
  await expect(sources.locator('option[value="source-captain"]')).toHaveCount(0);await sources.selectOption('source-instructor');
  await dialog.getByLabel('سبب التكليف', {exact:true}).fill('ترشيح موثق على قائمة الانتظار');
  await dialog.getByLabel('إضافة إلى قائمة الانتظار').check();
  await dialog.getByRole('button',{name:'إرسال للاعتماد المستقل'}).click();
  const item=record(page,'assignment-new');await expect(item).toContainText('قائمة الانتظار');
  await expect(item.getByRole('button',{name:'اعتماد التكليف',exact:true})).toHaveCount(0);
  expect(state.writes[0]).toEqual({path:'/trips/trip-native/proposals',method:'POST',body:{resourceId:'resource-native',sourceId:'source-instructor',reason:'ترشيح موثق على قائمة الانتظار',waitlisted:true,requestId:expect.stringMatching(/^[0-9a-f-]{36}$/)}});
  await item.getByLabel('سبب القرار').fill('أصبح المرشح متاحًا للمراجعة');await item.getByRole('button',{name:'ترشيح من الانتظار'}).click();
  await expect(item).toContainText('بانتظار الاعتماد المستقل');expect(state.writes[1].body).toMatchObject({action:'PROPOSE',expectedRevision:1});
  await expect(item.getByRole('button',{name:'اعتماد التكليف',exact:true})).toHaveCount(0);
});

test('English independent reviewer approves a substitute without declaring personal acceptance',async({page})=>{
  const substitute=pending({id:'substitute-native',status:'PROPOSED',revision:6,replacesAssignmentId:'old-native',actions:['APPROVE','DECLINE','CANCEL'],reasons:['F02_INDEPENDENT_APPROVAL_REQUIRED']});
  const state=await install(page,{locale:'en',role:'STAFF',workspace:workspace({assignments:[substitute]})});
  await panel(page).getByRole('button',{name:'Manage crew',exact:true}).click();const item=record(page,'substitute-native');
  await expect(item).toContainText('The original assignment remains in place until the approved substitute accepts.');
  await item.getByLabel('Decision reason').fill('Independent qualification and compensation review');
  await item.getByRole('button',{name:'Approve assignment',exact:true}).click();
  await expect(item).toContainText('Awaiting crew response');await expect(item.getByRole('button',{name:'Accept assignment',exact:true})).toHaveCount(0);
  expect(state.writes).toEqual([{path:'/substitute-native/commands',method:'POST',body:{action:'APPROVE',expectedRevision:6,reason:'Independent qualification and compensation review',requestId:expect.stringMatching(/^[0-9a-f-]{36}$/)}}]);
  await expect(item).toContainText('This action creates no payment or earning.');
});

test('failure retry preserves one command identity and stale authority scrubs private content',async({page})=>{
  const state=await install(page,{items:[pending()],holdWrite:true,failWrite:true}),item=record(page);
  await item.getByLabel('سبب القرار').fill('أعتذر عن هذا التكليف');const decline=item.getByRole('button',{name:'رفض المهمة',exact:true});
  await decline.click();await expect.poll(()=>state.writes.length).toBe(1);await expect(decline).toBeDisabled();
  state.holdWrite=false;state.releaseWrite();await expect(panel(page).getByRole('status')).toHaveText('تعذر الحفظ. أعد المحاولة بنفس القرار.');
  await expect(item).toBeVisible();await expect(item.getByLabel('سبب القرار')).toHaveValue('أعتذر عن هذا التكليف');
  state.denyWrite=true;await decline.click();await expect(panel(page).getByRole('status')).toHaveText('لا تملك صلاحية هذا الإجراء.');
  expect(state.writes).toHaveLength(2);expect(state.writes[1]).toEqual(state.writes[0]);
  await expect(panel(page).locator('[data-crew-id]')).toHaveCount(0);await expect(panel(page)).not.toContainText('رحلة أصلية خاصة');await expect(panel(page)).not.toContainText('Private');
});

test('logout while a private response is pending cannot restore a crew card',async({page})=>{
  const state=await install(page,{role:'STAFF',items:[pending({tripTitle:'PRIVATE-LATE-CREW'})],holdRead:true});
  await expect.poll(()=>Boolean(state.releaseRead)).toBe(true);await page.evaluate(()=>window.HydrolandAuth.terminateSession());
  await expect(panel(page)).toBeHidden();state.releaseRead();await expect.poll(()=>state.responses).toBe(1);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await expect(page.locator('body')).not.toContainText('PRIVATE-LATE-CREW');await expect(panel(page)).toBeHidden();expect(state.writes).toEqual([]);
});
