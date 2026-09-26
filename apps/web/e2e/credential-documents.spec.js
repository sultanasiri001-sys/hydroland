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
  await credentialArticle.getByRole('button',{name:'عرض المستند'}).click();await accessRequest;await expect.poll(()=>state.accessRequests).toBe(1);

  await credentialArticle.getByRole('button',{name:'إرسال للتحقق'}).click();
  await expect.poll(()=>page.evaluate(()=>window.HydrolandProfileData?.credentials?.[0]?.verificationStatus)).toBe('PENDING');
  await expect(credentialArticle.getByRole('button',{name:'إرسال للتحقق'})).toHaveCount(0);
  await expect(credentialArticle.getByRole('button',{name:'عرض المستند'})).toBeVisible();
});

test('admin records official organization evidence before approving a pending credential',async({page})=>{
  const pending=[{id:'pending-credential',issuer:'NAUI',title:'Pending Rescue Credential',verificationStatus:'PENDING',externalVerificationEvidenceRecordedAt:null,person:{firstName:'Diver',lastName:'One',account:{email:'diver@hydroland.test'}},documents:[{id:'pending-document',originalName:'evidence.pdf',mimeType:'application/pdf',byteSize:128,status:'UPLOADED',createdAt:new Date().toISOString()}]}];
  const catalog=[
    {source:'SWSDF',name:'Saudi Water Sports and Diving Federation',scope:['SAUDI_PROFESSIONAL_LICENSE'],methods:['PRO_LICENSE_VALIDATION'],verificationUrl:'https://swsdf.sa/diving/license-validation',saudiEvidence:'National professional diver licensing authority in Saudi Arabia.'},
    {source:'NAUI',name:'National Association of Underwater Instructors',scope:['RECREATIONAL','PROFESSIONAL'],methods:['ONLINE_DIVER_VERIFY'],verificationUrl:'https://www.naui.org/services/verify-diver-certification/',saudiEvidence:'Supported for official certification verification; Saudi professional licensing remains subject to SWSDF.'},
  ];
  let reviewAccess=0,decision=null,evidence=null;
  const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)}),authorized=request=>request.headers().authorization==='Bearer e2e-access';
  const profile={id:'admin-web-e2e',email:'admin@hydroland.test',status:'ACTIVE',roleAssignments:[{id:'admin-role',role:'ADMIN',status:'ACTIVE'}],person:{firstName:'Admin',lastName:'Reviewer',professional:null}};
  await page.route(/\/api\/v1\/me$/,route=>authorized(route.request())?json(route,profile):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/me\/diver-profile$/,route=>json(route,{profile:null,equipment:[]}));
  await page.route(/\/api\/v1\/credentials$/,route=>json(route,[]));
  await page.route(/\/api\/v1\/admin\/overview$/,route=>json(route,{pendingReviews:1,activeBookings:0,accounts:1,openTrips:0}));
  await page.route(/\/api\/v1\/admin\/review-queue$/,route=>json(route,[]));
  await page.route(/\/api\/v1\/credentials\/verification-organizations$/,route=>json(route,catalog));
  await page.route(/\/api\/v1\/credentials\/admin\/pending$/,route=>json(route,pending));
  await page.route(/\/api\/v1\/credentials\/admin\/pending-credential\/documents\/pending-document\/access$/,route=>{reviewAccess++;return json(route,{url:'about:blank#review-signed-document',expiresAt:new Date(Date.now()+300000).toISOString()})});
  await page.route(/\/api\/v1\/credentials\/admin\/pending-credential\/external-verification-evidence$/,route=>{evidence=route.request().postDataJSON();pending[0].externalVerificationEvidenceRecordedAt=new Date().toISOString();return json(route,{credentialId:'pending-credential',evidence:{...evidence,checkedAt:pending[0].externalVerificationEvidenceRecordedAt},decisionRequired:true},201)});
  await page.route(/\/api\/v1\/credentials\/admin\/pending-credential\/decision$/,route=>{decision=route.request().postDataJSON();pending.length=0;return json(route,{id:'pending-credential',verificationStatus:decision.outcome})});

  await page.goto('/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&document.querySelector('.hl-admin')));
  await page.evaluate(async()=>{sessionStorage.setItem('hl-access-token','e2e-access');sessionStorage.setItem('hl-refresh-token','e2e-refresh');window.HydrolandAuth.syncAuthUi();await window.HydrolandProfile.load()});
  await page.locator('#role-switch').click();await page.locator('#role-dialog [data-role="admin"]').click();
  const admin=page.locator('.hl-admin');await expect(admin).toBeVisible();const card=admin.locator('[data-credential-review="pending-credential"]');await expect(card).toContainText('Pending Rescue Credential');
  const accessRequest=page.waitForRequest(request=>request.url().includes('/credentials/admin/pending-credential/documents/pending-document/access'));await card.getByRole('button',{name:/عرض: evidence\.pdf/}).click();await accessRequest;await expect.poll(()=>reviewAccess).toBe(1);

  const approve=card.getByRole('button',{name:'اعتماد الشهادة'});await expect(approve).toBeDisabled();
  await card.getByLabel('جهة التحقق الرسمية').selectOption('NAUI');
  await expect(card).toContainText('لا تغني عن رخصة SWSDF للمحترف داخل السعودية');
  await card.getByLabel('مرجع التحقق الرسمي').fill('NAUI-E2E-2026');
  await card.getByRole('button',{name:'حفظ دليل التحقق'}).click();
  await expect.poll(()=>evidence?.source).toBe('NAUI');expect(evidence.method).toBe('ONLINE_DIVER_VERIFY');expect(evidence.reference).toBe('NAUI-E2E-2026');
  await expect(approve).toBeEnabled();await expect(card).toContainText('دليل تحقق محفوظ');
  await approve.click();await expect.poll(()=>decision?.outcome).toBe('VERIFIED');await expect(admin.locator('[data-credential-review-list]')).toContainText('لا توجد شهادات بانتظار المراجعة');
});
