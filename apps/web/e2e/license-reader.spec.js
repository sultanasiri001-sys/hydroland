import {test,expect} from '@playwright/test';
import fixture from './fixtures/license-text-pdf.json';
test('real PDF reader extracts labelled fields from a text PDF',async({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async base64=>{const {readLicense}=await import('/hydroland-license-reader.mjs');return readLicense(new File([Uint8Array.from(atob(base64),x=>x.charCodeAt(0))],'license.pdf',{type:'application/pdf'}))},fixture.base64);
 expect(result).toEqual({referenceNumber:'TEST-123',issuedAt:'2025-01-02',expiresAt:'2030-03-04'});
});
test('real image OCR loads same-origin Arabic and English models',async({page})=>{
 test.setTimeout(120000);await page.goto('/');
 const external=[];page.on('request',request=>{if(!request.url().startsWith('http://127.0.0.1:4173/')&&!request.url().startsWith('data:'))external.push(request.url())});
 const result=await page.evaluate(async()=>{const canvas=document.createElement('canvas');canvas.width=1500;canvas.height=400;const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,1500,400);ctx.fillStyle='black';ctx.font='42px Arial';['License number: TEST-123','Issue date: 2025-01-02','Expiry date: 2030-03-04'].forEach((text,i)=>ctx.fillText(text,40,80+i*95));const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));const {readLicense}=await import('/hydroland-license-reader.mjs');return readLicense(new File([blob],'license.png',{type:'image/png'}))});
 expect(result.issuedAt).toBe('2025-01-02');expect(result.expiresAt).toBe('2030-03-04');expect(external.filter(url=>/tess|traineddata|pdf.*worker/i.test(url))).toEqual([]);
});
