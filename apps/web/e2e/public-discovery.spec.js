import {test,expect} from '@playwright/test';

const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
const trip=(id,title,type)=>({id,title,type,startsAt:new Date(Date.now()+7*86400000).toISOString(),endsAt:new Date(Date.now()+7*86400000+10800000).toISOString(),capacity:12,remainingSeats:8,price:{configured:true,pricePerSeatMinor:22000,currency:'SAR'},safety:{decision:'ALLOWED'},weather:{evaluation:{blocking:false}},location:{locationName:'مرسى القحمة',latitude:18.02,longitude:41.7},description:'وصف الرحلة المنشور من المركز.'});
const trips=[trip('boat-public','رحلة غوص بالقارب','BOAT_DIVE'),trip('shore-public','غوص شاطئي في عمق','SHORE_DIVE'),trip('marine-public','تجربة سنوركل بحرية','SNORKELING')];
const products=[{id:'mask-public',sku:'MASK-01',nameAr:'قناع غوص',description:'وصف المنتج <strong>من المورد</strong>',priceMinor:15000,currency:'SAR',stockQuantity:3},{id:'fins-public',sku:'FINS-02',nameAr:'زعانف غوص',priceMinor:24000,currency:'SAR',stockQuantity:0}];
const installApi=async(page,options={})=>{
  const writes=[];
  await page.route('**/api/v1/**',route=>{
    const request=route.request(),path=new URL(request.url()).pathname;
    if(request.method()!=='GET')writes.push(path);
    if(path==='/api/v1/trips')return options.tripResponse?options.tripResponse(route):json(route,trips);
    if(path==='/api/v1/store/products')return json(route,products);
    if(path.endsWith('/maps/public-config'))return json(route,{enabled:false,status:'NOT_SELECTED'});
    if(path.endsWith('/weather/public-config'))return json(route,{configured:false,status:'NOT_SELECTED'});
    if(path.endsWith('/me/diver-profile'))return json(route,{profile:null,equipment:[]});
    if(path.endsWith('/me'))return json(route,{id:'discovery-user',roles:[]});
    return json(route,[]);
  });
  return writes;
};
const enter=async(page,url='/')=>{await page.goto(url,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>Boolean(window.HydrolandPublicUI));await page.locator('.hl-login-guest').click();await expect(page.locator('.hl-login')).toBeHidden();await page.evaluate(()=>document.fonts.ready)};
const navigate=async(page,id)=>{const link=page.locator(`#navigation a[href="#${id}"]`);if(!await link.isVisible())await page.locator('#menu').click();await link.click();await expect(page.locator('body')).toHaveAttribute('data-public-page',id)};
const noOverflow=async page=>{const widths=await page.evaluate(()=>({page:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth}));expect(widths.page).toBeLessThanOrEqual(widths.viewport+1)};
const screenshot=async(page,testInfo,name)=>{await noOverflow(page);await page.screenshot({path:testInfo.outputPath(`public-${name}.png`)})};

