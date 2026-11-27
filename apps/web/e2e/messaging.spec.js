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
  await page.route(/\/api\/v1\/community\/audio-policy$/,route=>json(route,{active:false,reason:'D16_AUDIO_POLICY_REQUIRED'}));
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
  const messagesControl=page.locator('#top-messages');
  await expect(messagesControl).toBeHidden();

  await expect(page.locator('.hl-login')).toBeHidden();
  await expect(page.locator('.hl-login')).toHaveClass(/hidden/);
  await expect(messagesControl).toBeHidden();
  await expect(page.locator('#hl-messages-dialog')).not.toBeVisible();

  await page.evaluate(async()=>{sessionStorage.setItem('hl-access-token','messaging-e2e-access');sessionStorage.setItem('hl-refresh-token','messaging-e2e-refresh');window.HydrolandAuth.syncAuthUi();document.dispatchEvent(new CustomEvent('hydroland:auth-changed'));await window.HydrolandProfile.load()});
  await expect(messagesControl).toBeVisible();
  await messagesControl.click();
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

function privateWav(){const b=Buffer.alloc(32044);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(16000,24);b.writeUInt32LE(32000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(b.length-44,40);return b}
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done});return{promise,resolve}};
async function historyFixture(page,{audioActive=true}={}){
  const control={audioActive,audioPolicyGate:null,historyRequests:[],conversationRequests:[],reads:[],sends:[],historyError:false,listError:false,historyGate:null,conversationGate:null,sendGate:null};
  const profile={id:'history-owner',email:'owner@example.invalid',status:'ACTIVE',roleAssignments:[],person:{firstName:'History',lastName:'Owner',phone:null,professional:null}};
  const participants=[{accountId:profile.id,firstName:'History',lastName:'Owner'},{accountId:'history-peer',firstName:'History',lastName:'Peer'}];
  const message=(n,id='history-a')=>({id:`${id}-${n}`,conversationId:id,senderAccountId:'history-peer',senderFirstName:'History',senderLastName:'Peer',kind:'TEXT',body:`History message ${n}`,createdAt:'2026-10-01T00:00:00Z'});
  const messages=Array.from({length:401},(_,index)=>message(index+1));control.messages=messages;
  const summary=id=>({id,title:id==='history-a'?'Long conversation':'Other conversation',participants,latestMessage:id==='history-a'?messages.at(-1):message(900,'history-b')});
  const pageFor=(all,end=all.length)=>{const start=Math.max(0,end-200),batch=all.slice(start,end);return{messages:batch,hasMore:start>0,olderCursor:start>0?batch[0].id:null}};
  await page.route(/\/api\/v1\/community\/audio-policy$/,async route=>{const active=control.audioActive;if(control.audioPolicyGate)await control.audioPolicyGate.promise;return json(route,{active,reason:active?undefined:'D16_AUDIO_POLICY_REQUIRED'})});
  await page.route(/\/api\/v1\/me$/,route=>json(route,profile));
  await page.route(/\/api\/v1\/credentials$/,route=>json(route,[]));
  await page.route(/\/api\/v1\/me\/diver-profile$/,route=>json(route,{profile:null,equipment:[]}));
  await page.route(/\/api\/v1\/messages\/conversations(?:\/.*)?$/,async route=>{
    const request=route.request(),url=new URL(request.url()),path=url.pathname;
    if(path.endsWith('/conversations'))return control.listError?json(route,{message:'List unavailable'},503):json(route,[summary('history-a'),summary('history-b')]);
    const id=path.split('/conversations/')[1].split('/')[0];
    if(path.endsWith('/read')){control.reads.push(id);return json(route,{status:'READ'})}
    if(path.endsWith('/audio')){
      if(request.method()==='GET')return route.fulfill({status:200,contentType:'audio/wav',body:privateWav()});
      const payload=request.postDataJSON();control.sends.push({id,body:payload});if(control.sendGate)await control.sendGate.promise;
      const created={...message(messages.length+1,id),senderAccountId:profile.id,kind:'VOICE',body:null,mediaUrl:null,privateAudio:true,durationSec:1};messages.push(created);return json(route,created,201);
    }
    if(path.endsWith('/messages')){
      if(request.method()==='POST'){
        const payload=request.postDataJSON();control.sends.push({id,body:payload});if(control.sendGate)await control.sendGate.promise;
        const created={...message(messages.length+1,id),senderAccountId:profile.id,kind:payload.kind,body:payload.body??null,mediaUrl:payload.mediaUrl??null,durationSec:payload.durationSec??null};messages.push(created);return json(route,created,201);
      }
      const cursor=url.searchParams.get('before');control.historyRequests.push({id,cursor});
      if(control.historyGate)await control.historyGate.promise;
      if(control.historyError)return json(route,{message:'History temporarily unavailable'},503);
      return json(route,pageFor(messages,messages.findIndex(item=>item.id===cursor)));
    }
    control.conversationRequests.push(id);
    if(id==='history-a'&&control.conversationGate)await control.conversationGate.promise;
    return json(route,{...summary(id),...pageFor(id==='history-a'?messages:[message(900,'history-b')])});
  });
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandMessages&&window.HydrolandAuth&&window.HydrolandProfile));
  await page.evaluate(async()=>{sessionStorage.setItem('hl-access-token','history-test-access');sessionStorage.setItem('hl-refresh-token','history-test-refresh');window.HydrolandAuth.syncAuthUi();document.dispatchEvent(new CustomEvent('hydroland:auth-changed'));await window.HydrolandProfile.load()});
  await page.evaluate(()=>{window.__historyPending=0;const original=window.HydrolandAuth.authorizedFetch;window.HydrolandAuth.authorizedFetch=async(...args)=>{window.__historyPending++;try{const response=await original(...args),read=response.json.bind(response);response.json=async()=>{try{return await read()}finally{window.__historyPending--}};return response}catch(error){window.__historyPending--;throw error}}});
  await page.locator('#top-messages').click();
  const dialog=page.locator('#hl-messages-dialog');
  await expect(dialog.locator('[data-conversation-id="history-a"]')).toBeVisible();
  const select=async id=>dialog.locator(`[data-conversation-id="${id}"]`).click();
  return{control,dialog,select};
}

