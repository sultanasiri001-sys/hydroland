import {test} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {participantLocaleScenarios} from './fixtures/participant-locale-scenarios.mjs';
const names=['i18n','booking-participants','professional-assignments','safety-checklist','messages','auth','booking-safety-control','calendar-admin'];
const modules=Object.fromEntries(names.map(name=>['hydroland-'+name+'.js',readFileSync(resolve(process.cwd(),'src','hydroland-'+name+'.js'),'utf8')]));
const cases=participantLocaleScenarios(null,{},null);
for (const [index,scenario] of cases.entries()) test(scenario.name,async({page})=>{
 await page.route('**/locale-runtime-fixture',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="ar" dir="rtl"><body></body></html>'}));
 await page.goto('/locale-runtime-fixture');
 await page.evaluate(async({creatorSource,modules,index})=>{
  const assert={equal(actual,expected){if(actual!==expected)throw new Error('Expected '+JSON.stringify(expected)+'; received '+JSON.stringify(actual))},ok(value){if(!value)throw new Error('Expected a truthy condition')},match(value,pattern){if(!pattern.test(value))throw new Error('Expected '+String(pattern)+' to match '+JSON.stringify(value))}};
  const createWindow=markup=>{document.open();document.write(markup);document.close();return{window,close(){}}};
  const cleanup=[],creator=(0,eval)('('+creatorSource+')');
  try{await creator(createWindow,modules,assert)[index].run({after:callback=>cleanup.push(callback)})}finally{for(const callback of cleanup.reverse())await callback()}
 },{creatorSource:participantLocaleScenarios.toString(),modules,index});
});
