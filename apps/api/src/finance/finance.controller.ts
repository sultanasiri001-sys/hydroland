import {Body,Controller,Param,Post,Req,UseGuards} from '@nestjs/common';
import {AccessTokenGuard} from '../auth/access-token.guard';
import {FinanceAccessService} from './finance-access.service';
import {FinanceShiftsService} from './finance-shifts.service';

@UseGuards(AccessTokenGuard)
@Controller('finance/shifts')
export class FinanceController{
  constructor(private readonly shifts:FinanceShiftsService,private readonly access:FinanceAccessService){}

  @Post('open')
  async open(@Req()r:{auth:{accountId:string}},@Body()b:{centerOrgUnitId:string;openingBalanceMinor:number}){
    await this.access.requireBranchAccountant(r.auth.accountId,b.centerOrgUnitId);
    return this.shifts.openShift(r.auth.accountId,b.centerOrgUnitId,b.openingBalanceMinor);
  }

  @Post(':shiftId/entries')
  entry(@Req()r:{auth:{accountId:string}},@Param('shiftId')shiftId:string,@Body()b:{type:'REVENUE'|'EXPENSE'|'REFUND'|'ADJUSTMENT';amountMinor:number;paymentId?:string;referenceType?:string;referenceId?:string;description?:string}){
    return this.shifts.recordEntry(r.auth.accountId,shiftId,b);
  }

  @Post(':shiftId/handover')
  handover(@Req()r:{auth:{accountId:string}},@Param('shiftId')shiftId:string,@Body()b:{toAccountantId:string;actualCashMinor:number;varianceReason?:string}){
    return this.shifts.requestHandover(r.auth.accountId,shiftId,b.toAccountantId,b.actualCashMinor,b.varianceReason);
  }

  @Post('handovers/:handoverId/accept')
  accept(@Req()r:{auth:{accountId:string}},@Param('handoverId')handoverId:string){
    return this.shifts.acceptHandover(r.auth.accountId,handoverId);
  }
}