for(const viewport of [{name:'desktop',width:1280,height:800},{name:'mobile',width:390,height:844}])test(`latest 200 messages remain visible and older history retries, deduplicates clicks and preserves scroll (${viewport.name})`,async({page})=>{
  await page.setViewportSize({width:viewport.width,height:viewport.height});
  const {control,dialog,select}=await historyFixture(page);await select('history-a');
  await expect(dialog.locator('[data-message-id]')).toHaveCount(200);
  await expect(dialog.locator('[data-message-id="history-a-401"]')).toBeInViewport();
  await expect(dialog.locator('[data-message-form]')).toBeInViewport();
  const stream=dialog.locator('[data-message-stream]');
  expect(await stream.evaluate(element=>element.scrollHeight>element.clientHeight&&element.scrollTop>0)).toBe(true);
  expect(await dialog.evaluate(element=>element.scrollHeight<=element.clientHeight+1)).toBe(true);
  await expect(dialog.locator('[data-message-id="history-a-1"]')).toHaveCount(0);
  const older=dialog.locator('[data-load-older-messages]');
  control.historyError=true;await older.click();
  await expect(dialog.locator('[data-message-status]')).toHaveText('History temporarily unavailable');
  await expect(older).toBeEnabled();await expect(dialog.locator('[data-message-id]')).toHaveCount(200);
  control.historyError=false;control.historyGate=deferred();await older.click();
  await expect.poll(()=>control.historyRequests.length).toBe(2);
  await expect(older).toBeDisabled();await older.dispatchEvent('click');
  const before=await dialog.locator('[data-message-id="history-a-202"]').evaluate(element=>element.getBoundingClientRect().top);
  control.historyGate.resolve();control.historyGate=null;
  await page.waitForFunction(()=>window.__historyPending===0);
  await expect(dialog.locator('[data-message-id]')).toHaveCount(400);
  const after=await dialog.locator('[data-message-id="history-a-202"]').evaluate(element=>element.getBoundingClientRect().top);
  expect(Math.abs(before-after)).toBeLessThan(2);
  expect(control.historyRequests).toEqual([{id:'history-a',cursor:'history-a-202'},{id:'history-a',cursor:'history-a-202'}]);
  await older.click();await expect(dialog.locator('[data-message-id]')).toHaveCount(401);await expect(older).toHaveCount(0);
  expect(await dialog.evaluate(element=>element.scrollHeight<=element.clientHeight+1)).toBe(true);
  expect(await dialog.locator('[data-message-id]').evaluateAll(elements=>new Set(elements.map(element=>element.dataset.messageId)).size)).toBe(401);
  await dialog.locator('textarea[name="body"]').fill('Newest after 401');await dialog.locator('[data-message-form] button[type="submit"]').click();
  await expect(dialog.locator('[data-message-id="history-a-402"]')).toHaveText(/Newest after 401/);
  await expect(dialog.locator('[data-message-id="history-a-402"]')).toBeInViewport();await expect(dialog.locator('[data-message-id]')).toHaveCount(200);
});

