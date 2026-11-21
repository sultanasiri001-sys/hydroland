import { Body, Controller, Delete, Get, Header, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { TripsService } from './trips.service';

@Controller('trips')
export class TripsController {
  constructor(private readonly s:TripsService){}

  @UseGuards(AccessTokenGuard)
  @Get('completed/mine')
  @Header('Cache-Control', 'private, no-store')
  completed(@Req() req:{auth:{accountId:string}},@Query('role') role:string,@Query('page') page='1'){
    return this.s.completed(req.auth.accountId,role,Number(page));
  }

  @Get()
  list(){return this.s.list();}

  @UseGuards(AccessTokenGuard)
  @Post(':id/bookings')
  book(@Req() r:{auth:{accountId:string}},@Param('id') id:string,@Body() b:{seats:number}){return this.s.book(r.auth.accountId,id,b.seats);}

  @UseGuards(AccessTokenGuard)
  @Get('bookings/mine')
  mine(@Req() r:{auth:{accountId:string}}){return this.s.mine(r.auth.accountId);}

  @UseGuards(AccessTokenGuard)
  @Delete('bookings/:bookingId')
  cancelMine(@Req() r:{auth:{accountId:string}},@Param('bookingId') bookingId:string){return this.s.cancelMine(r.auth.accountId,bookingId);}

  @UseGuards(AccessTokenGuard)
  @Patch('bookings/:bookingId/cancel')
  cancelMineAction(@Req() r:{auth:{accountId:string}},@Param('bookingId') bookingId:string){return this.s.cancelMine(r.auth.accountId,bookingId);}

  @UseGuards(AccessTokenGuard)
  @Get('bookings/:bookingId/participants')
  participants(@Req() r:{auth:{accountId:string}},@Param('bookingId') bookingId:string){return this.s.participantsForBooking(r.auth.accountId,bookingId);}

  @UseGuards(AccessTokenGuard)
  @Patch('bookings/:bookingId/participants/:participantId')
  updateParticipant(
    @Req() r:{auth:{accountId:string}},
    @Param('bookingId') bookingId:string,
    @Param('participantId') participantId:string,
    @Body() b:{fullName?:string;certificationTitle?:string|null;certificationNumber?:string|null;certificationIssuer?:string|null},
  ){return this.s.updateParticipant(r.auth.accountId,bookingId,participantId,b);}
}
