import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {PDFDocument,StandardFonts} from 'pdf-lib';
import fixture from './fixtures/license-text-pdf.json';

async function readArabicImage(page,mimeType,eastern=false){
 const font=(await readFile(require.resolve('@fontsource/noto-sans-arabic/files/noto-sans-arabic-arabic-400-normal.woff2'))).toString('base64');
 return page.evaluate(async({font,mimeType,eastern})=>{
  const face=new FontFace('C12Noto','url(data:font/woff2;base64,'+font+')');await face.load();document.fonts.add(face);
  const lines=eastern?['رقم الرخصة: ٤٦٢٥١','تاريخ الإصدار: ٢٠٢٥-٠٣-١٨','تاريخ الانتهاء: ٢٠٢٨-٠٧-٢٤']:['رقم الرخصة: 46251','تاريخ الإصدار: 2025-03-18','تاريخ الانتهاء: 2028-07-24'];
  const canvas=document.createElement('canvas');canvas.width=1800;canvas.height=600;
  const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,1800,600);ctx.fillStyle='black';ctx.font='52px C12Noto';ctx.direction='rtl';ctx.textAlign='right';
  lines.forEach((text,index)=>ctx.fillText(text,1660,130+index*150));
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,mimeType,0.92));
  const {readLicense}=await import('/hydroland-license-reader.mjs');
  return readLicense(new File([blob],'synthetic-arabic-license.'+(mimeType==='image/png'?'png':'jpg'),{type:mimeType}));
 },{font,mimeType,eastern});
}

for(const mimeType of ['image/png','image/jpeg'])test(`real Arabic ${mimeType} OCR extracts all labelled Western-digit fields`,async({page})=>{
 test.setTimeout(120000);await page.goto('/');
 const fields=await readArabicImage(page,mimeType);
 await test.info().attach('arabic-ocr-result',{body:JSON.stringify({synthetic:true,mimeType,numerals:'Western',fields}),contentType:'application/json'});
 expect(fields).toEqual({referenceNumber:'46251',issuedAt:'2025-03-18',expiresAt:'2028-07-24'});
});

test('Arabic Eastern-digit image OCR never substitutes an incorrect numeral',async({page})=>{
 test.setTimeout(120000);await page.goto('/');
 const fields=await readArabicImage(page,'image/png',true);
 await test.info().attach('arabic-ocr-result',{body:JSON.stringify({synthetic:true,mimeType:'image/png',numerals:'Eastern',fields}),contentType:'application/json'});
 for(const [key,value] of Object.entries({referenceNumber:'46251',issuedAt:'2025-03-18',expiresAt:'2028-07-24'}))expect([undefined,value]).toContain(fields[key]);
});
test('real PDF reader extracts labelled fields from a text PDF',async({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async base64=>{const {readLicense}=await import('/hydroland-license-reader.mjs');return readLicense(new File([Uint8Array.from(atob(base64),x=>x.charCodeAt(0))],'license.pdf',{type:'application/pdf'}))},fixture.base64);
 expect(result).toEqual({referenceNumber:'TEST-123',issuedAt:'2025-01-02',expiresAt:'2030-03-04'});
});
test('real image OCR loads same-origin Arabic and English models',async({page})=>{
 test.setTimeout(120000);await page.goto('/');
 const origin=new URL(page.url()).origin,external=[];page.on('request',request=>{if(!request.url().startsWith(origin+'/')&&!request.url().startsWith('data:'))external.push(request.url())});
 const result=await page.evaluate(async()=>{const canvas=document.createElement('canvas');canvas.width=1500;canvas.height=400;const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,1500,400);ctx.fillStyle='black';ctx.font='42px Arial';['License number: TEST-123','Issue date: 2025-01-02','Expiry date: 2030-03-04'].forEach((text,i)=>ctx.fillText(text,40,80+i*95));const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));const {readLicense}=await import('/hydroland-license-reader.mjs');return readLicense(new File([blob],'license.png',{type:'image/png'}))});
 expect(result.issuedAt).toBe('2025-01-02');expect(result.expiresAt).toBe('2030-03-04');expect(external.filter(url=>/tess|traineddata|pdf.*worker/i.test(url))).toEqual([]);
});