test('older-history and initial conversation replies cannot replace newer navigation',async({page})=>{
  const {control,dialog,select}=await historyFixture(page);await select('history-a');
  control.historyGate=deferred();await dialog.locator('[data-load-older-messages]').click();await expect.poll(()=>control.historyRequests.length).toBe(1);
  await select('history-b');await expect(dialog.locator('[data-message-title]')).toHaveText('Other conversation');
  control.historyGate.resolve();control.historyGate=null;
  await page.waitForFunction(()=>window.__historyPending===0);
  await expect(dialog.locator('[data-message-id]')).toHaveCount(1);await expect(dialog.locator('[data-message-id="history-a-2"]')).toHaveCount(0);
  control.conversationGate=deferred();await select('history-a');await select('history-b');
  await expect(dialog.locator('[data-message-title]')).toHaveText('Other conversation');control.conversationGate.resolve();control.conversationGate=null;
  await page.waitForFunction(()=>window.__historyPending===0);
  await expect(dialog.locator('[data-message-id]')).toHaveCount(1);await expect(dialog.locator('[data-message-title]')).toHaveText('Other conversation');
  expect(control.reads.filter(id=>id==='history-a')).toHaveLength(1);
});

test('closing or signing out discards in-flight history and does not restore hidden messages',async({page})=>{
  const {control,dialog,select}=await historyFixture(page);await select('history-a');
  control.historyGate=deferred();await dialog.locator('[data-load-older-messages]').click();await expect.poll(()=>control.historyRequests.length).toBe(1);
  await dialog.locator('[data-messages-close]').click();control.historyGate.resolve();control.historyGate=null;
  await page.waitForFunction(()=>window.__historyPending===0);
  await expect(dialog).not.toBeVisible();await page.locator('#top-messages').click();await expect(dialog.locator('[data-message-id]')).toHaveCount(0);
  await select('history-a');control.historyGate=deferred();await dialog.locator('[data-load-older-messages]').click();await expect.poll(()=>control.historyRequests.length).toBe(2);
  await page.evaluate(()=>{sessionStorage.removeItem('hl-access-token');sessionStorage.removeItem('hl-refresh-token');window.HydrolandAuth.syncAuthUi();document.dispatchEvent(new CustomEvent('hydroland:auth-changed'))});
  control.historyGate.resolve();control.historyGate=null;await page.waitForFunction(()=>window.__historyPending===0);await expect(dialog).not.toBeVisible();await expect(page.locator('#top-messages')).toBeHidden();await expect(dialog.locator('[data-message-id]')).toHaveCount(0);
});

test('an in-flight send stays bound to its conversation and does not clear the next draft',async({page})=>{
  const {control,dialog,select}=await historyFixture(page);await select('history-a');control.sendGate=deferred();
  await dialog.locator('textarea[name="body"]').fill('Send in A');await dialog.locator('[data-message-form] button[type="submit"]').click();await expect.poll(()=>control.sends.length).toBe(1);
  await select('history-b');await expect(dialog.locator('[data-message-title]')).toHaveText('Other conversation');await dialog.locator('textarea[name="body"]').fill('Draft in B');
  control.sendGate.resolve();control.sendGate=null;
  await page.waitForFunction(()=>window.__historyPending===0);
  await expect(dialog.locator('[data-message-title]')).toHaveText('Other conversation');await expect(dialog.locator('textarea[name="body"]')).toHaveValue('Draft in B');expect(control.sends[0].id).toBe('history-a');
});

