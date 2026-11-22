import { test, expect } from '@playwright/test';

const key={sourceType:'STORE_ORDER',sourceId:'notice-test-order'};
const json=(route,body)=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
const notice={id:'notice-test',type:'INVOICE_ISSUED',status:'SENT',createdAt:new Date().toISOString(),
  payload:{...key,title:'صدرت فاتورتك',message:'يمكنك فتح الفاتورة من حسابك في هيدرولاند.'}};

async function visit(page,fragment){
  const reads=[];
  await page.route(/\/api\/v1\//,route=>{
    const url=new URL(route.request().url());
    if(url.pathname.endsWith('/account/invoices')){
      reads.push({query:Object.fromEntries(url.searchParams),token:route.request().headers().authorization});
      return json(route,{items:[{...key,amountMinor:500,currency:'SAR',occurredAt:notice.createdAt,number:'TEST-42',isPurchase:true}],nextOffset:null});
    }
    if(url.pathname.endsWith('/notifications'))return json(route,[notice]);
    if(url.pathname.endsWith('/me'))return json(route,{id:'test',status:'ACTIVE',roleAssignments:[],person:{firstName:'Test',lastName:'Buyer'}});
    return json(route,[]);
  });
  await page.goto('/#'+fragment,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#hl-invoices-dialog',{state:'attached'});
  expect(reads).toHaveLength(0);
  await page.evaluate(()=>{
    const auth=window.HydrolandAuth;
    auth.acceptSession({accessToken:'notice-test-access',refreshToken:'notice-test-refresh'},auth.beginAuthAttempt());
  });
  return reads;
}

test('email invoice link resumes after sign-in and fetches only the requested buyer invoice',async({page})=>{
  const reads=await visit(page,'notice=invoice&sourceType=STORE_ORDER&sourceId=notice-test-order');
  await expect(page.locator('#hl-invoices-dialog')).toBeVisible();
  await expect(page.locator('#hl-invoices-dialog')).toContainText('TEST-42');
  expect(reads).toEqual([{query:{view:'all',offset:'0',...key},token:'Bearer notice-test-access'}]);
  expect(new URL(page.url()).hash).toBe('');
});

test('booking email opens the signed-in inbox and the invoice alert opens its original purchase',async({page})=>{
  await visit(page,'notice=booking');
  const inbox=page.locator('#hl-notifications-dialog');
  await expect(inbox).toBeVisible();
  await inbox.getByRole('button',{name:'فتح الفاتورة'}).click();
  await expect(page.locator('#hl-invoices-dialog')).toContainText('TEST-42');
});
