import { inspectDocument } from '../documents/document-validator';
function expectThrow(fn:()=>unknown){let threw=false;try{fn()}catch{threw=true}if(!threw)throw new Error('expected rejection');}
expectThrow(()=>inspectDocument(Buffer.from('not a pdf'),'application/pdf'));
expectThrow(()=>inspectDocument(Buffer.from([0x89,0x50]),'image/png'));
console.log('document security tests passed');
