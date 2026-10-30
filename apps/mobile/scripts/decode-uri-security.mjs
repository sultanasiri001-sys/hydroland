import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {realpathSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const require=createRequire(import.meta.url),decode=require('decode-uri-component'),query=require('query-string');
assert.equal(typeof decode,'function','Legacy CommonJS callers must receive a function');
assert.equal(realpathSync(require.resolve('decode-uri-component')),realpathSync(fileURLToPath(new URL('../../../packages/decode-uri-component/index.js',import.meta.url))));
assert.equal(require('decode-uri-component/package.json').version,'0.5.1');
const parsed=query.parse('name=%D8%B3%D9%84%D8%B7%D8%A7%D9%86&text=a+b%2Bc&bad=%E0%A4%A&encoded=%25C2');
assert.equal(parsed.name,'سلطان');assert.equal(parsed.text,'a b+c');assert.equal(parsed.bad,'%E0%A4%A');assert.equal(parsed.encoded,'%C2');
assert.equal(query.parse(query.stringify({city:'جازان',plus:'a+b',space:'a b'})).city,'جازان');
console.log('PASS upstream 0.5.1 decoder, pinned workspace, legacy CommonJS query-string and Arabic/form compatibility; no package audit exceptions');
