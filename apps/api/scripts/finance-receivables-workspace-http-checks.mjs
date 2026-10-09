import assert from 'node:assert/strict';
import {Module,UnauthorizedException} from '@nestjs/common';
import {NestFactory} from '@nestjs/core';
import {AuthService} from '../dist/auth/auth.service.js';
import {DatabaseService} from '../dist/database/database.service.js';
import {FinanceController} from '../dist/finance/finance.controller.js';
import {FinanceWorkspaceService} from '../dist/finance/finance-workspace.service.js';
import {FinanceReceivablesWorkspaceService} from '../dist/finance/finance-receivables-workspace.service.js';
import {FinanceShiftsService} from '../dist/finance/finance-shifts.service.js';
import {FinanceReceivablesService} from '../dist/finance/finance-receivables.service.js';
import {FinanceShiftCloseService} from '../dist/finance/finance-shift-close.service.js';
import {FinancePeriodCloseService} from '../dist/finance/finance-period-close.service.js';
import {FinanceSettlementService} from '../dist/finance/finance-settlement.service.js';
import {financeKey} from '../dist/finance/finance-native-key.js';
import {FinancePersistenceService} from '../dist/finance/finance-persistence.service.js';
import {PaymentsService} from '../dist/payments/payments.service.js';
// The real guard delegates token verification to this isolated fixture map.
export async function checkReceivablesWorkspaceHttp(db,workspace,arWorkspace,shifts,ar,{a,b,outsider,unitA,invoiceId,paymentId,foreignId}){
 const tokens=new Set([a,b,outsider]);class FixtureModule{}
 Module({controllers:[FinanceController],providers:[{provide:DatabaseService,useValue:db},{provide:AuthService,useValue:{authenticateAccessToken:async token=>{if(!tokens.has(token))throw new UnauthorizedException();return {accountId:token}}}},
  ...[[FinanceWorkspaceService,workspace],[FinanceReceivablesWorkspaceService,arWorkspace],[FinanceShiftsService,shifts],[FinanceReceivablesService,ar],[FinancePersistenceService,{}],[PaymentsService,{}],[FinanceShiftCloseService,{reviewCenters:async()=>[],pending:async()=>[]}],[FinancePeriodCloseService,{reviewCenters:async()=>[],preview:async()=>({state:'READY'}),submit:async()=>({status:'SUBMITTED'}),pending:async()=>[],decide:async()=>({status:'CLOSED'})}],[FinanceSettlementService,{list:async()=>[],syncPaymentReferences:async()=>({syncedCount:0,failedCount:0,remainingCount:0,batchSize:10}),import:async()=>({}),review:async()=>({})}]].map(([provide,useValue])=>({provide,useValue}))]})(FixtureModule);
 const app=await NestFactory.create(FixtureModule,{logger:false});let count=0;
 try{
  await app.listen(0,'127.0.0.1');const base=await app.getUrl();
  const call=async(path,token,body)=>{const r=await fetch(base+'/finance'+path,{method:body===undefined?'GET':'POST',headers:{...(token?{authorization:'Bearer '+token}:{}),'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,body:await r.json()}};
  const check=(value,expected)=>{assert.equal(value,expected);count++},root='/centers/'+unitA;
  check((await call(root+'/receivables/workspace')).status,401);
  check((await call(root+'/receivables/workspace',outsider)).status,403);
  check((await call(root+'/receivables/workspace?page=0',a)).status,400);
  check((await call(root+'/receivables/workspace?status=open&status=all',a)).status,400);
  check((await call(root+'/receivables/workspace?status=invalid',a)).status,400);
  check((await call(root+'/receivable-invoices?page=bad',a)).status,400);
  const list=await call(root+'/receivables/workspace?status=all&page=2',a);check(list.status,200);check(list.body.items.length,2);check(list.body.total,27);
  check((await call(root+'/receivables/'+foreignId,a)).status,404);
  const candidates=await call(root+'/receivable-invoices',a);check(candidates.status,200);check(candidates.body.items.length,1);check(candidates.body.items[0].id,invoiceId);
  const body={centerOrgUnitId:unitA,invoiceId,customerAccountId:b,totalMinor:100,paidMinor:0,dueAt:'2030-01-01T20:59:59.000Z'};
  check((await call('/receivables',a,{...body,totalMinor:101})).status,400);
  check((await call('/receivables',a,{...body,customerAccountId:a})).status,400);
  check((await call('/receivables',a,{...body,installments:{}})).status,400);
  check((await call('/receivables',outsider,body)).status,403);
  const created=await call('/receivables',a,body);check(created.status,201);check(created.body.outstandingMinor,100);const id=created.body.receivableId;
  const detail=await call(root+'/receivables/'+id,a);check(detail.status,200);check(detail.body.collectable,true);assert.ok(detail.body.collectionShiftId);assert.ok(detail.body.payments.items.some(x=>x.id===paymentId));count++;
  const collection={paymentId,amountMinor:100,receiptNumber:'HTTP-100'};
  check((await call('/receivables/'+id+'/collections',a,{...collection,amountMinor:101})).status,400);
  check((await call('/receivables/'+id+'/collections',outsider,collection)).status,403);
  const paid=await call('/receivables/'+id+'/collections',a,collection);check(paid.status,201);check(paid.body.outstandingMinor,0);assert.ok(paid.body.shiftId);count++;
  const final=await call(root+'/receivables/'+id,a);check(final.body.collectable,false);check(final.body.collections[0].receiptNumber,'HTTP-100');check(final.body.collections[0].shiftId,paid.body.shiftId);check(final.body.collections[0].collectedByAccountId,a);
  const ledger=await db.$queryRaw`SELECT e.\"type\"::text AS type,e.\"amountMinor\",e.\"referenceType\",e.\"referenceId\",e.\"recordedByAccountId\" FROM \"FinanceShiftEntry\" e WHERE e.\"paymentId\"=${financeKey('FinanceShiftEntry','paymentId',paymentId)}`;check(ledger.length,1);check(ledger[0].type,'REVENUE');check(ledger[0].amountMinor,100);check(ledger[0].referenceType,'RECEIVABLE_COLLECTION');check(ledger[0].recordedByAccountId,a);
  check((await call('/receivables/'+id+'/collections',a,collection)).status,400);
  return count;
 }finally{await app.close()}
}
