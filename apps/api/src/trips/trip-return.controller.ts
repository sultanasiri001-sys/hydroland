import { Body, Controller, Get, Header, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { TripReturnService } from './trip-return.service';

@UseGuards(AccessTokenGuard)
@Controller('trips/return-accountability')
export class TripReturnController {
  constructor(private readonly returns: TripReturnService) {}
  @Get(':tripId')
  @Header('Cache-Control', 'private, no-store')
  preview(@Req() request: { auth: { accountId: string } }, @Param('tripId') tripId: string) { return this.returns.preview(request.auth.accountId, tripId); }
  @Post(':tripId')
  save(@Req() request: { auth: { accountId: string } }, @Param('tripId') tripId: string, @Body() body: unknown) { return this.returns.save(request.auth.accountId, tripId, body); }
}
