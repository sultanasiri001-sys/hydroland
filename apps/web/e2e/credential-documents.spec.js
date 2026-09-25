import { test, expect } from '@playwright/test';

const installApi=async page=>{
  const state={
    profile:{id:'credential-web-e2e',email:'credential-web@hydroland.test',status:'ACTIVE',roleAssignments:[],person:{firstName:'Credential',lastName:'Web',professional:null}},
    credentials:[],
    uploadedPayload:null,
    accessRequests:0,
  };
  const authorized=request=>request.headers().authorization==='Bearer e2e-access';
  const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  await page.route(/\/api\/v1\/me$/,route=>authorized(route.request())?json(route,state.profile):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/me\/diver-profile$/,route=>authorized(route.request())?json(route,{profile:null,equipment:[]}):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/credentials$/,async route=>{
    const request=route.request();if(!authorized(request))return json(route,{message:'Unauthorized'},401);
    if(request.method()==='GET')return json(route,state.credentials);
    if(request.method()==='POST'){
      const input=request.postDataJSON(),credential={id:'credential-1',issuer:input.issuer,title:input.title,credentialNumber:input.credentialNumber||null,issuedAt:input.issuedAt||null,expiresAt:input.expiresAt||null,verificationStatus:'UNVERIFIED',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),documents:[]};state.credentials=[credential];return json(route,credential,201);
    }
    return json(route,{message:'Method not allowed'},405);
  });
  await page.route(/\/api\/v1\/credentials\/credential-1\/documents$/,async route=>{
    const request=route.request();if(!authorized(request))return json(route,{message:'Unauthorized'},401);
    const input=request.postDataJSON();state.uploadedPayload=input;
    const document={id:'document-1',credentialId:'credential-1',ownerId:'person-1',originalName:input.originalName,mimeType:input.mimeType,byteSize:Buffer.from(input.base64,'base64').length,sha256:'a'.repeat(64),status:'UPLOADED',createdAt:new Date().toISOString(),archivedAt:null};
    state.credentials[0].documents=[document];return json(route,document,201);
  });
  await page.route(/\/api\/v1\/credentials\/credential-1\/documents\/document-1\/access$/,route=>{state.accessRequests++;return json(route,{url:'about:blank#hydroland-signed-document',expiresAt:new Date(Date.now()+300000).toISOString()})});
  await page.route(/\/api\/v1\/credentials\/credential-1\/submit$/,route=>{state.credentials[0].verificationStatus='PENDING';return json(route,{id:'credential-1',status:'PENDING'})});
  return state;
};

const seed=async page=>{
  const state=await installApi(page);await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&document.querySelector('.hl-members')));
  await page.evaluate(async()=>{sessionStorage.setItem('hl-access-token','e2e-access');sessionStorage.setItem('hl-refresh-token','e2e-refresh');window.HydrolandAuth.syncAuthUi();await window.HydrolandProfile.load()});
  return state;
};

test('credential can be created, documented, privately opened and submitted from the browser',async({page})=>{
  const state=await seed(page),certificates=page.locator('.hl-certificates');
  const add=certificates.locator('.hl-member-actions button').first();await expect(add).toBeEnabled();await add.click();
  const editor=page.locator('#hl-credential-editor');await expect(editor).toBeVisible();
  await editor.locator('[name="issuer"]').fill('HYDROLAND E2E');await editor.locator('[name="title"]').fill('Rescue Diver E2E');await editor.locator('button[type="submit"]').click();
  await expect(editor).not.toBeVisible();await expect.poll(()=>page.evaluate(()=>window.HydrolandProfileData?.credentials?.length)).toBe(1);

  const credentialArticle=certificates.locator(':scope > article').first();await expect(credentialArticle).toContainText('Rescue Diver E2E');
  const fileInput=credentialArticle.locator('input[type="file"]');await expect(fileInput).toHaveCount(1);
  const png=Buffer.concat([Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),Buffer.from('web-e2e')]);
  await fileInput.setInputFiles({name:'certificate.png',mimeType:'image/png',buffer:png});
  await expect.poll(()=>state.uploadedPayload?.originalName).toBe('certificate.png');
  expect(Buffer.from(state.uploadedPayload.base64,'base64').equals(png)).toBe(true);
  await expect(credentialArticle).toContainText('1 مستند');await expect(credentialArticle).toContainText('certificate.png');

  const accessRequest=page.waitForRequest(request=>request.url().includes('/credentials/credential-1/documents/document-1/access'));
  await credentialArticle.getByRole('button',{name:'عرض المستند'}).click();await accessRequest;expect(state.accessRequests).toBe(1);

  await credentialArticle.getByRole('button',{name:'إرسال للتحقق'}).click();
  await expect.poll(()=>page.evaluate(()=>window.HydrolandProfileData?.credentials?.[0]?.verificationStatus)).toBe('PENDING');
  await expect(credentialArticle.getByRole('button',{name:'إرسال للتحقق'})).toHaveCount(0);
  await expect(credentialArticle.getByRole('button',{name:'عرض المستند'})).toBeVisible();
});
