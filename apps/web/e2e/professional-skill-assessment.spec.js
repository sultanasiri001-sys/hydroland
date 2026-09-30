import { test, expect } from '@playwright/test';
import { openWorkspaceSwitcher } from './portal-test-helpers.js';
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
test('professional skill assessment is scoped to assigned students and fails closed after role loss',async({page})=>{
 const state={active:true,status:'NOT_STARTED'};
 const me=()=>({id:'instructor',status:'ACTIVE',roleAssignments:[{role:'INSTRUCTOR',status:state.active?'ACTIVE':'SUSPENDED'}],person:{firstName:'مدرب',lastName:'اختبار',professional:{}}});
 await page.route(/\/api\/v1\/me$/,route=>json(route,me()));await page.route(/\/api\/v1\/credentials$/,route=>json(route,[]));await page.route(/\/api\/v1\/me\/diver-profile$/,route=>json(route,{profile:null,equipment:[]}));
 await page.route(/\/api\/v1\/training\/professional\/me$/,route=>json(route,{profile:{displayName:'مدرب اختبار'},credentials:[],metrics:{activeStudents:1,sessionsToday:0,completedSessions:0,verifiedCredentials:0},privacy:{excludesMedicalData:true,excludesIdentityData:true,excludesEmergencyContacts:true}}));
 await page.route(/\/api\/v1\/training\/professional\/me\/skills$/,route=>state.active?json(route,[{id:'skill-1',skillCode:'MASK_CLEAR',name:'إفراغ القناع',status:state.status,stageType:'CONFINED_WATER',courseCode:'OW-101',student:{displayName:'طالب أول'}}]):json(route,{message:'Active instructor role required.'},403));
 await page.route(/\/api\/v1\/training\/skills\/skill-1\/assessment$/,route=>{if(!state.active)return json(route,{message:'Training resource access denied.'},403);state.status=route.request().postDataJSON().status;return json(route,{id:'skill-1',status:state.status,signedOffByInstructorId:state.status==='COMPETENT'?'instructor':null,signedOffAt:state.status==='COMPETENT'?'2026-09-30T12:30:00Z':null})});
 await page.goto('/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandTraining));
 await page.evaluate(async()=>{window.HydrolandAuth.acceptSession({accessToken:'professional-access',refreshToken:'professional-refresh'},window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load()});
 await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role="instructor"]').click();await page.locator('.hl-role-dashboard[data-role="instructor"] [data-action-label="تقييم المهارات"]').click();
 const training=page.locator('.hl-training');await expect(training).toBeVisible();await expect(training).toHaveAttribute('data-training-mode','professional-skills');await expect(training).toContainText('إفراغ القناع');await expect(training).toContainText('طالب أول');
 await training.locator('[data-skill-status="COMPETENT"]').click();await expect(training).toContainText('COMPETENT');
 state.active=false;await page.evaluate(()=>window.HydrolandTraining.reload('instructor-skills'));await expect(training).toContainText('Active instructor role required');
});
