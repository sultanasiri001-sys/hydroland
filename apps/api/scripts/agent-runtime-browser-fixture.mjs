import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium,expect} from '@playwright/test';
import {createStaticServer} from '../../web/scripts/serve.mjs';
import {openWorkspaceSwitcher} from '../../web/e2e/portal-test-helpers.js';

// This fixture runs only inside the loopback-only HTTP/PostgreSQL fixture.
// It uses a separate real API process with its automatic worker enabled.
export async function browserAcceptance({db,actor,session,getCalls,holdGeneration,waitGeneration,releaseGeneration}){
 const api='http://127.0.0.1:3111/api/v1',origin='http://127.0.0.1:4176',initialCalls=getCalls();
 let child,browser,web,page;const wait=async fn=>{const deadline=Date.now()+20000;while(!await fn()){assert(Date.now()<deadline,'Connected browser fixture timed out');await new Promise(r=>setTimeout(r,40));}};
 const start=async()=>{
  child=spawn(process.execPath,[fileURLToPath(new URL('../dist/main.js',import.meta.url))],{env:{...process.env,PORT:'3111',WEB_ORIGIN:origin,HYDROLAND_AI_TEST_MANUAL_WORKER:'0'},stdio:['ignore','ignore','ignore']});
  await wait(async()=>{assert(child.exitCode===null,'Connected fixture API exited');try{return(await fetch(api+'/health/ready')).ok}catch{return false}});
 };
 const stop=async()=>{if(!child||child.exitCode!==null)return;const current=child;await new Promise(resolve=>{const timer=setTimeout(()=>current.kill('SIGKILL'),5000);current.once('exit',()=>{clearTimeout(timer);resolve()});current.kill('SIGTERM')});child=null;};
 const open=async()=>{
  await page.goto(origin,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>Boolean(window.HydrolandAdminAgentWorkforce&&window.HydrolandAuth&&window.HydrolandProfile));
  await page.evaluate(async tokens=>{if(!window.HydrolandAuth.isAuthenticated())window.HydrolandAuth.acceptSession(tokens,window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load()},session);await expect(page.locator('.hl-role-dashboard')).toBeVisible();
  await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role="admin"]').click();await expect(page.locator('.hl-role-dashboard[data-role="admin"]')).toBeVisible();await page.locator('[data-portal-label="الذكاء الاصطناعي"]').click();await expect(page.locator('[data-ai-feedback]')).toContainText('تم تحميل');await page.locator('[data-ai-agent-select]').selectOption('INVENTORY');await expect(page.locator('[data-ai-feedback]')).toContainText('تم تحميل');
 };
 const control=()=>page.locator('[data-ai-control][data-key="INVENTORY"]');
 const review=async form=>{await form.locator('[name="reason"]').fill('Isolated browser acceptance review');await form.getByRole('checkbox').check();};
 const change=async label=>{const form=control();await review(form);await form.getByRole('button',{name:label,exact:true}).click();await expect(page.locator('[data-ai-feedback]')).toContainText(label==='إيقاف الوكيل'?'أُوقف':'فُعّل');};
 const enqueue=async prompt=>{const form=page.locator('[data-ai-task-form]');await form.getByLabel('نوع مهمة الوكيل').selectOption('READ_OPERATIONS');await form.getByLabel('نص مهمة الوكيل').fill(prompt);await review(form);const saved=page.waitForResponse(r=>r.url()===api+'/admin/agents/INVENTORY/tasks'&&r.request().method()==='POST');await form.getByRole('button').click();const response=await saved;assert.equal(response.status(),201);const receipt=await response.json();await expect(page.locator('[data-ai-feedback]')).toContainText('حُفظت المهمة');const persisted=await db.aiAgentTask.findUniqueOrThrow({where:{id:receipt.id}});assert.equal(persisted.prompt,prompt);assert.equal(persisted.requestedByAccountId,actor.id);assert.equal(persisted.agentKey,'INVENTORY');return persisted.id;};
 try{
  await start();web=createStaticServer();await new Promise(resolve=>web.listen(4176,'127.0.0.1',resolve));browser=await chromium.launch();const context=await browser.newContext({viewport:{width:1280,height:900},serviceWorkers:'block'});
  await context.route('**/*',route=>{const u=new URL(route.request().url());return ['localhost','127.0.0.1','[::1]'].includes(u.hostname)?route.continue():route.abort()});
  await context.addInitScript(value=>window.HYDROLAND_API_BASE=value,api);page=await context.newPage();await open();
  await expect.poll(async()=>{await page.locator('[data-ai-refresh]').click();await expect(page.locator('[data-ai-feedback]')).toContainText('تم تحميل');return await control().getByRole('button').isEnabled()}).toBe(true);
  holdGeneration();await change('تشغيل الوكيل');const first=await enqueue('مؤشرات مجمعة لاختبار الإيقاف');await waitGeneration();const second=await enqueue('مؤشرات مجمعة بعد الاستئناف');await page.locator('[data-ai-refresh]').click();await expect(page.locator('[data-ai-key="INVENTORY"] [data-ai-pressure]')).toHaveText('مشغول');await expect(page.locator('[data-ai-key="INVENTORY"] [data-ai-count]')).toHaveText(['1','1','0','0']);await change('إيقاف الوكيل');releaseGeneration();
  await wait(async()=>(await db.aiAgentTask.findUniqueOrThrow({where:{id:first}})).state==='COMPLETED');assert.equal((await db.aiAgentTask.findUniqueOrThrow({where:{id:second}})).state,'QUEUED');assert.equal(getCalls(),initialCalls+1);
  await page.goto('about:blank');await stop();await start();await open();await expect(control().getByRole('button')).toHaveText('تشغيل الوكيل');await expect(page.locator('[data-ai-key="INVENTORY"] [data-ai-pressure]')).toHaveText('مشغول');await expect(page.locator('[data-ai-key="INVENTORY"] [data-ai-count]')).toHaveText(['0','1','0','0']);assert.equal((await db.aiAgentTask.findUniqueOrThrow({where:{id:second}})).state,'QUEUED');assert.equal(getCalls(),initialCalls+1,'Paused queue must survive an actual API process restart without dispatch');
  await change('تشغيل الوكيل');await wait(async()=>(await db.aiAgentTask.count({where:{id:{in:[first,second]},state:'COMPLETED'}}))===2);assert.equal(getCalls(),initialCalls+2);await page.locator('[data-ai-refresh]').click();await expect(page.locator('[data-ai-key="INVENTORY"] [data-ai-pressure]')).toHaveText('متاح');await expect(page.locator('[data-ai-task-list] pre')).toHaveCount(2);await expect(page.locator('[data-ai-task-list] img')).toHaveCount(0);await expect(page.locator('[data-ai-task-list] pre').first()).toContainText('<img');
  await page.evaluate(()=>window.HydrolandAuth.logout());await expect(page.locator('[data-ai-task-list]')).toBeEmpty();await expect(page.locator('[data-ai-cards]')).toBeEmpty();
  console.log('AI connected browser/PostgreSQL/automatic-worker passed: per-agent pause during generation, retained queue, actual process restart, persisted resume exactly once, aggregate read adapter, escaped model result and logout privacy.');
 }finally{releaseGeneration();await browser?.close();if(web){web.closeAllConnections?.();await new Promise(resolve=>web.close(resolve));}await stop();}
}
