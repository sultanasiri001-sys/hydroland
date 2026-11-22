import { Body, Controller, Get, Header, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { LoyaltyPostingService } from './loyalty-posting.service';

type Request = {auth:{accountId:string}};
@Controller('rewards')
@UseGuards(AccessTokenGuard)
export class LoyaltyController {
  constructor(private readonly ledger:LoyaltyPostingService) {}
  @Put('budgets/:month') budget(@Req() r:Request,@Param('month') month:string,@Body() b:any) {
    return this.ledger.budget(r.auth.accountId,month,b?.firstCenter,b?.forecasts);
  }
  @Post('centers/:center/trips/:id/earn') earn(@Req() r:Request,@Param('center') center:string,@Param('id') id:string,@Body() b:any) {
    return this.ledger.earnTrip(r.auth.accountId,center,id,b?.directCostMinor,b?.costEvidence);
  }
  @Post('centers/:center/completed/:kind/:id/earn') earnPurchase(@Req() r:Request,@Param('center') center:string,@Param('kind') kind:string,@Param('id') id:string,@Body() b:any) {
    return this.ledger.earn(r.auth.accountId,center,kind,id,b?.directCostMinor,b?.costEvidence,b?.commissionEntryId);
  }
  @Post('centers/:center/offers') propose(@Req() r:Request,@Param('center') center:string,@Body() b:any) {return this.ledger.propose(r.auth.accountId,center,b);}
  @Post('offers/:id/approve') approve(@Req() r:Request,@Param('id') id:string) {return this.ledger.approve(r.auth.accountId,id);}
  @Header('Cache-Control','private, no-store')
  @Get('centers/:center/booking-balance') balance(@Req() r:Request,@Param('center') center:string){return this.ledger.bookingBalance(r.auth.accountId,center);}
  @Get('centers/:center/offers') offers(@Param('center') center:string) {return this.ledger.offers(center);}
  @Header('Cache-Control','private, no-store')
  @Get('offers/:id/quote') quote(@Req() r:Request,@Param('id') id:string) {return this.ledger.quote(r.auth.accountId,id);}
  @Post('offers/:id/reservations') reserve(@Req() r:Request,@Param('id') id:string,@Body() b:any) {
    return this.ledger.reserve(r.auth.accountId,id,b?.requestKey,b?.points,b?.cashDueMinor);
  }
  @Get('offers/:id/pending') pending(@Req() r:Request,@Param('id') id:string) {return this.ledger.pending(r.auth.accountId,id);}
  @Post('reservations/:id/payment-failed') failed(@Req() r:Request,@Param('id') id:string,@Body() b:any) {return this.ledger.failedPayment(r.auth.accountId,id,b?.evidenceId);}
  @Post('reservations/:id/payment') pay(@Req() r:Request,@Param('id') id:string) {return this.ledger.beginPayment(r.auth.accountId,id);}
  @Post('reservations/:id/cancel') cancel(@Req() r:Request,@Param('id') id:string) {return this.ledger.cancel(r.auth.accountId,id);}
  @Post('reservations/:id/complete') finish(@Req() r:Request,@Param('id') id:string,@Body() b:any) {return this.ledger.finish(r.auth.accountId,id,b?.financeEntryId);}
}
