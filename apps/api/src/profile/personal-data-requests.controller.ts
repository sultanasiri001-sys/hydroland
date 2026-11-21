import { ProfileService } from './profile.service';
import { Body, Controller, Get, Header, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { PersonalDataRequestsService } from './personal-data-requests.service';

type Session = { auth: { accountId: string } };
@UseGuards(AccessTokenGuard)
@Controller('me/data-requests')
export class PersonalDataRequestsController {
  constructor(private readonly requests: PersonalDataRequestsService, private readonly profiles: ProfileService) {}

  @Get('centers') @Header('Cache-Control','private, no-store')
  centers(@Req() req: Session) { return this.requests.centers(req.auth.accountId); }

  @Get() @Header('Cache-Control','private, no-store')
  list(@Req() req: Session, @Query('page') page?: string) {
    return this.requests.list(req.auth.accountId, page === undefined ? 1 : Number(page));
  }

  @Post(':id/profile-correction') @Header('Cache-Control','private, no-store')
  correct(@Req() req:Session,@Param('id') id:string,@Body() body:unknown) { return this.profiles.update(req.auth.accountId,body,id); }

  @Post() @Header('Cache-Control','private, no-store')
  submit(@Req() req: Session, @Body() body: unknown) {
    return this.requests.submit(req.auth.accountId, body);
  }
}
