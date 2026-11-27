import {test,expect} from '@playwright/test';
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
async function fixture(page,{active=true,admin=false}={}){
 const profile={id:'community-member',email:'member@example.invalid',status:'ACTIVE',roleAssignments:admin?[{role:'ADMIN',status:'ACTIVE'}]:[],person:{firstName:'Synthetic',lastName:'Member'}};
 const control={profile,active,posts:[],mine:[],events:[{id:'event-1',title:'Synthetic coast activity',description:'Isolated browser fixture',locationName:'Fixture coast',startsAt:'2030-01-01T09:00:00Z'}],volunteers:{approvedMinutes:45,registrations:[{id:'volunteer-1',event:{title:'Registered activity'},status:'REGISTERED'}]},engagements:[{id:'engagement-1',subject:'Private advice fixture',status:'OPEN'}],calls:[],denySave:false,holdMine:null,denyMine:false};
 await page.route(/\/api\/v1\//,route=>json(route,{message:'Isolated unmatched fixture request'},404));
 await page.route(/\/api\/v1\/(?:dive-logs|customer-service\/cases\/mine)$/,route=>json(route,[]));
 await page.route(/\/api\/v1\/me$/,r=>json(r,profile));await page.route(/\/api\/v1\/credentials$/,r=>json(r,[]));await page.route(/\/api\/v1\/me\/diver-profile$/,r=>json(r,{profile:null,equipment:[]}));
 await page.route(/\/api\/v1\/community\/.*/,async route=>{
   const req=route.request(),path=new URL(req.url()).pathname.split('/community/')[1],method=req.method();const body=method==='GET'?undefined:req.postDataJSON();control.calls.push({path,method,body});
   if(path==='policy')return json(route,{active:control.active,noticeAr:'سياسة اصطناعية لاختبار الواجهة فقط',noticeEn:'Synthetic browser policy only',retentionDays:30});
   if(path==='posts/mine'){if(control.holdMine){const wait=control.holdMine;control.holdMine=null;await wait}return control.denyMine?json(route,{message:'Forbidden'},403):json(route,control.mine)}
   if(path==='posts'&&method==='GET')return json(route,control.posts);
   if(path==='events')return json(route,control.events);
   if(path==='volunteers/mine')return json(route,control.volunteers);
   if(path==='engagement-requests/mine')return json(route,control.engagements);
   if(path==='admin/policy-sources')return json(route,[{id:'policy-1',referenceNumber:'HYD-D16-001',titleAr:'سياسة المجتمع المعتمدة',titleEn:'Approved community policy',version:2,contentHash:'internal-hash-never-prompted'}]);
   if(path==='admin/policy-authoring')return json(route,{moderators:[{id:'moderator-1',label:'Synthetic moderator'}]});
   if(path==='admin/policy-drafts')return json(route,{organizationId:'org-1',documentId:'draft-policy-1',status:'DRAFT'},201);
   if(path==='admin/policy')return json(route,{active:true});
   if(path==='admin/reports')return json(route,[{caseId:'case-1',postId:'post-reported',reportedTitle:'Private case snapshot',reportedBody:'Held evidence content',status:'CLOSED'}]);
   if(path.startsWith('admin/'))return json(route,[]);
   if(path==='posts'&&method==='POST'){if(control.denySave)return json(route,{message:'Raw internal conflict'},409);const p={id:'post-1',title:body.title,body:body.body,status:'PENDING_REVIEW',updatedAt:'2026-11-27T10:00:00.000Z'};control.mine=[p];return json(route,p,201)}
   if(path==='posts/post-1'&&method==='PATCH'){const p={...control.mine[0],...body,status:'PENDING_REVIEW',updatedAt:'2026-11-27T10:01:00.000Z'};control.mine=[p];control.posts=[];return json(route,p)}
   if(path==='posts/post-1/withdraw'){control.mine=[];control.posts=[];return json(route,{hidden:true},201)}
   if(path==='posts/post-1/report')return json(route,{caseId:'case-browser-fixture'},201);
   if(path==='volunteers/volunteer-1/cancel'){control.volunteers.registrations=[];return json(route,{status:'CANCELLED'})}
   if(path==='engagement-requests/engagement-1/cancel'){control.engagements=[];return json(route,{status:'CANCELLED'})}
   return json(route,{},201);
 });
 await page.goto('/');await page.waitForFunction(()=>window.HydrolandCommunity&&window.HydrolandAuth&&window.HydrolandProfile);
 await page.evaluate(async()=>{sessionStorage.setItem('hl-access-token','community-fixture-token');sessionStorage.setItem('hl-refresh-token','community-fixture-refresh');window.HydrolandAuth.syncAuthUi();document.dispatchEvent(new CustomEvent('hydroland:auth-changed'));await window.HydrolandProfile.load()});
 const communityEntry=page.locator('.sidebar a[href="#community"]');
 if(!await communityEntry.isVisible())await page.locator('#menu').click();
 await communityEntry.click();
 const root=page.locator('.hl-community');await expect(root).toBeVisible();await expect(root).toContainText(active?'سياسة اصطناعية':'يلزم اعتماد');return{control,root};
}

test('community uses native create edit report and deletion routes and retains failed input',async({page})=>{
 const {control,root}=await fixture(page);const form=root.locator('[data-community-form=post]');await form.locator('[name=title]').fill('Synthetic community post');await form.locator('[name=body]').fill('Content needs independent moderation');control.denySave=true;await form.locator('button[type=submit]').click();await expect(root.locator('[data-community-status]')).toContainText('تغيرت البيانات');await expect(form.locator('[name=body]')).toHaveValue('Content needs independent moderation');await expect(root).not.toContainText('Raw internal conflict');
 control.denySave=false;await form.locator('button[type=submit]').click();await expect(root.locator('[data-community-mine]')).toContainText('Synthetic community post');await root.locator('[data-community-action=edit]').click();await form.locator('[name=body]').fill('Revised content');await form.locator('button[type=submit]').click();await expect(root.locator('[data-community-mine]')).toContainText('Revised content');expect(control.calls.find(c=>c.method==='PATCH'&&c.path==='posts/post-1').body.expectedUpdatedAt).toBe('2026-11-27T10:00:00.000Z');
 control.posts=[{...control.mine[0],status:'PUBLISHED',publishedAt:'2026-11-27T10:05:00Z'}];await page.evaluate(()=>window.HydrolandCommunity.reload());page.once('dialog',d=>d.accept('Synthetic content report'));await root.locator('[data-community-action=report]').click();await expect(root.locator('[data-community-status]')).toContainText('case-browser-fixture');
 page.once('dialog',d=>d.accept());await root.locator('[data-community-action=withdraw]').click();await expect(root.locator('[data-community-mine]')).not.toContainText('Revised content');
});

test('suspended community policy preserves owner withdrawal and cancellation controls',async({page})=>{
 const {control,root}=await fixture(page,{active:false});control.mine=[{id:'post-1',title:'Private pending source',body:'Private contents',status:'PENDING_REVIEW',updatedAt:'2026-11-27T10:00:00Z'}];await page.evaluate(()=>window.HydrolandCommunity.reload());await expect(root.locator('[data-community-form=post]')).toHaveCount(0);await expect(root).toContainText('Private pending source');
 await root.locator('[data-community-action=cancel-volunteer]').click();await expect(root).not.toContainText('Registered activity');await root.locator('[data-community-action=cancel-engagement]').click();await expect(root).not.toContainText('Private advice fixture');page.once('dialog',d=>d.accept());await root.locator('[data-community-action=withdraw]').click();await expect(root).not.toContainText('Private pending source');
});

test('policy preparation uses named moderator and native draft, activation keeps hashes out of user input',async({page})=>{
 const {control,root}=await fixture(page,{active:false,admin:true});await root.locator('[data-community-admin]>summary').click();await expect(root).not.toContainText('internal-hash-never-prompted');await expect(root.locator('input[name=expectedHash]')).toHaveCount(0);await root.locator('[data-community-form=policy] button').click();await expect(root.locator('[data-community-status]')).toContainText('تم تنفيذ الإجراء');expect(control.calls.find(c=>c.path==='admin/policy'&&c.method==='PUT').body).toEqual({documentId:'policy-1',expectedVersion:2,expectedHash:'internal-hash-never-prompted'});
 await root.locator('[data-community-admin]>summary').click();await root.locator('summary').filter({hasText:'إعداد مسودة السياسة'}).click();const form=root.locator('[data-community-form=policy-draft]');await form.locator('[name=moderatorAccountId]').selectOption('moderator-1');await form.locator('[name=retentionDays]').fill('45');await form.locator('[name=noticeAr]').fill('سياسة مقترحة اصطناعية للمراجعة');await form.locator('[name=noticeEn]').fill('Synthetic proposed policy for review');await form.locator('[name=enabled]').check();await page.evaluate(()=>{window.openedNativeDocument=null;window.HydrolandDocuments={open:async opts=>window.openedNativeDocument=opts}});await form.locator('button').click();await expect.poll(()=>page.evaluate(()=>window.openedNativeDocument?.documentId)).toBe('draft-policy-1');expect(control.calls.find(c=>c.path==='admin/policy-drafts').body.retentionDays).toBe(45);expect(control.calls.find(c=>c.path==='admin/policy-drafts').body.privateAudioEnabled).toBe(false);await expect(root).toContainText('Held evidence content');
});

test('authority loss and delayed responses cannot restore old community data',async({page})=>{
 const {control,root}=await fixture(page,{admin:true});control.mine=[{id:'post-1',title:'Secret previous account post',body:'Private body',status:'PENDING_REVIEW'}];await page.evaluate(()=>window.HydrolandCommunity.reload());await expect(root).toContainText('Secret previous account post');
 let release;control.holdMine=new Promise(r=>release=r);await page.evaluate(()=>{void window.HydrolandCommunity.reload()});await expect.poll(()=>control.holdMine===null).toBe(true);control.denyMine=true;
 await page.evaluate(()=>{window.HydrolandProfileData.profile.roleAssignments=[];document.dispatchEvent(new CustomEvent('hydroland:profile-data-ready'))});await expect(root).not.toContainText('Secret previous account post');await expect(root).not.toContainText('Held evidence content');release();await page.waitForTimeout(150);await expect(root).not.toContainText('Secret previous account post');
 await page.evaluate(()=>document.dispatchEvent(new CustomEvent('hydroland:session-cleared')));await expect(root).not.toContainText('Private body');
});

// D10: actual responsive composition of the current community UI. The API
// boundary is an isolated browser fixture, not a live policy or customer record.
for(const width of [320,1024])for(const language of ['ar','en'])for(const active of [true,false]){
 test('D10 community '+language+' '+width+'px policy '+(active?'active':'suspended')+' stays usable',async({page},testInfo)=>{
  await page.setViewportSize({width,height:900});
  const {control,root}=await fixture(page,{active});
  const title='منشور تجريبي لاختبار عرض الواجهة على الشاشات المختلفة';
  const body='بيانات اصطناعية للمراجعة البصرية فقط. '+'REFERENCE'.repeat(18);
  control.mine=[{id:'post-1',title,body,status:'PENDING_REVIEW',updatedAt:'2026-11-27T10:00:00.000Z'}];
  control.posts=[{id:'published-visual',title,body,status:'PUBLISHED',publishedAt:'2026-11-27T10:00:00.000Z'}];
  await page.evaluate(()=>window.HydrolandCommunity.reload());
  await page.evaluate(value=>window.HydrolandI18n.setLocale(value),language);
  await expect(page.locator('html')).toHaveAttribute('dir',language==='ar'?'rtl':'ltr');
  await expect(root).toContainText(title);
  if(active){
   const form=root.locator('[data-community-form=post]');
   await form.locator('[name=title]').fill(title);
   await form.locator('[name=body]').fill(body);
   await form.locator('button[type=submit]').click();
   await expect.poll(()=>control.calls.filter(call=>call.path==='posts'&&call.method==='POST').length).toBe(1);
   await expect(root.locator('[data-community-status]')).toHaveText(language==='en'?'Action completed.':'تم تنفيذ الإجراء.');
   await expect(root.locator('[data-community-mine]')).toContainText(title);
   const postGeometry=await root.locator('[data-community-mine] strong').evaluate(node=>({titleBottom:node.getBoundingClientRect().bottom,statusTop:node.nextElementSibling.getBoundingClientRect().top}));
   expect(postGeometry.statusTop).toBeGreaterThanOrEqual(postGeometry.titleBottom);
  }else{
   await expect(root.locator('[data-community-form=post]')).toHaveCount(0);
   await expect(root.locator('[data-community-action=withdraw]')).toBeVisible();
   await expect(root.locator('[data-community-action=cancel-volunteer]')).toBeVisible();
  }
  if(width===320){
   // Visible labels must stay inside their own touch target, not merely inside
   // the viewport. A desktop workspace rule previously crowded adjacent labels.
   const navigationLabels=await page.locator('.mobile-nav .nav-item').evaluateAll(items=>items.map(item=>{
    const bounds=item.getBoundingClientRect(),label=item.querySelector(':scope > span:last-child');
    const range=document.createRange();range.selectNodeContents(label);
    return {label:label.textContent,left:bounds.left,right:bounds.right,width:bounds.width,height:bounds.height,
     targetAtCenter:document.elementFromPoint(bounds.left+bounds.width/2,bounds.top+bounds.height/2)?.closest('.nav-item')===item,
     lines:[...range.getClientRects()].map(rect=>({left:rect.left,right:rect.right}))};
   }));
   expect(navigationLabels).toHaveLength(5);
   for(const item of navigationLabels){
    expect(item.width,JSON.stringify(item)).toBeGreaterThanOrEqual(44);
    expect(item.height,JSON.stringify(item)).toBeGreaterThanOrEqual(44);
    expect(item.targetAtCenter,JSON.stringify(item)).toBe(true);
    for(const line of item.lines){
     expect(line.left,JSON.stringify(item)).toBeGreaterThanOrEqual(item.left+2);
     expect(line.right,JSON.stringify(item)).toBeLessThanOrEqual(item.right-2);
    }
   }
  }
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:testInfo.outputPath('community-'+language+'-'+width+'-'+(active?'active':'suspended')+'.png'),fullPage:true});
  await root.screenshot({path:testInfo.outputPath('community-section-'+language+'-'+width+'-'+(active?'active':'suspended')+'.png')});
  const geometry=await root.evaluate(section=>{
   const viewport=document.documentElement.clientWidth;
   return {
    viewport,scroll:document.documentElement.scrollWidth,
    overflow:[...document.querySelectorAll('body *')].filter(node=>{
     const rect=node.getBoundingClientRect();
     return node.getClientRects().length&&rect.width&&getComputedStyle(node).visibility!=='hidden'&& !node.closest('.sidebar')&& (rect.left < -1||rect.right>viewport+1);
    }).slice(0,12).map(node=>({tag:node.tagName,id:node.id,className:node.className,left:node.getBoundingClientRect().left,right:node.getBoundingClientRect().right})),
    controls:[...section.querySelectorAll('button,input,textarea,select')].filter(node=>node.getClientRects().length).map(node=>{
     const rect=node.getBoundingClientRect();
     return {name:node.getAttribute('name')||node.textContent,left:rect.left,right:rect.right,width:rect.width};
    }),
   };
  });
  expect(geometry.scroll,JSON.stringify(geometry)).toBeLessThanOrEqual(geometry.viewport+1);
  for(const control of geometry.controls){
   expect(control.left,JSON.stringify(control)).toBeGreaterThanOrEqual(-1);
   expect(control.right,JSON.stringify(control)).toBeLessThanOrEqual(geometry.viewport+1);
   expect(control.width,JSON.stringify(control)).toBeGreaterThan(20);
  }
 });
}
