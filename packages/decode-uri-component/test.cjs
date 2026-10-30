'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const decode=require('./index.js');

test('CommonJS form queries retain Arabic, Unicode, spaces, literal plus and malformed bytes',()=>{
 for(const [encoded,expected] of [
  ['', ''],['a+b%2Bc','a b+c'],['%D8%B3%D9%84%D8%B7%D8%A7%D9%86','سلطان'],
  ['%F0%9F%8C%8A','🌊'],['%E2%82%AC','€'],['%25C2','%C2'],['%25%32%30','%20'],
  ['%zz','%zz'],['%','%'],['a%20b%zz','a b%zz'],['%C2','\uFFFD'],
  ['%FE%FF','\uFFFD\uFFFD'],['%FF%FE','\uFFFD\uFFFD'],['%E0%A4%A','%E0%A4%A'],
  ['%C0%AF','%C0%AF'],['%ED%A0%80','%ED%A0%80'],['%F4%90%80%80','%F4%90%80%80'],
 ])assert.equal(decode(encoded),expected,encoded);
 for(const input of [null,undefined,{},[],1,true])assert.throws(()=>decode(input),TypeError);
 for(let i=0;i<1000;i++){const value=String.fromCodePoint(0x600+i)+' + % '+String.fromCodePoint(0x1F300+i%200);assert.equal(decode(encodeURIComponent(value)),value);}
});

test('distinct malformed percent runs and a long invalid byte run finish within a hard process bound',()=>{
 const script=`const decode=require(process.argv[1]);let input='';for(let i=0;i<32000;i++){input+='%'+Math.floor(i/256).toString(16).padStart(2,'0')+'%'+(i%256).toString(16).padStart(2,'0')+'x';}input+='%zz';const output=decode(input);if(!output.endsWith('%zz'))process.exit(2);const invalid='%FF'.repeat(32000);if(decode(invalid)!==invalid)process.exit(3);console.log('bounded malformed decoding passed');`;
 const result=spawnSync(process.execPath,['-e',script,require.resolve('./index.js')],{timeout:2500,encoding:'utf8'});
 assert.equal(result.error,undefined,String(result.error));assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/bounded malformed decoding passed/);
});
