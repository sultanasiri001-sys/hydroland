import { test, expect } from '@playwright/test';
import { openWorkspaceSwitcher } from './portal-test-helpers.js';
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
test('professional training workspace shows only assigned students and courses',async({page})=>{
 const profile={id:'instructor',email:'instructor-private@example.invalid',status:'ACTIVE',roleAssignments:[{id:'r1',role:'INSTRUCTOR',status:'ACTIVE'}],person:{firstName:'مدرب',lastName:'اختبار',professional:{headline:'مدرب غوص'}}};
 await page.route(/\/api\/v1\/me$/,route=>json(route,profile));
 await page.route(/\/api\/v1\/credentials$/,route=>json(route,[]));
 await page.route(/\/api\/v1\/me\/diver-profile$/,route=>json(route,{profile:null,equipment:[]}));
 await page.route(/\/api\/v1\/training\/professional\/me$/,route=>json(route,{profile:{displayName:'مدرب اختبار'},credentials:[],metrics:{activeStudents:2,sessionsToday:1,completedSessions:3,verifiedCredentials:0},privacy:{excludesMedicalData:true,excludesIdentityData:true,excludesEmergencyContacts:true}}));
 await page.route(/\/api\/v1\/training\/professional\/enrollments$/,route=>json(route,[
  {id:'e1',courseCode:'OW-101',status:'ACTIVE',student:{displayName:'طالب أول'},record:{progressPercent:60,sessions:[{id:'s1',status:'SCHEDULED',startsAt:'2026-10-01T08:00:00Z'}]}},
  {id:'e2',courseCode:'RESCUE-201',status:'COMPLETED',student:{displayName:'طالب ثان'},record:{progressPercent:100,sessions:[]}}
 ]));
 await page.goto('/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandTraining));
 await page.evaluate(async()=>{window.HydrolandAuth.acceptSession({accessToken:'professional-access',refreshToken:'professional-refresh'},window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load()});
 await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role="instructor"]').click();
 await page.locator('.hl-role-dashboard[data-role="instructor"] [data-action-label="إدارة الدورات"]').click();
 const training=page.locator('.hl-training');await expect(training).toBeVisible();await expect(training).toHaveAttribute('data-training-mode','professional');
 await expect(training).toContainText('طالب أول');await expect(training).toContainText('طالب ثان');await expect(training).toContainText('OW-101');await expect(training).toContainText('RESCUE-201');
 await expect(training).not.toContainText('instructor-private@example.invalid');await expect(training.locator('[data-professional-enrollment]')).toHaveCount(2);
});
