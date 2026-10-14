import {FinanceReceivablesWorkspaceService} from '../dist/finance/finance-receivables-workspace.service.js';
import assert from 'node:assert/strict';
import {Module,UnauthorizedException} from '@nestjs/common';
import {NestFactory} from '@nestjs/core';
import {AuthService} from '../dist/auth/auth.service.js';
import {DatabaseService} from '../dist/database/database.service.js';
import {FinanceController} from '../dist/finance/finance.controller.js';
import {FinanceWorkspaceService} from '../dist/finance/finance-workspace.service.js';
import {FinanceShiftsService} from '../dist/finance/finance-shifts.service.js';
import {FinanceReceivablesService} from '../dist/finance/finance-receivables.service.js';
import {FinanceShiftCloseService} from '../dist/finance/finance-shift-close.service.js';
import {FinancePersistenceService} from '../dist/finance/finance-persistence.service.js';
import {PaymentsService} from '../dist/payments/payments.service.js';
// Real HTTP routing, AccessTokenGuard, controller, compiled services and PostgreSQL.
// Token verification alone is substituted with an explicit fixture token map.
export async function checkFinanceWorkspaceHttp(db,workspace,shifts,{a,b,outsider,wrong,unitA,from,coreType}){
 const tokens=new Map([[a,a],[b,b],[outsider,outsider],[wrong,wrong]]);
 class FixtureModule{}
 Module({controllers:[FinanceController],providers:[
  {provide:DatabaseService,useValue:db},{provide:AuthService,useValue:{authenticateAccessToken:async token=>{if(!tokens.has(token))throw new UnauthorizedException();return {accountId:tokens.get(token)}}}},
  {provide:FinanceReceivablesWorkspaceService,useValue:{}},{provide:FinanceWorkspaceService,useValue:workspace},{provide:FinanceShiftsService,useValue:shifts},
  ...[FinanceReceivablesService,FinancePersistenceService,PaymentsService].map(provide=>({provide,useValue:{}})),{provide:FinanceShiftCloseService,useValue:{reviewCenters:async()=>[],pending:async()=>[],dailyReport:async(_accountId,centerOrgUnitId,businessDate)=>({centerOrgUnitId,businessDate,shiftCount:0,decision:'NO_APPROVED_SHIFT_CLOSES'})}}
 ]})(FixtureModule);
 const app=await NestFactory.create(FixtureModule,{logger:false});let count=0;
 try{
  await app.listen(0,'127.0.0.1');const base=await app.getUrl();
  const call=async(path,token,body)=>{const r=await fetch(base+'/finance'+path,{method:body===undefined?'GET':'POST',headers:{...(token?{authorization:'Bearer '+token}:{}),'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,body:await r.json()}};
  const check=(actual,expected)=>{assert.equal(actual,expected);count++};
  check((await call('/mine/centers')).status,401);check((await call('/mine/centers','invalid')).status,401);check((await call('/mine/shift-close-centers','invalid')).status,401);assert.deepEqual((await call('/mine/shift-close-centers',a)).body,[]);count++;
  const centers=await call('/mine/centers',a);check(centers.status,200);assert.deepEqual(centers.body.map(x=>x.id),[unitA]);count++;
  const daily=await call('/centers/'+unitA+'/daily-close-report?businessDate=2026-10-08',a);check(daily.status,200);check(daily.body.businessDate,'2026-10-08');
  assert.deepEqual((await call('/mine/centers',wrong)).body,[]);count++;
  const path='/centers/'+unitA+'/workspace';const view=await call(path,a);check(view.status,200);check(view.body.shift.id,from.id);check(view.body.totals.expectedCashMinor,100);
  check((await call(path,outsider)).status,403);check((await call(path,wrong)).status,403);
  check((await call('/shifts/open',a,{centerOrgUnitId:unitA,openingBalanceMinor:0})).status,409);
  check((await call('/shifts/open',a,{})).status,400);
  check((await call('/shifts/'+from.id+'/handover',a,{toAccountantId:b,actualCashMinor:-1})).status,400);
  check((await call('/shifts/'+from.id+'/handover',a,{toAccountantId:b,actualCashMinor:100,varianceReason:42})).status,400);
  check((await call('/shifts/'+from.id+'/handover',outsider,{toAccountantId:b,actualCashMinor:100})).status,403);
  if(coreType==='uuid')check((await call('/centers/not-a-uuid/workspace',a)).status,400);
  return count;
 }finally{await app.close()}
}