test('real PDF reader withholds an ambiguous date while preserving the other fields',async({page})=>{
 const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica),sheet=pdf.addPage([720,400]);
 ['License number: AMBIGUOUS-123','Issue date: 2025-01-01 or 2026-02-02','Expiry date: 2030-03-04'].forEach((text,index)=>sheet.drawText(text,{x:35,y:330-index*60,size:18,font}));
 await page.goto('/');
 const fields=await page.evaluate(async encoded=>{
  const {readLicense}=await import('/hydroland-license-reader.mjs');
  return readLicense(new File([Uint8Array.from(atob(encoded),char=>char.charCodeAt(0))],'ambiguous.pdf',{type:'application/pdf'}));
 },Buffer.from(await pdf.save()).toString('base64'));
 expect(fields).toEqual({referenceNumber:'AMBIGUOUS-123',expiresAt:'2030-03-04'});
});

test('uncertain numerals on an Arabic scanned permit are left for manual review',async({page})=>{
 test.setTimeout(120000);
 const sample=await readFile(join(__dirname,'fixtures/license-arabic-scan.pdf'));
 await page.goto('/');
 const fields=await page.evaluate(async encoded=>{
  const {readLicense}=await import('/hydroland-license-reader.mjs');
  const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
  return readLicense(new File([bytes],'permit.pdf',{type:'application/pdf'}));
 },sample.toString('base64'));
 for(const [key,value] of Object.entries({referenceNumber:'46251',issuedAt:'2025-03-18',expiresAt:'2028-07-24'})){
  expect([undefined,value]).toContain(fields[key]);
 }
});

test('automatic reading enforces byte and page limits and permits cancellation',async({page})=>{
 const pdf=await PDFDocument.create();for(let page=0;page<7;page++)pdf.addPage();
 await page.goto('/');
 const results=await page.evaluate(async encoded=>{
  const {readLicense}=await import('/hydroland-license-reader.mjs');
  const outcome=async(file,options)=>{try{await readLicense(file,options);return 'unexpected success'}catch(error){return {name:error.name,message:error.message}}};
  const cancelled=new AbortController();cancelled.abort();
  return {
   bytes:await outcome(new File([new Uint8Array(2000001)],'large.png',{type:'image/png'})),
   pages:await outcome(new File([Uint8Array.from(atob(encoded),char=>char.charCodeAt(0))],'seven.pdf',{type:'application/pdf'})),
   cancelled:await outcome(new File(['cancelled'],'cancelled.pdf',{type:'application/pdf'}),{signal:cancelled.signal}),
  };
 },Buffer.from(await pdf.save()).toString('base64'));
 expect(results.bytes.message).toMatch(/2|٢/);expect(results.pages.message).toContain('6');expect(results.cancelled.name).toBe('AbortError');
});

test('a stalled file read returns the manual-entry timeout at 90 seconds',async({page})=>{
 await page.goto('/');await page.clock.install();
 await page.evaluate(async()=>{
  const {readLicense}=await import('/hydroland-license-reader.mjs');
  const file=new File(['pending'],'pending.pdf',{type:'application/pdf'});file.arrayBuffer=()=>new Promise(()=>{});
  globalThis.c12PendingRead=readLicense(file).then(()=>({unexpectedSuccess:true}),error=>({name:error.name,message:error.message}));
 });
 await page.clock.fastForward(90001);
 const result=await page.evaluate(()=>globalThis.c12PendingRead);
 expect(result.unexpectedSuccess).toBeUndefined();expect(result.message).toMatch(/يدويًا|manually/);
});
