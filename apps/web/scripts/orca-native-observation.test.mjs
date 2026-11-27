import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createNativeStartupBarrier,createNativePresentationBarrier,nativeControlInterruption,processedDocumentLoad} from '../a11y/orca-native-observation.mjs';

// Genuine diagnostic excerpts, run 44487597490 / artifact 14512555777.
// This regression replays event ordering; it does not claim a new native run.
const fixture=readFileSync(new URL('../a11y/fixtures/orca-46.1-startup-5c62ee0.txt',import.meta.url),'utf8');
const document={title:'HYDROLAND | هيدرولاند',uri:'http://127.0.0.1:4173/'};
const loadStart=fixture.indexOf('vvvvv PROCESS OBJECT EVENT document:load-complete');
const sayAllStart=fixture.indexOf('08:38:59.920870 - WEB SAY ALL:');
const initialControl=fixture.slice(0,loadStart);
const completedLoad=fixture.slice(loadStart,sayAllStart);

test('recognizes the genuinely processed document with its exact native URI and title',()=>{
  const proof=processedDocumentLoad(fixture,document);
  assert.ok(proof);
  assert.match(proof.event,/08:38:59\.839641/);
  assert.match(proof.attributes,/http:\/\/127\.0\.0\.1:4173\//);
  assert.ok(proof.endOffset>loadStart);
});

test('a queued or incomplete native event is insufficient',()=>{
  const queued="EVENT MANAGER: Queueing document:load-complete for [document web: '"+document.title+"']";
  assert.equal(processedDocumentLoad(queued,document),null);
  assert.equal(processedDocumentLoad(completedLoad.replace('^^^^^ PROCESS OBJECT EVENT document:load-complete ^^^^^',''),document),null);
  assert.equal(processedDocumentLoad(completedLoad.replace('Processing document:load-complete: script for event is active','event was ignored'),document),null);
});

test('another title, URI or document cannot satisfy the page boundary',()=>{
  assert.equal(processedDocumentLoad(fixture,{...document,title:'about:blank'}),null);
  assert.equal(processedDocumentLoad(fixture,{...document,uri:'http://127.0.0.1:4173/other'}),null);
  assert.equal(processedDocumentLoad(fixture.replaceAll("'URI': 'http://127.0.0.1:4173/'","'URI': 'https://example.invalid/'"),document),null);
  assert.equal(processedDocumentLoad(fixture,{title:'',uri:document.uri}),null);
});

test('fresh failing run proves the old Control_L occurred before the native load boundary',()=>{
  assert.ok(nativeControlInterruption(initialControl));
  assert.equal(processedDocumentLoad(initialControl,document),null);
  const observe=createNativeStartupBarrier(document);
  assert.equal(observe(initialControl,0),null);
  assert.equal(observe(initialControl,15_000),null);
  assert.equal(observe(initialControl+completedLoad,15_001),null);
});

test('asynchronous Say All after completed loading resets the stable presentation queue',()=>{
  const observe=createNativeStartupBarrier(document);
  const beforeSayAll=fixture.slice(0,sayAllStart);
  assert.equal(observe(beforeSayAll,0),null);
  assert.equal(observe(beforeSayAll,599),null);
  assert.equal(observe(fixture,600),null);
  assert.equal(observe(fixture,1199),null);
  const ready=observe(fixture,1200);
  assert.ok(ready);
  assert.equal(ready.stableForMs,600);
  assert.ok(ready.lastPresentationOffset>ready.endOffset);
});

test('interruption requires a complete native Control_L event that interrupted presentation',()=>{
  assert.match(nativeControlInterruption(initialControl).interruption,/08:38:59\.155861/);
  assert.equal(nativeControlInterruption(initialControl.replace('DEFAULT: Interrupting presentation','DEFAULT: Presenting keyboard event')),null);
  assert.equal(nativeControlInterruption(initialControl.replaceAll('Control_L','Control_R')),null);
  assert.equal(nativeControlInterruption(initialControl.split('^^^^^ PROCESS ATSPI_KEY_PRESSED_EVENT')[0]),null);
  assert.equal(nativeControlInterruption('Control_L'),null);
});

test('partial native blocks cannot borrow completion from another event',()=>{
  const partial=completedLoad.split('^^^^^ PROCESS OBJECT EVENT')[0];
  const foreign=completedLoad.replaceAll(document.uri,'https://example.invalid/');
  assert.equal(processedDocumentLoad(partial+foreign,document),null);
  assert.ok(processedDocumentLoad(foreign+completedLoad,document));
});

// Genuine D02 main failure, run 45928198468 / artifact 15167890025. The
// selected original lines retain the native queue sizes, focus and speech order.
const workspace=readFileSync(new URL('../a11y/fixtures/orca-46.1-workspace-1e6a612.txt',import.meta.url),'utf8');
const workspaceControl=workspace.indexOf("vvvvv PROCESS ATSPI_KEY_PRESSED_EVENT: 'Control_L'");
const restoredFocus=workspace.indexOf('02:30:11.703966 - EVENT MANAGER: Dequeued object:state-changed:focused');
const firstIdleStart=workspace.indexOf('vvvvv PROCESS OBJECT EVENT object:state-changed:focused (queue size: 0)');
const focusEnd='^^^^^ PROCESS OBJECT EVENT object:state-changed:focused ^^^^^';
const firstIdleEnd=workspace.indexOf(focusEnd,firstIdleStart)+focusEnd.length;
const firstIdle=workspace.slice(0,firstIdleEnd);
const laterQueue=workspace.indexOf('02:30:13.776342 - EVENT MANAGER: Queueing');
const drained=workspace.slice(0,laterQueue);

test('real workspace failure has a valid Control interruption before late focus and live speech',()=>{
  assert.ok(workspaceControl>firstIdleEnd&&restoredFocus>workspaceControl);
  assert.match(nativeControlInterruption(workspace.slice(workspaceControl,restoredFocus)).interruption,/02:30:11\.664172/);
  assert.match(workspace.slice(restoredFocus),/02:30:11\.841347 - SPEECH DISPATCHER: Speaking 'HYDROLAND/);
  assert.match(workspace.slice(restoredFocus),/02:30:11\.852310 - SPEECH DISPATCHER: Speaking 'تم تحديث الجهات والمدفوعات/);
  const observe=createNativePresentationBarrier(),interruptedTooEarly=workspace.slice(0,restoredFocus);
  assert.equal(observe(interruptedTooEarly,0),null);
  assert.equal(observe(interruptedTooEarly,15_000),null,'A stalled nonempty native queue must not become ready with time alone');
});

test('native workspace focus restoration invalidates an earlier stable presentation',()=>{
  const observe=createNativePresentationBarrier();
  assert.equal(observe(firstIdle,0),null);
  assert.ok(observe(firstIdle,600));
  const focusStarted=workspace.slice(0,workspace.indexOf('02:30:11.709604'));
  assert.equal(observe(focusStarted,601),null);
  assert.equal(observe(focusStarted,15_601),null);
  assert.equal(observe(drained,15_602),null);
  assert.equal(observe(drained,16_201),null);
  const proof=observe(drained,16_202);
  assert.equal(proof.queueSize,0);
  assert.equal(proof.liveRegionQueueSize,0);
  assert.equal(proof.stableForMs,600);
  assert.ok(proof.lastActivityOffset>workspace.indexOf('02:30:11.852310'));
});

test('genuine asynchronous native speech resets the presentation observation without fabricating silence',()=>{
  const observe=createNativePresentationBarrier();
  assert.equal(observe(completedLoad,0),null);
  assert.equal(observe(completedLoad,599),null);
  const withSpeech=fixture.slice(loadStart);
  assert.equal(observe(withSpeech,600),null);
  assert.equal(observe(withSpeech,1199),null);
  assert.equal(observe(withSpeech,1200).stableForMs,600);
});

test('a late native queued event must finish before observation starts again',()=>{
  const observe=createNativePresentationBarrier();
  assert.equal(observe(drained,0),null);
  assert.ok(observe(drained,600));
  const queuedOnly=workspace.slice(0,workspace.indexOf('\n',laterQueue)+1);
  assert.equal(observe(queuedOnly,601),null);
  assert.equal(observe(queuedOnly,15_601),null);
  assert.equal(observe(workspace,15_602),null);
  assert.ok(observe(workspace,16_202));
});

test('incomplete zero-queue processing and interruption alone cannot satisfy native presentation readiness',()=>{
  const incomplete=firstIdle.slice(0,firstIdle.length-focusEnd.length);
  for(const log of ['',initialControl,'The workspace DOM is visible',incomplete]){
    const observe=createNativePresentationBarrier();
    assert.equal(observe(log,0),null);
    assert.equal(observe(log,15_000),null);
  }
});

test('pending native live-region speech blocks readiness even after an otherwise completed event',()=>{
  const observe=createNativePresentationBarrier();
  // Fault-inject only the recorded count, preserving the original native event.
  // A nonempty queue cannot be used as proof of completed presentation.
  const lastQueue=drained.lastIndexOf('LIVE REGIONS: messages in queue: 0');
  const pending=drained.slice(0,lastQueue)+drained.slice(lastQueue).replace('LIVE REGIONS: messages in queue: 0','LIVE REGIONS: messages in queue: 1');
  assert.notEqual(pending,drained);
  assert.equal(observe(pending,0),null);
  assert.equal(observe(pending,15_000),null);
  assert.equal(observe(drained,15_001),null);
  assert.ok(observe(drained,15_601));
});
