import {Body,Controller,Get,Param,Post,Req,UseGuards} from '@nestjs/common';
import {AccessTokenGuard} from '../auth/access-token.guard';
import {FinanceShiftsService} from './finance-shifts.service';
import {FinanceReceivablesService} from './finance-receivables.service';

@UseGuards(AccessTokenGuard)
@Controller('finance')
export class FinanceController{
  constructor(private readonly shifts:FinanceShiftsService,private readonly receivables:FinanceReceivablesService){}

  @Post('shifts/open')
  open(@Req()r:{auth:{accountId:string}},@Body()b:{centerOrgUnitId:string;openingBalanceMinor:number}){
    return this.shifts.openShift(r.auth.accountId,b.centerOrgUnitId,b.openingBalanceMinor);
  }

  @Post('shifts/:shiftId/entries')
  entry(@Req()r:{auth:{accountId:string}},@Param('shiftId')shiftId:string,@Body()b:{type:'REVENUE'|'EXPENSE'|'REFUND'|'ADJUSTMENT';amountMinor:number;paymentId?:string;referenceType?:string;referenceId?:string;description?:string}){
    return this.shifts.recordEntry(r.auth.accountId,shiftId,b);
  }

  @Post('shifts/:shiftId/handover')
  handover(@Req()r:{auth:{accountId:string}},@Param('shiftId')shiftId:string,@Body()b:{toAccountantId:string;actualCashMinor:number;varianceReason?:string}){
    return this.shifts.requestHandover(r.auth.accountId,shiftId,b.toAccountantId,b.actualCashMinor,b.varianceReason);
  }

  @Post('shifts/handovers/:handoverId/accept')
  accept(@Req()r:{auth:{accountId:string}},@Param('handoverId')handoverId:string){
    return this.shifts.acceptHandover(r.auth.accountId,handoverId);
  }

  @Post('receivables')
  createReceivable(@Req()r:{auth:{accountId:string}},@Body()b:{invoiceId:string;customerAccountId:string;centerOrgUnitId:string;totalMinor:number;paidMinor?:number;dueAt:string;creditLimitMinor?:number;installments?:Array<{sequence:number;amountMinor:number;dueAt:string}>}){
    return this.receivables.createDeferredInvoice(r.auth.accountId,{...b,dueAt:new Date(b.dueAt),installments:b.installments?.map(x=>({...x,dueAt:new Date(x.dueAt)}))});
  }

  @Post('receivables/:receivableId/collections')
  collectReceivable(@Req()r:{auth:{accountId:string}},@Param('receivableId')receivableId:string,@Body()b:{paymentId:string;amountMinor:number;receiptNumber:string;installmentId?:string}){
    return this.receivables.collect(r.auth.accountId,receivableId,b);
  }

  @Get('centers/:centerOrgUnitId/receivables')
  branchReceivables(@Req()r:{auth:{accountId:string}},@Param('centerOrgUnitId')centerOrgUnitId:string){
    return this.receivables.branchAr(r.auth.accountId,centerOrgUnitId);
  }
}
