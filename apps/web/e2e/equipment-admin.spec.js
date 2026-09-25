import { test, expect } from '@playwright/test';

const installProfileApi=async(page,{admin=true}={})=>{
  const profile={id:admin?'admin-e2e':'diver-e2e',email:admin?'admin@hydroland.test':'diver@hydroland.test',status:'ACTIVE',roleAssignments:[{id:'role-1',role:admin?'ADMIN':'DIVER',status:'ACTIVE',activeAt:null,updatedAt:'2026-09-25T00:00:00.000Z'}],person:{firstName:admin?'Admin':'Diver',lastName:'E2E',phone:null,professional:null}};
  const requireAuth=request=>request.headers().authorization==='Bearer e2e-access';
  const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  await page.route(/\/api\/v1\/me$/,route=>requireAuth(route.request())?json(route,profile):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/credentials$/,route=>requireAuth(route.request())?json(route,[]):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/me\/diver-profile$/,route=>requireAuth(route.request())?json(route,{profile:null,equipment:[]}):json(route,{message:'Unauthorized'},401));
  return {profile,json,requireAuth};
};

const seed=async(page,{admin=true}={})=>{
  const api=await installProfileApi(page,{admin});
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandPortalAccess));
  await page.evaluate(async()=>{sessionStorage.setItem('hl-access-token','e2e-access');sessionStorage.setItem('hl-refresh-token','e2e-refresh');window.HydrolandAuth.syncAuthUi();await window.HydrolandProfile.load()});
  return api;
};

test('equipment administration modules are not loaded for a normal authenticated diver',async({page})=>{
  await seed(page,{admin:false});
  await expect(page.locator('.hl-inventory')).toHaveCount(0);
  expect(await page.evaluate(()=>[...document.scripts].some(s=>/hydroland-(inventory|stocktake|rental-admin|equipment-rentals)\.js$/.test(s.src)))).toBe(false);
  await page.locator('#role-switch').click();
  await page.locator('#role-dialog [data-role="admin"]').dispatchEvent('click');
  await expect(page.locator('.hl-inventory')).toHaveCount(0);
});

test('admin portal lazy-loads inventory, registers equipment and creates a rental invoice',async({page})=>{
  const equipment=[];
  let createdRental=null;
  await page.route('https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js',route=>route.fulfill({status:200,contentType:'application/javascript',body:'window.JsBarcode=(el,value)=>{el.setAttribute("data-value",value)};'}));
  await page.route('https://cdn.jsdelivr.net/npm/qrcode-generator@2.0.4/qrcode.min.js',route=>route.fulfill({status:200,contentType:'application/javascript',body:'window.qrcode=()=>({addData(){},make(){},createSvgTag(){return "<svg data-e2e=\\"qr\\"></svg>"}});'}));
  const api=await installProfileApi(page,{admin:true});
  const detail=row=>({...row,movements:[],inspection:{blocked:false,issues:[]}});
  await page.route(/\/api\/v1\/trips\/admin\/equipment$/,async route=>{
    if(!api.requireAuth(route.request()))return api.json(route,{message:'Unauthorized'},401);
    if(route.request().method()==='GET')return api.json(route,equipment);
    const body=route.request().postDataJSON();const id='equipment-1';const row={id,resourceId:id,resourceName:body.name,assetCode:'HYD-EQUIPMENT1',barcodeValue:'HYD-EQUIPMENT1',qrValue:'hydroland:equipment:HYD-EQUIPMENT1',serialNumber:body.serialNumber||null,sku:body.sku||null,location:body.location||null,stockStatus:'AVAILABLE',acquisitionCostHalala:null};equipment.splice(0,equipment.length,row);return api.json(route,{id,name:body.name,type:'EQUIPMENT',active:true,passport:row},201);
  });
  await page.route(/\/api\/v1\/trips\/admin\/equipment\/lookup\?code=.*/,route=>{
    if(!api.requireAuth(route.request()))return api.json(route,{message:'Unauthorized'},401);const url=new URL(route.request().url()),code=url.searchParams.get('code'),row=equipment.find(x=>[x.assetCode,x.barcodeValue,x.qrValue,x.serialNumber].includes(code));return row?api.json(route,detail(row)):api.json(route,{message:'Not found'},404);
  });
  await page.route(/\/api\/v1\/trips\/admin\/equipment\/equipment-1$/,route=>api.requireAuth(route.request())?api.json(route,detail(equipment[0])):api.json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/trips\/admin\/equipment-rentals$/,route=>api.requireAuth(route.request())?api.json(route,[]):api.json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/trips\/equipment-rentals$/,async route=>{
    if(!api.requireAuth(route.request()))return api.json(route,{message:'Unauthorized'},401);const body=route.request().postDataJSON();createdRental={id:'rental-1',invoiceNumber:'HYD-RNT-E2E',renterAccountId:body.renterAccountId,status:'RESERVED',paymentStatus:'PENDING',totalHalala:5000,dueAt:body.dueAt,items:[{id:'item-1',resourceId:'equipment-1',equipmentNameSnapshot:'BCD E2E',assetCodeSnapshot:'HYD-EQUIPMENT1',equipmentType:body.items[0].equipmentType,size:body.items[0].size,serialNumberSnapshot:'SER-E2E',unitPriceHalala:5000}]};return api.json(route,createdRental,201);
  });
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandEquipmentAdmin));
  await page.evaluate(async()=>{sessionStorage.setItem('hl-access-token','e2e-access');sessionStorage.setItem('hl-refresh-token','e2e-refresh');window.HydrolandAuth.syncAuthUi();await window.HydrolandProfile.load()});
  expect(await page.locator('.hl-inventory').count()).toBe(0);

  await page.locator('#role-switch').click();await page.locator('#role-dialog [data-role="admin"]').click();
  const inventory=page.locator('.hl-inventory');await expect(inventory).toBeVisible();
  await expect(inventory).toContainText('المستودع والباركود');
  await expect(inventory.locator('#hl-rental-new')).toBeVisible();

  await inventory.locator('[data-inventory-action="register"]').click();
  const register=page.locator('.hl-barcode-dialog').filter({hasText:'تسجيل معدة جديدة'});await expect(register).toBeVisible();
  await register.locator('#hl-register-name').fill('BCD E2E');await register.locator('#hl-register-serial').fill('SER-E2E');await register.locator('#hl-register-location').fill('A1');await register.locator('#hl-register-submit').click();
  await expect(inventory.locator('[data-resource-id="equipment-1"]')).toBeVisible();await expect(inventory).toContainText('HYD-EQUIPMENT1');

  await inventory.locator('#hl-rental-new').click();
  const rentalDialog=page.locator('.hl-barcode-dialog').filter({hasText:'فاتورة تأجير معدات'});await expect(rentalDialog).toBeVisible();
  await rentalDialog.locator('#hl-renter-account').fill('diver-account-1');
  const due=new Date(Date.now()+86400000).toISOString().slice(0,16);await rentalDialog.locator('#hl-rental-due').fill(due);
  await rentalDialog.locator('#hl-rental-codes').fill('HYD-EQUIPMENT1');await rentalDialog.locator('#hl-rental-types').fill('BCD');await rentalDialog.locator('#hl-rental-sizes').fill('M');await rentalDialog.locator('#hl-rental-prices').fill('50');await rentalDialog.locator('#hl-rental-create').click();
  await expect(inventory.locator('.hl-rental-invoice')).toContainText('HYD-RNT-E2E');
  expect(createdRental?.renterAccountId).toBe('diver-account-1');

  await page.locator('#exit-role').click();await expect(inventory).toBeHidden();
});