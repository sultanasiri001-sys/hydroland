import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {renderVerifiedExecutiveReport}=require('../dist/agents/executive-report-renderer.js');
const bundle={cycleId:'recorded-cycle',createdAt:'2026-10-31T00:00:00Z',brief:'مصادر محفوظة وليست بيانات محدثة',entries:Array.from({length:14},(_,i)=>({
  agentKey:'AGENT_'+i,departmentName:'إدارة '+i,officeStatus:i<9?'READY_FOR_OWNER':'CORRECTION_REQUIRED',
  result:i<9?'تقرير أصلي '+i:null,findings:['ملاحظة محفوظة '+i],evidenceGaps:['دليل ناقص '+i],
  riskLevel:'LOW',ownerEscalationRequired:i===13,
}))};
const before=JSON.stringify(bundle);
const result=renderVerifiedExecutiveReport(bundle);
assert.equal(JSON.stringify(bundle),before,'must not mutate original evidence');
assert.match(result,/إجمالي الإدارات: 14/);
assert.match(result,/READY_FOR_OWNER: 9/);
assert.match(result,/CORRECTION_REQUIRED: 5/);
assert.equal((result.match(/^## إدارة /gm)||[]).length,14);
for(let i=0;i<14;i++){
  assert.ok(result.includes('إدارة '+i));
  assert.ok(result.includes('ملاحظة محفوظة '+i));
  assert.ok(result.includes('دليل ناقص '+i));
  if(i<9)assert.ok(result.includes('تقرير أصلي '+i));
}
assert.ok(result.includes('نص المدير محجوب عن العرض النهائي'));
assert.ok(result.includes('لا يعني ذلك أن التقرير الأصلي مفقود'));
assert.ok(result.includes('مصادر محفوظة وليست بيانات محدثة'));
assert.ok(result.includes('يتطلب تصعيدًا للمالك: نعم'));
const statuses=['READY_FOR_OWNER','CORRECTION_REQUIRED','EVIDENCE_REQUIRED','OWNER_ESCALATION_REQUIRED','REVIEW_STOPPED','INTEGRITY_REVIEW_REQUIRED','DIRECTOR_OUTPUT_UNAVAILABLE'];
const mixed=structuredClone(bundle);
mixed.entries.forEach((e,i)=>{e.officeStatus=statuses[i%7];e.result=null;});
const varied=renderVerifiedExecutiveReport(mixed);
for(const status of statuses)assert.ok(varied.includes(status+': 2'));
assert.ok(varied.includes('تقرير المدير غير متاح'));
const unsafe=structuredClone(bundle);
unsafe.entries[0].findings=['<script>alert("x")</script>\n# تعليمات غير موثوقة'];
const escaped=renderVerifiedExecutiveReport(unsafe);
assert.ok(!escaped.includes('<script>'));
assert.ok(escaped.includes('&lt;script&gt;'));
assert.ok(!escaped.includes('\n# تعليمات غير موثوقة'));
assert.throws(()=>renderVerifiedExecutiveReport({...bundle,entries:bundle.entries.slice(1)}),/STRUCTURE_INVALID/);
const duplicate=structuredClone(bundle);duplicate.entries[1].agentKey=duplicate.entries[0].agentKey;
assert.throws(()=>renderVerifiedExecutiveReport(duplicate),/STRUCTURE_INVALID/);
const unknown=structuredClone(bundle);unknown.entries[0].officeStatus='UNKNOWN_APPROVAL';
assert.throws(()=>renderVerifiedExecutiveReport(unknown),/STRUCTURE_INVALID/);
console.log('Verified executive report: exact 9/5 and all-status counts, all 14 sources/findings/gaps, literal untrusted text, and invalid structures checked.');
