import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';

// Only imported by the loopback/ephemeral-database-fenced form-library suite.
export async function checkTemplatePreview({db,base,owner,staff,outsider,org,template}){
 const url=path=>new URL(path,base.href.endsWith('/')?base:`${base.href}/`);
 const request=(actor,path,method='GET',body)=>fetch(url(path),{method,headers:{authorization:`Bearer ${actor.token}`,...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(30000)});
 let passed=0;const pass=name=>{passed++;console.log(`PREVIEW PASS ${passed}: ${name}`);};
 const before=await db.managedDocument.findMany({where:{organizationId:org.id},orderBy:{id:'asc'},include:{lifecycleEvents:{orderBy:{id:'asc'}},revisions:{orderBy:{version:'asc'}}}});
 const initialCount=await db.documentTemplate.count({where:{organizationId:org.id}});
 const f=template.fields[0];
 const invalid=[
  {fields:[f,f]}, {fields:[{...f,type:'SCRIPT'}]}, {fields:[{...f,required:'true'}]},
  {fields:[{...f,key:'newOperationalKey'}]}, {fields:[{...f,type:'NUMBER'}]},
  {fields:[{...f,options:['new-binding']}]}, {fields:[{...f,labelAr:'x'.repeat(201)}]},
  {fields:Array.from({length:101},(_,i)=>({...f,key:'field'+i}))}, {version:99}, {printable:'yes'}, {titleAr:''},
 ];
 for(const body of invalid){const r=await request(owner,`documents/templates/${template.id}`,'PUT',body);assert.equal(r.status,400,JSON.stringify(body)+' '+await r.text());}
 assert.equal(await db.documentTemplate.count({where:{organizationId:org.id}}),initialCount);pass('eleven malformed or incompatible updates produce no template versions');
 for(const code of ['CLIB-HR-PERMANENT','LEG-DIVE-COOPERATION-V1']){
  const r=await request(owner,'documents/templates','POST',{organizationId:org.id,code,department:'HR',titleAr:'محظور',titleEn:'Forbidden',fields:[f]});assert.equal(r.status,403);
 }
 pass('specialized contracts cannot bypass their own approval and signing paths');
 const logoBytes=await sharp({create:{width:80,height:50,channels:3,background:{r:80,g:160,b:180}}}).png().toBuffer();
 let r=await request(owner,`documents/organizations/${org.id}/logo`,'POST',{mimeType:'image/png',base64:logoBytes.toString('base64')});assert.ok(r.ok,await r.clone().text());const asset=await r.json();
 r=await request(owner,`documents/organizations/${org.id}/branding`,'PUT',{logoAssetId:asset.id,brandNameAr:'مركز اختبار — معاينة فقط',brandNameEn:'Synthetic preview center'});assert.ok(r.ok,await r.clone().text());
 r=await request(staff,`documents/organizations/${org.id}/branding/logo/${asset.id}`);assert.equal(r.status,200);assert.match(r.headers.get('cache-control')||'',/no-store/);assert.equal(r.headers.get('x-content-type-options'),'nosniff');assert.deepEqual(Buffer.from(await r.arrayBuffer()),logoBytes);pass('authorized secondary logo is served privately without external URL fetching');
 assert.equal((await request(outsider,`documents/organizations/${org.id}/branding/logo/${asset.id}`)).status,403);pass('foreign account cannot fetch the center logo');
 const endpoint=`documents/organizations/${org.id}/templates/${template.id}/preview-pdf`;
 r=await request(owner,endpoint,'POST',{titleAr:'معاينة غير محفوظة',titleEn:'Unsaved preview',fields:template.fields});assert.equal(r.status,200,await r.clone().text());
 assert.equal(r.headers.get('content-type'),'application/pdf');assert.match(r.headers.get('cache-control')||'',/no-store/);
 const bytes=new Uint8Array(await r.arrayBuffer()),pdf=await PDFDocument.load(bytes);assert.match(pdf.getSubject()||'',/TEMPLATE PREVIEW/);assert.ok(pdf.getPageCount()>0);
 const objects=Array.from(pdf.context.enumerateIndirectObjects(),([,value])=>String(value)).join('\n');assert.match(objects,/Amiri-Regular/);assert.match(objects,/Amiri-Bold/);assert.ok((objects.match(/\/Subtype \/Image/g)||[]).length>=2);
 await mkdir('/tmp/form-library-evidence',{recursive:true});await writeFile('/tmp/form-library-evidence/template-preview.pdf',bytes);pass('editable preview uses actual renderer, embedded Arabic fonts and both logos');
 r=await request(staff,endpoint,'POST',{});assert.equal(r.status,200);await r.arrayBuffer();pass('read-only template preview does not require publishing authority');
 assert.equal((await request(staff,endpoint,'POST',{titleAr:'not allowed'})).status,403);pass('staff cannot preview unpublished template edits');
 assert.equal((await request(outsider,endpoint,'POST',{})).status,403);pass('preview rejects cross-organization access');
 assert.equal((await request(owner,endpoint,'POST',{approvedByAccountId:owner.id,status:'SIGNED'})).status,400);pass('preview cannot accept forged approval or signing metadata');
 const after=await db.managedDocument.findMany({where:{organizationId:org.id},orderBy:{id:'asc'},include:{lifecycleEvents:{orderBy:{id:'asc'}},revisions:{orderBy:{version:'asc'}}}});
 assert.deepEqual(after,before);assert.equal(await db.documentTemplate.count({where:{organizationId:org.id}}),initialCount);pass('preview and rejected requests do not modify documents, templates, revisions or evidence');
 return passed;
}
