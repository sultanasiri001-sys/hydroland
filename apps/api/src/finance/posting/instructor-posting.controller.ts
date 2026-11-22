import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../../auth/access-token.guard';
import { InstructorPostingService } from './instructor-posting.service';

type Request = {auth:{accountId:string}};
@Controller('finance/instructor-earnings')
@UseGuards(AccessTokenGuard)
export class InstructorPostingController {
  constructor(private readonly posting:InstructorPostingService) {}
  @Post('enrollments/:id') accrue(@Req() r:Request,@Param('id') id:string,@Body() b:any) {
    return this.posting.accrue(r.auth.accountId,id,b?.agreementId,b?.collectionId,b?.attestation);
  }
  @Post(':id/review') review(@Req() r:Request,@Param('id') id:string,@Body() b:any) {
    return this.posting.review(r.auth.accountId,id,b?.decision,b?.reason);
  }
  @Post(':id/attempts') prepare(@Req() r:Request,@Param('id') id:string,@Body() b:any) {
    return this.posting.prepare(r.auth.accountId,id,b?.attemptId);
  }
  @Post('attempts/:id/reconcile') reconcile(@Req() r:Request,@Param('id') id:string,@Body() b:any) {
    return this.posting.reconcile(r.auth.accountId,id,b?.evidenceId,b?.financeEntryId);
  }
  @Post('recoveries/:id/confirm') recover(@Req() r:Request,@Param('id') id:string,@Body() b:any) {
    return this.posting.recover(r.auth.accountId,id,b?.financeEntryId,b?.evidenceId);
  }
  @Post(':id/reversals') reverse(@Req() r:Request,@Param('id') id:string,@Body() b:any) {
    return this.posting.reverse(r.auth.accountId,id,b?.refundEntryId,b?.amountMinor,b?.decisionReference);
  }
}
