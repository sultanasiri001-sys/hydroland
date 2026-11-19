import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createNativeStartupBarrier,nativeControlInterruption,processedDocumentLoad} from '../a11y/orca-native-observation.mjs';

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
