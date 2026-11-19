import {test,expect} from '@playwright/test';
import {readFile,writeFile,mkdir,open,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {openWorkspaceSwitcher} from '../e2e/portal-test-helpers.js';
import {createNativeStartupBarrier,nativeControlInterruption} from './orca-native-observation.mjs';

const run=promisify(execFile);
const locale=process.env.HL_ORCA_LOCALE;
const logFile=process.env.HL_ORCA_DEBUG_LOG;
const evidenceDir=process.env.HL_ORCA_EVIDENCE_DIR;
const audioFile=process.env.HL_ORCA_PCM_FILE;
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
const readLog=()=>readFile(logFile,'utf8').catch(error=>{if(error.code==='ENOENT')return '';throw error});
const roles=['DIVER','INSTRUCTOR','DIVE_CENTER','BOAT_OWNER','ORGANIZATION','ADMIN'];
const bytesPerSecond=32_000; // Genuine Pulse monitor: mono signed PCM16LE, 16kHz.
const audioSize=async()=>{try{return(await stat(audioFile)).size;}catch(error){if(error.code==='ENOENT')return 0;throw error;}};
async function readAudio(start,end){
  const handle=await open(audioFile,'r');
  try{
    const buffer=Buffer.alloc(Math.max(0,end-start));
    const {bytesRead}=await handle.read(buffer,0,buffer.length,start);
    return buffer.subarray(0,bytesRead-bytesRead%2);
  }finally{await handle.close();}
}
function audioMetrics(pcm){
  let sum=0,peak=0,activeSamples=0;
  for(let i=0;i+1<pcm.length;i+=2){const sample=pcm.readInt16LE(i);sum+=sample*sample;peak=Math.max(peak,Math.abs(sample));if(Math.abs(sample)>200)activeSamples++;}
  return {rms:pcm.length?Math.sqrt(sum/(pcm.length/2)):0,peak,activeSamples,durationMs:pcm.length/bytesPerSecond*1000};
}
function wav(pcm){
  const header=Buffer.alloc(44);header.write('RIFF',0);header.writeUInt32LE(36+pcm.length,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(16000,24);header.writeUInt32LE(bytesPerSecond,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(pcm.length,40);return Buffer.concat([header,pcm]);
}

// This suite consumes real Orca diagnostics. It neither replaces the speech
// backend nor sends text to Orca. A DOM or accessibility snapshot cannot pass it.
test('Orca announces controls across all seven portals with the selected language voice',async({page},testInfo)=>{
  expect(['ar','en']).toContain(locale);
  expect(Boolean(logFile&&evidenceDir&&audioFile)).toBe(true);
  expect(testInfo.project.use.baseURL).toBe('http://127.0.0.1:4173');
  const voice=JSON.parse(await readFile(path.join(evidenceDir,'voice-'+locale+'.json'),'utf8'));
  expect(voice.lang.split('-')[0]).toBe(locale);
  const sourceSha=(await run('git',['rev-parse','HEAD'])).stdout.trim();
  const sourceTree=(await run('git',['rev-parse','HEAD^{tree}'])).stdout.trim();
  if(process.env.GITHUB_SHA)expect(sourceSha).toBe(process.env.GITHUB_SHA);
  await run('git',['diff','--exit-code','HEAD','--']);
  const untrackedSource=(await run('git',['ls-files','--others','--exclude-standard','--','apps/web/src','apps/web/public'],{cwd:path.resolve(testInfo.config.rootDir,'../../..')})).stdout.trim();
  expect(untrackedSource,'untracked served source cannot be attested by the checkout SHA').toBe('');
  await expect.poll(async()=>await readLog(),{timeout:20_000}).toContain('SPEECH: Using speech server factory:');
  expect(await readLog()).not.toContain('SPEECH: Not available');
  const rows=[];
  const blockedExternal=[];
  await page.addInitScript(()=>sessionStorage.setItem('hl-guest-mode','1'));
  await page.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(!['127.0.0.1','localhost'].includes(url.hostname)){
      blockedExternal.push({host:url.hostname,method:route.request().method()});
      return route.abort('blockedbyclient');
    }
    if(!url.pathname.startsWith('/api/v1/'))return route.continue();
    const pathname=url.pathname;
    if(pathname.endsWith('/me'))return json(route,{id:'orca-fixture-account',status:'ACTIVE',email:'orca@example.invalid',roleAssignments:roles.map(role=>({id:'orca-'+role,role,status:'ACTIVE'})),person:{firstName:'اسم تجريبي',lastName:'Accessibility fixture',professional:null}});
    if(pathname.endsWith('/me/diver-profile'))return json(route,{profile:{medicalFitnessStatus:'FIT'},equipment:[]});
    if(pathname.endsWith('/themes/active'))return json(route,{themeId:'ocean-horizon'});
    if(pathname.endsWith('/maps/public-config'))return json(route,{enabled:false,status:'NOT_SELECTED'});
    if(pathname.endsWith('/weather/public-config'))return json(route,{configured:false,status:'NOT_SELECTED'});
    if(pathname.endsWith('/admin/employees'))return json(route,{initialized:false,departments:[],profiles:[],items:[],nextCursor:null,email:{enabled:false},google:{enabled:false}});
    return json(route,[]);
  });
  const navigationLogOffset=(await readLog()).length;
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandI18n&&window.HydrolandDiverDashboard&&window.HydrolandPortalFreshness&&window.HydrolandWorkspaceUI));
  await page.waitForLoadState('load');
  await page.bringToFront();
  const observeStartup=createNativeStartupBarrier({title:await page.title(),uri:page.url()});
  let nativeStartup;
  await expect.poll(async()=>{
    nativeStartup=observeStartup((await readLog()).slice(navigationLogOffset),Date.now());
    return Boolean(nativeStartup);
  },{timeout:15_000,message:'Orca must process the loaded page before its startup reading is interrupted'}).toBe(true);
  await writeFile(path.join(evidenceDir,'startup-'+locale+'.json'),JSON.stringify({sourceSha,sourceTree,locale,navigationLogOffset,...nativeStartup},null,2)+'\n');

  async function announce(surface,name,locator){
    await expect(locator).toBeVisible();
    // Interrupt the previous page-load/live-region reading with an ordinary
    // desktop keystroke. This does not mute speech or inject an utterance; the
    // measured focus starts only after the real monitor becomes quiet.
    const interruptionOffset=(await readLog()).length;
    await run('xdotool',['key','--clearmodifiers','Control_L']);
    // Drain earlier announcements. Diagnostics alone can precede a failed
    // synthesis call, so each new focus also requires genuine native PCM output.
    let interruption;
    await expect.poll(async()=>{
      interruption=nativeControlInterruption((await readLog()).slice(interruptionOffset));
      if(!interruption)return false;
      const end=await audioSize();if(end<19_200)return false;
      const metrics=audioMetrics(await readAudio(end-19_200,end));
      return metrics.rms<40&&metrics.peak<150;
    },{timeout:15_000,message:'native speech must become quiet before '+surface}).toBe(true);
    const audioStart=(await audioSize())&~1;
    const offset=(await readLog()).length;
    await locator.focus();
    await expect(locator).toBeFocused();
    let utterance='';
    await expect.poll(async()=>{
      const tail=(await readLog()).slice(offset);
      const lines=tail.split('\n');
      const speech=lines.find(line=>line.includes('SPEECH DISPATCHER: Speaking')&&line.includes(name));
      const selectedVoice=lines.some(line=>line.includes('SPEECH OUTPUT:')&&line.includes(name)&&line.includes("'lang': '"+voice.lang+"'"));
      if(speech&&selectedVoice)utterance=speech;
      return Boolean(speech&&selectedVoice);
    },{timeout:12_000,message:surface+' must be announced by real Orca: '+name}).toBe(true);
    let pcm,signal;
    await expect.poll(async()=>{
      const end=Math.min((await audioSize())&~1,audioStart+20*bytesPerSecond);
      pcm=await readAudio(audioStart,end);signal=audioMetrics(pcm);
      return signal.rms>100&&signal.activeSamples>=800;
    },{timeout:12_000,message:'real native speech audio is required for '+surface}).toBe(true);
    await expect.poll(async()=>{
      const end=(await audioSize())&~1;
      const tail=audioMetrics(await readAudio(Math.max(audioStart,end-19_200),end));
      return end-audioStart>19_200&&tail.rms<40&&tail.peak<150;
    },{timeout:15_000,message:'native announcement must finish for '+surface}).toBe(true);
    pcm=await readAudio(audioStart,(await audioSize())&~1);signal=audioMetrics(pcm);
    const clip=wav(pcm),clipName='speech-'+locale+'-'+surface+'.wav';
    await mkdir(evidenceDir,{recursive:true});
    await writeFile(path.join(evidenceDir,clipName),clip);
    rows.push({surface,locale,name,utterance,interruption:{logOffset:interruptionOffset,...interruption},audio:{file:clipName,sha256:createHash('sha256').update(clip).digest('hex'),format:'PCM16LE mono 16000Hz',startByte:audioStart,...signal},observedAt:new Date().toISOString()});
  }

  async function selectLanguage(){
    const control=page.locator('[data-hl-locale-switch]:visible');
    await expect(control).toHaveCount(1);
    await expect(control).toBeEnabled();
    if(await page.locator('html').getAttribute('lang')!==locale){
      await control.focus();
      // Native X11 input travels through the same desktop as Orca and Chromium.
      await run('xdotool',['key','--clearmodifiers','Return']);
    }
    await expect(page.locator('html')).toHaveAttribute('lang',locale);
    await expect(page.locator('html')).toHaveAttribute('dir',locale==='ar'?'rtl':'ltr');
  }

  await selectLanguage();
  await announce('visitor',locale==='ar'?'الرئيسية':'Home',page.locator('#navigation a[href="#home"]'));
  await announce('visitor-search',locale==='ar'?'بحث':'Search',page.locator('#search-form input'));
  await page.evaluate(async()=>{
    window.HydrolandAuth.acceptSession({accessToken:'orca-synthetic-access',refreshToken:'orca-synthetic-refresh'},window.HydrolandAuth.beginAuthAttempt());
    await window.HydrolandProfile.load();
  });
  await expect(page.locator('#hl-diver-dashboard')).toBeVisible();
  await selectLanguage();
  await announce('diver',locale==='ar'?'الرئيسية':'Home',page.locator('#navigation a[href="#home"]'));

  for(const role of ['instructor','center','boat','organization','admin']){
    await openWorkspaceSwitcher(page);
    await page.locator('#role-dialog [data-role="'+role+'"]').click();
    const board=page.locator('.hl-role-dashboard[data-role="'+role+'"]');
    await expect(board).toBeVisible();
    await selectLanguage();
    const home=board.locator('.hl-portal-nav-item').first();
    const name=role==='admin'?(locale==='ar'?'مركز القيادة والتحكم':'Command center'):(locale==='ar'?'الرئيسية':'Home');
    await expect(home).toContainText(name);
    await announce(role,name,home);
    const input=board.locator('.hl-portal-search input');
    const searchName=role==='center'?(locale==='ar'?'بحث في بيانات المركز':'Search center data'):(locale==='ar'?'بحث في المنصة':'Search the platform');
    await announce(role+'-search',searchName,input);
    // Preserve real keyboard order and a draft while re-entering a text field.
    await input.fill('مسودة 125 <opaque>');
    await run('xdotool',['key','--clearmodifiers','Tab']);
    await expect(input).not.toBeFocused();
    await run('xdotool',['key','--clearmodifiers','shift+Tab']);
    await expect(input).toBeFocused();
    await expect(input).toHaveValue('مسودة 125 <opaque>');
  }
  expect(new Set(rows.filter(row=>!row.surface.endsWith('-search')).map(row=>row.surface)).size).toBe(7);
  expect(rows).toHaveLength(13);
  await mkdir(evidenceDir,{recursive:true});
  const receipt={schemaVersion:1,scope:'Orca + Chromium Linux synthetic UI smoke; no device or human usability claim',locale,voice,sourceSha,sourceTree,nativeStartup:{navigationLogOffset,...nativeStartup},browserVersion:page.context().browser().version(),rows,blockedExternal};
  const receiptPath=path.join(evidenceDir,'receipt-'+locale+'.json');
  await writeFile(receiptPath,JSON.stringify(receipt,null,2)+'\n');
  await testInfo.attach('orca-'+locale,{path:receiptPath,contentType:'application/json'});
});
