import {test,expect} from '@playwright/test';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
async function setup(page){
 const state={active:true,trainingReads:0};const profile={id:'training-owner',status:'ACTIVE',person:{firstName:'مدير',lastName:'التدريب'},roleAssignments:[{role:'DIVE_CENTER',status:'ACTIVE'}]};
 await page.route('**/api/v1/**',route=>json(route,[]));await page.route('**/api/v1/auth/google/config',route=>json(route,{enabled:false}));
 await page.route(/\/api\/v1\/me$/,route=>json(route,{...profile,roleAssignments:state.active?profile.roleAssignments:[]}));
 await page.route('**/api/v1/me/diver-profile',route=>json(route,{profile:null,equipment:[]}));
 await page.route('**/api/v1/center/me/overview',route=>json(route,{center:{displayName:'مركز التدريب'},metrics:{newBookings:0,tripsToday:0,activeMembers:1,totalTrips:0}}));
 await page.route('**/api/v1/store/provider/catalog',route=>json(route,{organization:{displayName:'مركز التدريب'},products:[],courses:[]}));
 await page.route('**/api/v1/center/me/training',route=>{state.trainingReads++;return json(route,{enrollments:[{id:'enrollment-1',courseCode:'OPEN-WATER',status:'PENDING',student:{displayName:'متدرب الدورة'},instructor:{accountId:'instructor-1',displayName:'مدرب المركز',eligible:true},canAssign:true,canCreateSession:true,updatedAt:'2030-01-01T00:00:00Z',record:{sessions:[{id:'session-1',startsAt:'2030-02-01T07:00:00Z',endsAt:'2030-02-01T08:00:00Z',status:'CHECK_IN_OPEN',instructor:{displayName:'مدرب المركز',eligible:true},attendance:{instructorCheckedIn:true,studentCheckedIn:true},actions:[]}]}}],instructors:[{accountId:'instructor-1',displayName:'مدرب المركز'}],nextCursor:null})});
 await page.route('**/api/v1/center/me/professionals',route=>json(route,[{accountId:'instructor-1',displayName:'مدرب المركز',verifiedCredentials:1,assignedTrainingCount:1}]));
 await page.goto('/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>Boolean(window.HydrolandCenterTraining&&window.HydrolandStoreProvider&&window.HydrolandRoleDashboards&&window.HydrolandProfile));
 await page.evaluate(async()=>{window.HydrolandAuth.acceptSession({accessToken:'training-access',refreshToken:'training-refresh'},window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load()});
 await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role="center"]').click();await expect(page.locator('.hl-role-dashboard[data-role="center"]')).toBeVisible();return state;
}
async function openHub(page){
 const link=page.locator('[data-portal-label="التدريب والدورات"]');if(!await link.isVisible())await page.locator('.hl-role-dashboard [data-portal-menu]').click();await link.click();await expect(page.locator('#hl-center-training')).toBeVisible();await expect(link).toHaveAttribute('aria-current','page');
}
for(const width of [1440,390])test('training entry reaches real offers, assignments, sessions and professionals at '+width+'px',async({page})=>{
 await page.setViewportSize({width,height:900});const state=await setup(page);await openHub(page);const hub=page.locator('#hl-center-training');
 await hub.getByRole('button',{name:'إدارة عروض الدورات',exact:true}).click();const courseForm=page.locator('[data-offer-form][data-type="courses"][data-id=""]');await expect(courseForm).toBeVisible();await expect(courseForm.locator('[name=title]')).toBeFocused();
 await openHub(page);await hub.getByRole('button',{name:'إدارة التسجيلات والجلسات',exact:true}).click();const team=page.locator('#hl-center-team');await expect(team).toContainText('متدرب الدورة');await expect(page.locator('[data-portal-label="التدريب والدورات"]')).toHaveAttribute('aria-current','page');
 await team.getByText('الجلسات المسجلة (1)',{exact:true}).click();await expect(team.locator('[data-training-session="session-1"]')).toBeVisible();await expect(team.locator('[data-training-session="session-1"]')).toContainText('حضور المدرب: مسجل');await expect(team.locator('[data-training-session="session-1"]')).toContainText('حضور المتدرب: مسجل');expect(state.trainingReads).toBe(1);
 await openHub(page);await hub.getByRole('button',{name:'عرض محترفي المركز',exact:true}).click();await expect(team).toContainText('مدرب المركز');await expect(page.locator('[data-portal-label="محترفي الغوص"]')).toHaveAttribute('aria-current','page');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
});
test('revoked training entry blocks destination reads and clears the hub',async({page})=>{
 const state=await setup(page);await openHub(page);state.active=false;await page.locator('#hl-center-training').getByRole('button',{name:'إدارة التسجيلات والجلسات',exact:true}).click();await expect(page.locator('#hl-center-training')).toHaveCount(0);await expect(page.locator('.hl-role-dashboard')).toHaveCount(0);expect(state.trainingReads).toBe(0);
});
test('late training authorization cannot recreate the hub after logout',async({page})=>{
 await setup(page);let pending;await page.route(/\/api\/v1\/me$/,route=>{pending=route});await page.evaluate(()=>void window.HydrolandCenterTraining.open());await expect.poll(()=>Boolean(pending)).toBe(true);await page.evaluate(()=>window.HydrolandAuth.terminateSession());await json(pending,{roleAssignments:[{role:'DIVE_CENTER',status:'ACTIVE'}]});await expect(page.locator('#hl-center-training')).toHaveCount(0);
});
