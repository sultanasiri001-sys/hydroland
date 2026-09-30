import { test, expect } from '@playwright/test';
import { openWorkspaceSwitcher } from './portal-test-helpers.js';
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
test('professional courses workspace shows only assigned students and fails closed after revocation',async({page})=>{
 const state={active:true};
 const me=()=>({id:'instructor',email:'instructor@example.invalid',status:'ACTIVE',roleAssignments:[{role:'INSTRUCTOR',status:state.active?'ACTIVE':'SUSPENDED'}],person:{firstName:'مدرب',lastName:'اختبار',professional:{}}});
 await page.route(/\/api\/v1\/me$/,route=>json(route,me()));await page.route(/\/api\/v1\/credentials$/,route=>json(route,[]));await page.route(/\/api\/v1\/me\/diver-profile$/,route=>json(route,{profile:null,equipment:[]}));
 await page.route(/\/api\/v1\/training\/professional\/me$/,route=>json(route,{profile:{displayName:'مدرب اختبار'},credentials:[],metrics:{activeStudents:2,sessionsToday:1,completedSessions:3,verifiedCredentials:0},privacy:{excludesMedicalData:true,excludesIdentityData:true,excludesEmergencyContacts:true}}));
 await page.route(/\/api\/v1\/training\/professional\/me\/assignments$/,route=>state.active?json(route,[{enrollmentId:'e1',courseCode:'OW-101',status:'ACTIVE',student:{displayName:'طالب أول'},record:{status:'IN_PROGRESS',progressPercent:60,sessions:[{id:'s1',status:'SCHEDULED'}]}},{enrollmentId:'e2',courseCode:'RESCUE-201',status:'ACTIVE',student:{displayName:'طالب ثان'},record:{status:'NOT_STARTED',progressPercent:0,sessions:[]}}]):json(route,{message:'Active instructor role required.'},403));
 await page.goto('/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>Boolean(window.HydrolandProfessionalAssignments&&window.HydrolandPortalFreshness));
 await page.evaluate(async()=>{window.HydrolandAuth.acceptSession({accessToken:'professional-access',refreshToken:'professional-refresh'},window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load()});
 await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role="instructor"]').click();
 await page.locator('.hl-role-dashboard[data-role="instructor"] [data-action-label="إدارة الدورات"]').click();
 const host=page.locator('.hl-professional-assignments');await expect(host).toBeVisible();await expect(host).toContainText('OW-101');await expect(host).toContainText('طالب أول');await expect(host).toContainText('RESCUE-201');await expect(host).not.toContainText('private@example.invalid');
 state.active=false;await page.evaluate(()=>window.HydrolandProfessionalAssignments.open());await expect(host).not.toBeVisible();
});