test('same-conversation send refresh preserves newer text and private audio drafts',async({page})=>{
  const {control,dialog,select}=await historyFixture(page);await select('history-a');
  const body=dialog.locator('textarea[name="body"]'),file=dialog.locator('input[name="audioFile"]');
  await dialog.locator('summary').click();await body.fill('Submitted text');await file.setInputFiles({name:'private.wav',mimeType:'audio/wav',buffer:privateWav()});await dialog.locator('[name=audioConsent]').check();
  control.sendGate=deferred();await dialog.locator('[data-message-form] button[type="submit"]').click();await expect.poll(()=>control.sends.length).toBe(1);await body.fill('Next text draft');
  control.sendGate.resolve();control.sendGate=null;await page.waitForFunction(()=>window.__historyPending===0);
  await expect(dialog.locator('[data-message-id="history-a-402"]')).toHaveText(/Submitted text/);await expect(body).toHaveValue('Next text draft');await expect(dialog.locator('[data-audio-preview]')).toBeVisible();await expect(dialog.locator('[name=audioConsent]')).toBeChecked();
  await dialog.locator('[data-send-voice]').click();await expect.poll(()=>control.sends.length).toBe(2);await page.waitForFunction(()=>window.__historyPending===0);
  expect(control.sends[1].body.mimeType).toBe('audio/wav');expect(Buffer.from(control.sends[1].body.base64,'base64')).toEqual(privateWav());expect(control.sends[1].body.consent).toBe(true);
  await expect(body).toHaveValue('Next text draft');await expect(dialog.locator('[data-audio-preview]')).toBeHidden();await expect(dialog.locator('[name=audioConsent]')).not.toBeChecked();await expect(dialog.locator('[data-message-id="history-a-403"]')).toContainText('تحميل الصوت الخاص');
  control.conversationGate=deferred();const requests=control.conversationRequests.length;await select('history-a');await select('history-a');await expect.poll(()=>control.conversationRequests.length).toBe(requests+2);control.conversationGate.resolve();control.conversationGate=null;await page.waitForFunction(()=>window.__historyPending===0);await expect(body).toHaveValue('Next text draft');
});

test('pending microphone permission is cancelled by discard and never leaves a stale stream running',async({page})=>{
  const {dialog,select}=await historyFixture(page);await select('history-a');await dialog.locator('summary').click();
  await page.evaluate(()=>{window.audioStops=0;window.audioRequests=0;Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:()=>{window.audioRequests++;return new Promise(resolve=>window.finishAudioPermission=()=>resolve({getTracks:()=>[{stop:()=>window.audioStops++}]}))}}})});
  await dialog.locator('[data-record-voice]').click();await expect(dialog.locator('[data-record-voice]')).toBeDisabled();await expect.poll(()=>page.evaluate(()=>window.audioRequests)).toBe(1);
  await dialog.locator('[data-discard-voice]').click();await page.evaluate(()=>window.finishAudioPermission());await expect.poll(()=>page.evaluate(()=>window.audioStops)).toBe(1);await expect(dialog.locator('[data-stop-voice]')).toBeDisabled();await expect(dialog.locator('[data-audio-preview]')).toBeHidden();
});

test('private recording captures PCM, requires consent and clears on session loss',async({page})=>{
  const {dialog,select}=await historyFixture(page);await select('history-a');await dialog.locator('summary').click();
  await page.evaluate(()=>{window.audioStops=0;window.audioClosed=0;Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>({getTracks:()=>[{stop:()=>window.audioStops++}]})}});window.AudioContext=class{sampleRate=48000;destination={};async resume(){}createMediaStreamSource(){return{connect(){},disconnect(){}}}createScriptProcessor(){window.audioProcessor={connect(){},disconnect(){},onaudioprocess:null};return window.audioProcessor}async close(){window.audioClosed++}}});
  await dialog.locator('[data-record-voice]').click();await expect(dialog.locator('[data-stop-voice]')).toBeEnabled();await page.evaluate(()=>window.audioProcessor.onaudioprocess({inputBuffer:{getChannelData:()=>new Float32Array(48000).fill(.25)}}));await dialog.locator('[data-stop-voice]').click();await expect(dialog.locator('[data-audio-preview]')).toBeVisible();await expect.poll(()=>page.evaluate(()=>window.audioStops)).toBe(1);
  await dialog.locator('[data-send-voice]').click();await expect(dialog.locator('[data-message-status]')).toContainText('راجع الصوت');
  await page.evaluate(()=>document.dispatchEvent(new CustomEvent('hydroland:session-cleared')));await expect(dialog).not.toBeVisible();await expect(dialog.locator('[data-audio-preview]')).not.toHaveAttribute('src');
});

