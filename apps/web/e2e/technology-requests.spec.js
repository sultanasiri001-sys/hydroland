import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
const policy='TECHNOLOGY_REQUEST_V1';
const source={id:randomUUID(),label:'TEC-REQUEST-001 · APPROVED',version:1,contentHash:'a'.repeat(64),scopeReference:'CI-SYSTEM'};
const employee={id:randomUUID(),label:'منفذ تقني مستقل'};
const changeSource={id:randomUUID(),label:'TEC-CHANGE-001 · APPROVED'};
const incidentSource={id:randomUUID(),label:'TEC-INCIDENT-001 · HIGH'};
const riskSource={id:randomUUID(),label:'TEC-RISK-001 · HIGH'};
const proof={id:randomUUID(),label:'TEC-PROOF-001 · APPROVED',version:1,contentHash:'b'.repeat(64)};
const record=extra=>({id:randomUUID(),revision:1,kind:'CHANGE',title:'طلب تقني خاص',state:'DRAFT',scopeReference:'CI-SYSTEM',executionPlan:'خطة التنفيذ',testPlan:'خطة الاختبار',rollbackPlan:'خطة الرجوع',expiresAt:new Date(Date.now()+3600000).toISOString(),requestProof:{reference:'TEC-REQUEST-001'},...extra});
const json=(r,data,status=200)=>r.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
const ownerActions={DRAFT:['SUBMIT','REVOKE'],SUBMITTED:['APPROVE','REJECT','REVOKE'],APPROVED:['REVOKE'],EXECUTED:['PASS_TEST','FAIL_TEST','REQUEST_ROLLBACK','REVOKE'],VERIFIED:['CLOSE','REVOKE'],CLOSED:[]};
async function setup(page,options={}){
 const state={role:'OWNER',records:[record()],writes:[],failCreate:0,deny:false,holdDetail:false,release:null,...options};
 const detail=row=>({schemaVersion:1,policy,role:state.role,record:row,actions:state.role==='OWNER'?(ownerActions[row.state]||['REVOKE']):(row.state==='APPROVED'?['START']:row.state==='IN_PROGRESS'?['RECORD_EXECUTION']:[]),history:[{revision:row.revision,action:'CREATE',reason:'سبب طلب محفوظ'}],historyTruncated:false});
 await page.route('**/api/v1/**',r=>json(r,[]));await page.route('**/auth/google/config',r=>json(r,{enabled:false}));
 await page.route(/\/api\/v1\/me$/,r=>json(r,{id:'technology-owner-fixture',status:'ACTIVE',person:{firstName:'مالك',lastName:'اختبار'},roleAssignments:[{role:state.role==='OWNER'?'ADMIN':'STAFF',status:'ACTIVE'}]}));
 await page.route(/\/technology\/requests(?:[/?].*)?$/,async r=>{
  const url=new URL(r.request().url()),tail=url.pathname.split('/technology/requests')[1],method=r.request().method(),body=method==='GET'?null:r.request().postDataJSON();
  if(method!=='GET')state.writes.push({tail,method,body});if(state.deny)return json(r,{message:'انتهى تكليف هذا الحساب'},403);
  if(tail==='/references')return json(r,{items:url.searchParams.get('type')==='assignee'?[employee]:url.searchParams.get('type')==='request'?[source]:url.searchParams.get('type')==='audit'?[{id:randomUUID(),label:'أثر تنفيذ الوصول'}]:[proof],nextCursor:null});
  if(method==='GET'&&!tail)return json(r,{schemaVersion:1,policy,role:state.role,items:state.records,hasMore:false,nextCursor:null});
  if(method==='POST'&&!tail){if(state.failCreate-->0)return json(r,{message:'تعذر الحفظ مؤقتًا'},503);const row=record(body);state.records.unshift(row);return json(r,{...detail(row),created:true},201);}
  const id=tail.split('/')[1],row=state.records.find(x=>x.id===id);
  if(method==='GET'){if(state.holdDetail)await new Promise(resolve=>state.release=resolve);return json(r,detail(row));}
  if(body.expectedRevision!==row.revision)return json(r,{message:'تغير إصدار الطلب؛ أعد القراءة'},409);
  const next={SUBMIT:'SUBMITTED',APPROVE:'APPROVED',START:'IN_PROGRESS',RECORD_EXECUTION:'EXECUTED',PASS_TEST:'VERIFIED',CLOSE:'CLOSED',REVOKE:'REVOKED'};row.state=next[tail.split('/').at(-1)]||row.state;row.revision++;return json(r,detail(row),201);
 });
 await page.goto('/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>Boolean(window.HydrolandTechnologyRequests&&window.HydrolandAuth&&window.HydrolandProfile));
 await page.evaluate(async()=>{window.HydrolandAuth.acceptSession({accessToken:'technology-fixture',refreshToken:'technology-refresh'},window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load();await window.HydrolandTechnologyRequests.open();});
 await expect(page.locator('#hl-technology-requests')).toBeVisible();await expect(page.locator('[data-case-id]')).toHaveCount(state.records.length);return state;
}
async function fillCreate(page){const f=page.locator('[data-tr-create]');await f.locator('[name=document]').selectOption(source.id);await f.locator('[name=assignee]').selectOption(employee.id);for(const key of ['title','executionPlan','testPlan','rollbackPlan'])await f.locator(`[name=${key}]`).fill('خطة اصطناعية محددة '+key);return f;}
async function act(page,value){const f=page.locator('[data-tr-action]');await f.locator('[name=action]').selectOption(value);await f.locator('[name=reason]').fill('قرار موثق داخل الاختبار');await f.locator('[name=confirmed]').check();await f.getByRole('button',{name:'حفظ الإجراء',exact:true}).click();}
test('mobile request creation binds picked source, target scope and worker without exposing technical fields',async({page})=>{
 await page.setViewportSize({width:390,height:844});const state=await setup(page,{records:[record({title:'<img src=x onerror=alert(1)> نص محفوظ'})]});await expect(page.locator('#hl-technology-requests img')).toHaveCount(0);await expect(page.locator('[data-tr-list]')).toContainText('<img src=x');
 const f=await fillCreate(page);await f.getByRole('button',{name:'حفظ مسودة الطلب',exact:true}).click();await expect(page.locator('[data-tr-feedback]')).toContainText('حُفظت المسودة');expect(state.writes).toHaveLength(1);expect(state.writes[0].body.scopeReference).toBe('CI-SYSTEM');expect(state.writes[0].body.requestDocumentHash).toBe(source.contentHash);expect(state.writes[0].body.assigneeAccountId).toBe(employee.id);expect(state.writes[0].body.organizationId).toBeUndefined();expect(await page.locator('#hl-technology-requests').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
});
test('owner decisions bind the loaded revision and clear confirmation after each action',async({page})=>{
 const state=await setup(page);await page.locator('[data-case-id]').click();await act(page,'SUBMIT');await expect(page.locator('[data-tr-summary]')).toContainText('بانتظار الاعتماد');expect(state.writes[0].body.expectedRevision).toBe(1);await expect(page.locator('[data-tr-action] [name=confirmed]')).not.toBeChecked();await act(page,'APPROVE');await expect(page.locator('[data-tr-summary]')).toContainText('معتمد');expect(state.writes[1].body.expectedRevision).toBe(2);await expect(page.locator('[data-tr-action] [name=action] option[value=START]')).toHaveCount(0);
});
test('an operator records an existing approved proof and cannot select owner closure actions',async({page})=>{
 const state=await setup(page,{role:'ASSIGNEE',records:[record({state:'APPROVED'})]});await expect(page.locator('[data-tr-create]')).toBeHidden();await page.locator('[data-case-id]').click();await act(page,'START');await expect(page.locator('[data-tr-summary]')).toContainText('قيد التنفيذ');const f=page.locator('[data-tr-action]');await f.locator('[name=action]').selectOption('RECORD_EXECUTION');await expect(f.locator('[name=proof] option[value="'+proof.id+'"]')).toHaveCount(1);await f.locator('[name=proof]').selectOption(proof.id);await f.locator('[name=reason]').fill('نتيجة التنفيذ موثقة');await f.locator('[name=confirmed]').check();await f.getByRole('button',{name:'حفظ الإجراء',exact:true}).click();await expect(page.locator('[data-tr-summary]')).toContainText('بانتظار اختبار مستقل');expect(state.writes[1].body.proofDocumentVersion).toBe(1);expect(state.writes[1].body.proofDocumentHash).toBe(proof.contentHash);await expect(f).toBeHidden();
});
test('uncertain creates keep the same idempotency key and a changed plan starts a new request',async({page})=>{
 const state=await setup(page,{failCreate:2});const f=await fillCreate(page),button=f.getByRole('button',{name:'حفظ مسودة الطلب',exact:true});await button.click();await expect(page.locator('[data-tr-feedback]')).toContainText('تعذر الحفظ');await button.click();await expect.poll(()=>state.writes.length).toBe(2);expect(state.writes[0].body.requestKey).toBe(state.writes[1].body.requestKey);await f.locator('[name=testPlan]').fill('خطة تحقق مختلفة');await button.click();await expect(page.locator('[data-tr-feedback]')).toContainText('حُفظت المسودة');expect(state.writes[2].body.requestKey).not.toBe(state.writes[0].body.requestKey);
});
test('stale revisions are shown once and never retried or overwritten automatically',async({page})=>{
 const state=await setup(page);await page.locator('[data-case-id]').click();await expect(page.locator('[data-tr-summary]')).toContainText('الإصدار 1');state.records[0].revision=2;await act(page,'SUBMIT');await expect(page.locator('[data-tr-feedback]')).toContainText('تغير إصدار الطلب');expect(state.writes).toHaveLength(1);expect(state.records[0].state).toBe('DRAFT');
});
test('logout while a private detail is loading clears the dialog and ignores the late response',async({page})=>{
 const state=await setup(page,{holdDetail:true});await page.locator('[data-case-id]').click();await expect.poll(()=>Boolean(state.release)).toBe(true);await page.evaluate(()=>window.HydrolandAuth.logout());state.release();await expect(page.locator('#hl-technology-requests')).not.toBeVisible();await expect(page.locator('[data-tr-body]')).toBeEmpty();
});
test('fresh server revocation clears stored private data before any stale action remains visible',async({page})=>{
 const state=await setup(page);await page.locator('[data-case-id]').click();state.deny=true;await act(page,'SUBMIT');await expect(page.locator('#hl-technology-requests')).not.toBeVisible();await expect(page.locator('[data-tr-body]')).toBeEmpty();expect(state.writes).toHaveLength(1);
});

async function agentSetup(page,{stale=false,change=false,incident=false,risk=false}={}){
 const writes=[],rows=[];await page.route('**/api/v1/**',r=>json(r,[]));
 await page.route('**/auth/google/config',r=>json(r,{enabled:false}));
 await page.route(/\/api\/v1\/me$/,r=>json(r,{id:'owner',status:'ACTIVE',person:{firstName:'مالك',lastName:'اختبار'},roleAssignments:[{role:'ADMIN',status:'ACTIVE'}]}));
 await page.route(/\/technology\/agent-access(?:[/?].*)?$/,r=>{
  const path=new URL(r.request().url()).pathname.split('/technology/agent-access')[1];
  if(path==='/references')return json(r,{documents:[{id:source.id,label:'TEC-AGENT-001'}],changes:[changeSource],incidents:[incidentSource],risks:[riskSource],tasks:[{id:employee.id,label:'توصية الأمن المكتملة'}],proofs:[],changeProofs:[],incidentProofs:[]});
  if(r.request().method()==='GET')return json(r,{items:rows});
  const body=r.request().postDataJSON();writes.push({path,body});
  if(path){if(stale)return json(r,{message:'تغير إصدار الطلب.'},409);rows[0].state=rows[0].targetKind==='SECURITY_RISK'?'RISK_ACCEPTED':'EXECUTED';rows[0].revision++;return json(r,rows[0],201);}
  const incidentAction=body.operation==='CONTAIN_CYBER_INCIDENT',runtimeAction=body.operation==='PAUSE_CYBER_SECURITY'||incidentAction,riskAction=body.operation==='ACCEPT_SECURITY_RISK';const row={id:body.requestId,source:{reference:incidentAction?'TEC-INCIDENT-001':riskAction?'TEC-RISK-001':body.operation==='PAUSE_CYBER_SECURITY'?'TEC-CHANGE-001':'TEC-AGENT-001'},operation:body.operation,targetKind:runtimeAction?'AGENT_RUNTIME':riskAction?'SECURITY_RISK':'ACCOUNT',targetId:riskAction?'RISK-001':undefined,targetLabel:runtimeAction?'وكيل الأمن السيبراني':riskAction?'HIGH':'target@example.invalid',status:runtimeAction?'PAUSED':riskAction?'ACCEPTED':'SUSPENDED',state:'PROPOSED',revision:1,expiresAt:body.expiresAt,riskReviewAt:body.riskReviewAt,recommendation:'<img src=x onerror=alert(1)> توصية فقط'};rows.unshift(row);return json(r,row,201);
 });
 await page.goto('/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>Boolean(window.HydrolandAgentAccess&&window.HydrolandAuth&&window.HydrolandProfile));
 await page.evaluate(async()=>{window.HydrolandAuth.acceptSession({accessToken:'agent-fixture',refreshToken:'agent-refresh'},window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load();await window.HydrolandAgentAccess.open();});
 const dialog=page.locator('#hl-agent-access'),form=dialog.locator('form').first();if(change){await form.locator('[name=operation]').selectOption('PAUSE_CYBER_SECURITY');await form.locator('[name=document]').selectOption(changeSource.id);}else if(incident){await form.locator('[name=operation]').selectOption('CONTAIN_CYBER_INCIDENT');await form.locator('[name=document]').selectOption(incidentSource.id);}else if(risk){await form.locator('[name=operation]').selectOption('ACCEPT_SECURITY_RISK');await form.locator('[name=document]').selectOption(riskSource.id);}else{await form.locator('[name=operation]').selectOption('ACCOUNT_STATUS');await form.locator('[name=document]').selectOption(source.id);}await form.locator('[name=task]').selectOption(employee.id);await form.locator('[name=reason]').fill(change?'مراجعة تغيير إيقاف وكيل الأمن':incident?'مراجعة احتواء حادث أمني':risk?'مراجعة قبول خطر محدد':'مراجعة توصية الحساب المحدد');await form.getByRole('button',{name:'مراجعة التوصية',exact:true}).click();await expect(dialog.locator('[data-agent-case]')).toHaveCount(1);return{writes,dialog};
}
test('agent access exposes the exact account and advice, executes after explicit owner confirmation without employee selection',async({page})=>{
 await page.setViewportSize({width:390,height:844});const{writes,dialog}=await agentSetup(page);await expect(dialog.locator('[name=assignee]')).toHaveCount(0);await expect(dialog.locator('img')).toHaveCount(0);await expect(dialog).toContainText('target@example.invalid');expect(writes).toHaveLength(1);
 const f=dialog.locator('[data-agent-case] form');await f.locator('[name=action]').selectOption('APPROVE_EXECUTE');await f.locator('[name=reason]').fill('أوافق على تعليق هذا الحساب');await f.locator('[name=confirmed]').check();await f.getByRole('button',{name:'تأكيد الإجراء',exact:true}).click();await expect(dialog).toContainText('نُفذ آليًا');expect(writes).toHaveLength(2);expect(writes[1].body.expectedRevision).toBe(1);expect(writes[0].body.assigneeAccountId).toBeUndefined();expect(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
});
test('agent access never retries stale approvals and clears private advice on logout',async({page})=>{
 const{writes,dialog}=await agentSetup(page,{stale:true}),f=dialog.locator('[data-agent-case] form');await f.locator('[name=action]').selectOption('APPROVE_EXECUTE');await f.locator('[name=reason]').fill('موافقة محددة النطاق');await f.locator('[name=confirmed]').check();await f.getByRole('button',{name:'تأكيد الإجراء',exact:true}).click();await expect(dialog.locator('[role=status]')).toContainText('تغير إصدار الطلب');expect(writes).toHaveLength(2);await page.evaluate(()=>window.HydrolandAuth.logout());await expect(dialog).not.toBeVisible();await expect(dialog.locator('[data-agent-case]')).toHaveCount(0);
});
test('bounded cybersecurity change shows the exact agent pause and never starts without owner approval',async({page})=>{
 await page.setViewportSize({width:390,height:844});const{writes,dialog}=await agentSetup(page,{change:true});await expect(dialog).toContainText('إيقاف الوكيل مع حفظ المهام الموجودة في الطابور');expect(writes[0].body.operation).toBe('PAUSE_CYBER_SECURITY');expect(writes).toHaveLength(1);
 const f=dialog.locator('[data-agent-case] form');await f.locator('[name=action]').selectOption('APPROVE_EXECUTE');await f.locator('[name=reason]').fill('أوافق على إيقاف وكيل الأمن المحدد');await f.locator('[name=confirmed]').check();await f.getByRole('button',{name:'تأكيد الإجراء',exact:true}).click();await expect(dialog).toContainText('نُفذ آليًا');expect(writes).toHaveLength(2);expect(writes[1].body.expectedRevision).toBe(1);expect(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
});
test('cybersecurity incident containment requires a high-scope incident and explicit owner action',async({page})=>{
 const{writes,dialog}=await agentSetup(page,{incident:true});await expect(dialog).toContainText('احتواء الحادث بإيقاف الوكيل');expect(writes[0].body.operation).toBe('CONTAIN_CYBER_INCIDENT');expect(writes).toHaveLength(1);const f=dialog.locator('[data-agent-case] form');await f.locator('[name=action]').selectOption('APPROVE_EXECUTE');await f.locator('[name=reason]').fill('أوافق على احتواء الحادث المحدد');await f.locator('[name=confirmed]').check();await f.getByRole('button',{name:'تأكيد الإجراء',exact:true}).click();await expect(dialog).toContainText('نُفذ آليًا');expect(writes).toHaveLength(2);
});
test('risk acceptance is a recorded owner decision with a mandatory future review date',async({page})=>{
 const{writes,dialog}=await agentSetup(page,{risk:true}),requestForm=dialog.locator('form').first();expect(await requestForm.locator('[name=riskReviewAt]').inputValue()).not.toBe('');expect(writes[0].body.operation).toBe('ACCEPT_SECURITY_RISK');expect(Date.parse(writes[0].body.riskReviewAt)).toBeGreaterThan(Date.now());expect(writes).toHaveLength(1);
 const f=dialog.locator('[data-agent-case] form');await f.locator('[name=action]').selectOption('APPROVE_EXECUTE');await f.locator('[name=reason]').fill('أقبل الخطر مع مراجعة مستقبلية');await f.locator('[name=confirmed]').check();await f.getByRole('button',{name:'تأكيد الإجراء',exact:true}).click();await expect(dialog).toContainText('خطر مقبول');await expect(dialog).toContainText('موعد مراجعة الخطر');expect(writes).toHaveLength(2);expect(await dialog.locator('[data-agent-case] form').count()).toBe(0);
});
