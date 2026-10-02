import {test,expect} from '@playwright/test';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
const team=[{membershipId:'m1',role:'INSTRUCTOR',status:'ACTIVE',person:{displayName:'عضو المركز',headline:'Dive Instructor'},professional:{instructorStatus:'ACTIVE',verifiedCredentials:2}}];
const pros=[{accountId:'p1',displayName:'محترف المركز',headline:'مدرب غوص',verifiedCredentials:3,assignedTrainingCount:4}];
async function install(page){
 const state={active:true,team,pros,reads:0,refreshes:0};const profile={id:'center-team-review',email:'center-team@example.invalid',status:'ACTIVE',person:{firstName:'مدير',lastName:'المركز'},roleAssignments:[{role:'DIVE_CENTER',status:'ACTIVE'}]};
 await page.route('**/api/v1/**',route=>{const path=new URL(route.request().url()).pathname;if(path.endsWith('/me'))return route.fallback();return json(route,[])});await page.route('**/api/v1/auth/google/config',route=>json(route,{enabled:false}));
 await page.route(/\/api\/v1\/me$/,route=>json(route,{...profile,roleAssignments:state.active?profile.roleAssignments:[]}));await page.route(/\/api\/v1\/me\/diver-profile$/,route=>json(route,{profile:null,equipment:[]}));
 await page.route('**/api/v1/center/me/overview',route=>json(route,{center:{displayName:'مركز الفريق'},metrics:{newBookings:0,tripsToday:0,activeMembers:2,totalTrips:0}}));
 await page.route('**/api/v1/center/me/team',route=>{state.reads++;return json(route,state.team)});await page.route('**/api/v1/center/me/professionals',route=>{state.reads++;return json(route,state.pros)});
 await page.goto('/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandCenterTeam));
 await page.evaluate(async()=>{window.HydrolandAuth.acceptSession({accessToken:'team-access',refreshToken:'team-refresh'},window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load()});
 await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role="center"]').click();return state;
}
test('center professionals can switch to center team membership',async({page})=>{
 await install(page);await page.locator('[data-portal-label="محترفي الغوص"]').click();const panel=page.locator('#hl-center-team');await expect(panel).toBeVisible();await expect(panel).toContainText('محترف المركز');await expect(panel).toContainText('التكليفات التدريبية: 4');
 await panel.locator('[data-center-team-mode="team"]').click();await expect(panel).toContainText('عضو المركز');await expect(panel).toContainText('Dive Instructor');
});
test('center team rejects malformed payload and clears on logout',async({page})=>{
 const state=await install(page);state.pros={members:[]};await page.locator('[data-portal-label="محترفي الغوص"]').click();const panel=page.locator('#hl-center-team');await expect(panel.locator('[role="alert"]')).toContainText('غير مكتملة');
 state.pros=pros;await panel.locator('[data-center-team-retry]').click();await expect(panel).toContainText('محترف المركز');await page.evaluate(()=>window.HydrolandAuth.terminateSession());await expect(panel).toHaveCount(0);
});
test('center team discards response after revocation',async({page})=>{
 const state=await install(page);await page.locator('[data-portal-label="محترفي الغوص"]').click();const panel=page.locator('#hl-center-team');let pending;await page.route('**/api/v1/center/me/team',route=>{pending=route});await panel.locator('[data-center-team-mode="team"]').click();await expect.poll(()=>Boolean(pending)).toBe(true);state.active=false;await page.evaluate(async()=>{await window.HydrolandPortalAccess.refreshPortalAccess();window.HydrolandPortalFreshness.enforce()});await json(pending,team);await expect(page.locator('#hl-center-team')).toHaveCount(0);await expect(page.getByText('عضو المركز')).toHaveCount(0);
});
test('center team refreshes role before exposing member identities',async({page})=>{
 const state=await install(page),before=state.refreshes;state.active=false;await page.evaluate(()=>window.HydrolandCenterTeam.open('professionals'));await expect(page.locator('#hl-center-team')).toHaveCount(0);expect(state.refreshes).toBeGreaterThan(before);expect(state.reads).toBe(0);await expect(page.getByText('محترف المركز')).toHaveCount(0);
});