test('account transitions clear cached sidebar previews even when the new list fails',async({page})=>{
  const {control,dialog,select}=await historyFixture(page);await select('history-a');await expect(dialog.locator('[data-conversation-id="history-a"]')).toContainText('History message 401');
  control.listError=true;
  await page.evaluate(()=>{sessionStorage.setItem('hl-access-token','another-account-access');sessionStorage.setItem('hl-refresh-token','another-account-refresh');document.dispatchEvent(new CustomEvent('hydroland:auth-changed'))});
  await expect(dialog.locator('[data-conversation-items]')).not.toContainText('Long conversation');await expect(dialog.locator('[data-conversation-items]')).not.toContainText('History message 401');await expect(dialog.locator('[data-message-id]')).toHaveCount(0);
  await page.waitForFunction(()=>window.__historyPending===0);await dialog.locator('[data-messages-close]').click();await page.locator('#top-messages').click();
  await expect(dialog.locator('[data-conversation-id]')).toHaveCount(0);await expect(dialog.locator('[data-message-id]')).toHaveCount(0);
});


test('private audio is default-off and source suspension stops capture while preserving existing playback',async({page})=>{
  const {control,dialog,select}=await historyFixture(page,{audioActive:false});Object.assign(control.messages.at(-1),{kind:'VOICE',privateAudio:true,body:null,durationSec:1});await select('history-a');await dialog.locator('summary').click();await expect(dialog.locator('[data-audio-policy]')).toContainText('يلزم اعتماد');await expect(dialog.locator('[data-record-voice]')).toBeDisabled();await expect(dialog.locator('[name=audioFile]')).toBeDisabled();await expect(dialog.locator('[data-send-voice]')).toBeDisabled();
  await page.evaluate(()=>{window.audioRequests=0;window.audioStops=0;Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:()=>{window.audioRequests++;return new Promise(resolve=>window.finishAudioPermission=()=>resolve({getTracks:()=>[{stop:()=>window.audioStops++}]}))}}});window.AudioContext=class{async resume(){}}});
  await dialog.locator('[data-record-voice]').dispatchEvent('click');expect(await page.evaluate(()=>window.audioRequests)).toBe(0);expect(control.sends).toHaveLength(0);
  const oldAudio=dialog.locator('[data-message-id=history-a-401] audio');await dialog.locator('[data-message-id=history-a-401]').getByRole('button',{name:'تحميل الصوت الخاص'}).click();await expect(oldAudio).toHaveAttribute('src',/^blob:/);
  control.audioActive=true;await page.evaluate(()=>window.HydrolandMessages.refreshAudioPolicy());await expect(dialog.locator('[data-record-voice]')).toBeEnabled();await dialog.locator('[data-record-voice]').click();await expect.poll(()=>page.evaluate(()=>window.audioRequests)).toBe(1);
  control.audioActive=false;await page.evaluate(()=>window.HydrolandMessages.refreshAudioPolicy());await page.evaluate(()=>window.finishAudioPermission());await expect.poll(()=>page.evaluate(()=>window.audioStops)).toBe(1);await expect(dialog.locator('[data-record-voice]')).toBeDisabled();await expect(dialog.locator('[data-audio-preview]')).toBeHidden();
  await dialog.locator('textarea[name="body"]').fill('Text remains available');await dialog.locator('[data-message-form] button[type="submit"]').click();await expect.poll(()=>control.sends.length).toBe(1);expect(control.sends[0].body.kind).toBe('TEXT');
});

test('a stale audio-policy response cannot re-enable upload after an account change',async({page})=>{
  const {control,dialog,select}=await historyFixture(page);await select('history-a');await dialog.locator('summary').click();control.audioPolicyGate=deferred();await page.evaluate(()=>{void window.HydrolandMessages.refreshAudioPolicy()});
  await page.evaluate(()=>{sessionStorage.setItem('hl-access-token','new-account');sessionStorage.setItem('hl-refresh-token','new-refresh');document.dispatchEvent(new CustomEvent('hydroland:auth-changed'))});control.audioActive=false;control.audioPolicyGate.resolve();control.audioPolicyGate=null;await page.waitForFunction(()=>window.__historyPending===0);await expect(dialog.locator('[data-record-voice]')).toBeDisabled();await expect(dialog.locator('[name=audioFile]')).toBeDisabled();
});