for(const viewport of [{name:'desktop',width:1536,height:864},{name:'tablet',width:768,height:1024},{name:'mobile',width:390,height:844}]){
  test(`public discovery, detail navigation and cart work on ${viewport.name}`,async({page},testInfo)=>{
    test.setTimeout(60_000);await page.setViewportSize({width:viewport.width,height:viewport.height});const writes=await installApi(page);await enter(page);
    await expect(page.locator('[data-public-trip]')).toHaveCount(3);
    await screenshot(page,testInfo,`home-${viewport.name}`);
    await navigate(page,'explore');await expect(page.locator('.hl-public-explore-grid>a')).toHaveCount(6);await expect(page.locator('#home')).toBeHidden();
    await screenshot(page,testInfo,`explore-${viewport.name}`);
    await page.locator('#explore a[href="#activities"]').click();await expect(page.locator('.hl-public-activity')).toHaveCount(3);await expect(page.locator('[data-activity-count="shore"]')).toHaveText('1 رحلة منشورة');
    await page.locator('[data-activity-filter="shore"]').click();await expect(page).toHaveURL(/#trips$/);await expect(page.locator('[data-public-trip]')).toHaveCount(1);
    await expect(page.locator('[data-public-trip-filter="shore"]')).toHaveAttribute('aria-pressed','true');
    await page.locator('[data-public-detail="trip"]').click();const detail=page.locator('#hl-public-detail');await expect(detail).toBeVisible();await expect(detail.locator('h2')).toHaveText('غوص شاطئي في عمق');await expect(detail.locator('dl')).toContainText('مرسى القحمة');
    await screenshot(page,testInfo,`trip-detail-${viewport.name}`);
    await page.goBack();await expect(detail).toBeHidden();await expect(page).toHaveURL(/#trips$/);
    await page.locator('[data-public-trip-filter="all"]').click();await expect(page.locator('[data-public-trip]')).toHaveCount(3);
    await screenshot(page,testInfo,`trips-${viewport.name}`);
    await navigate(page,'training');await expect(page.locator('.hl-public-course')).toHaveCount(3);await screenshot(page,testInfo,`training-${viewport.name}`);
    await page.locator('a[href="#course/open-water"]').click();await expect(detail.locator('h2')).toHaveText('الغوص في المياه المفتوحة');await expect(detail).toContainText('تظهر عند نشر الدورات');await detail.locator('[data-detail-back]').click();await expect(detail).toBeHidden();
    await navigate(page,'store');await page.locator('[data-product-filter="available"]').click();await expect(page.locator('[data-public-product]')).toHaveCount(1);
    await screenshot(page,testInfo,`store-${viewport.name}`);
    await page.locator('[data-public-detail="product"]').click();await expect(detail.locator('[data-detail-description]')).toHaveText('وصف المنتج <strong>من المورد</strong>');await expect(detail.locator('[data-detail-description] strong')).toHaveCount(0);
    await screenshot(page,testInfo,`product-detail-${viewport.name}`);
    await detail.locator('[data-detail-action]').click();await expect(detail).toBeHidden();await expect(page.locator('.hl-store-summary')).toContainText('1 منتج');
    await page.locator('[data-product-filter="unavailable"]').click();await page.locator('[data-public-detail="product"]').click();await expect(detail.locator('[data-detail-action]')).toBeDisabled();await detail.locator('[data-detail-back]').click();await expect(detail).toBeHidden();
    await navigate(page,'trips');await page.locator('a[href="#trip/boat-public"]').click();await detail.locator('[data-detail-action]').click();await expect(page.locator('.hl-login')).toBeVisible();await expect(page.locator('#booking-dialog')).toBeHidden();
    expect(writes).toEqual([]);expect(await page.evaluate(()=>window.HydrolandAuth.isAuthenticated())).toBe(false);
  });
}

test('shared trip links recover from a read failure and keep unavailable bookings blocked',async({page})=>{
  let unavailable=true;const blocked={...trips[0],price:{configured:false,pricePerSeatMinor:0},safety:{decision:'ALLOWED'}};
  const writes=await installApi(page,{tripResponse:route=>unavailable?json(route,{message:'Unavailable'},503):json(route,[blocked])});
  await enter(page,'/#trip/boat-public');const detail=page.locator('#hl-public-detail');await expect(detail).toBeVisible();await expect(detail.locator('h2')).toHaveText('تعذر تحميل التفاصيل');
  unavailable=false;await detail.locator('[data-detail-action]').click();await expect(detail.locator('h2')).toHaveText(blocked.title);await expect(detail.locator('[data-detail-action]')).toBeDisabled();await expect(detail.locator('[data-detail-action]')).toHaveText('السعر لم يُعتمد بعد');
  await detail.locator('[data-detail-back]').click();await expect(page).toHaveURL(/#trips$/);await expect(page.locator('[data-book]')).toBeDisabled();expect(writes).toEqual([]);
});

test('missing detail links show an honest state and public search opens the matching page',async({page})=>{
  await installApi(page);await enter(page,'/#product/missing');const detail=page.locator('#hl-public-detail');await expect(detail.locator('h2')).toHaveText('هذا المحتوى غير متاح');await detail.locator('[data-detail-back]').click();await expect(page).toHaveURL(/#store$/);
  await navigate(page,'home');await page.locator('#search-form input').fill('قناع');await page.locator('#search-form button').click();await expect(page.locator('body')).toHaveAttribute('data-public-page','store');await expect(page.locator('[data-public-product="mask-public"]')).toBeVisible();
});
