import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { test } from 'node:test';

const source=await readFile(new URL('../src/hydroland-messages.js',import.meta.url),'utf8');
const start=source.indexOf('  const readMessageAnchor='),end=source.indexOf('  const renderConversation=',start);
assert(start>0&&end>start);
const {readMessageAnchor,restoreMessageAnchor}=vm.runInNewContext(source.slice(start,end)+';({readMessageAnchor,restoreMessageAnchor});');
const fixture=()=>{
  const stream={scrollTop:90,scrollHeight:500,getBoundingClientRect:()=>({top:40,bottom:240}),querySelectorAll:()=>stream.messages};
  stream.messages=[['older',10],['visible',70],['next',140]].map(([id,offset])=>({dataset:{messageId:id},offset,getBoundingClientRect(){const top=40+this.offset-stream.scrollTop;return{top,bottom:top+50}}}));
  return stream;
};
test('captures the first partially visible message by stable identity',()=>{
  const anchor=readMessageAnchor(fixture());assert.equal(anchor.id,'visible');assert.equal(anchor.top,20);
});
for(const currentTop of [0,350])test(`restores the viewport anchor after prepend with current scrollTop ${currentTop}`,()=>{
  const stream=fixture(),anchor=readMessageAnchor(stream),oldTop=stream.scrollTop,oldHeight=stream.scrollHeight;
  stream.messages.forEach(message=>message.offset+=300);stream.scrollHeight+=300;stream.scrollTop=currentTop;
  restoreMessageAnchor(stream,anchor,oldTop,oldHeight);
  assert.equal(stream.scrollTop,390);assert.equal(stream.messages[1].getBoundingClientRect().top,anchor.top);
});
test('history-button removal and unequal new rows preserve the visible message, not a guessed page size',()=>{
  const stream=fixture(),anchor=readMessageAnchor(stream),oldTop=stream.scrollTop,oldHeight=stream.scrollHeight;
  stream.messages.forEach(message=>message.offset+=32);stream.scrollHeight+=79;stream.scrollTop=0;
  restoreMessageAnchor(stream,anchor,oldTop,oldHeight);
  assert.equal(stream.scrollTop,122);assert.equal(stream.messages[1].getBoundingClientRect().top,anchor.top);
});
test('missing anchor falls back to the previous stream offset and height delta',()=>{
  const stream=fixture();stream.scrollHeight=700;restoreMessageAnchor(stream,{id:'removed',top:20},90,500);assert.equal(stream.scrollTop,290);
  stream.messages=[];assert.equal(readMessageAnchor(stream),null);
});
test('the dialog layout declares bounded rows and one explicit thread scroll container',async()=>{
  const css=await readFile(new URL('../src/hydroland-messages.css',import.meta.url),'utf8');
  assert.match(css,/\.hl-messages-dialog\{[^}]*overflow:hidden/);
  assert.match(css,/\.hl-messages-shell\{[^}]*grid-template-rows:minmax\(0,1fr\)/);
  assert.match(css,/\.hl-message-pane\{[^}]*grid-template-rows:auto minmax\(0,1fr\) auto;[^}]*min-height:0;[^}]*overflow:hidden/);
  assert.match(css,/\.hl-message-stream\{[^}]*min-height:0;overflow:auto;overflow-anchor:none/);
  assert.match(css,/@media\(max-width:760px\)[\s\S]*grid-template-rows:auto minmax\(0,1fr\)/);
  assert.doesNotMatch(css,/min-height:50vh/);
});
