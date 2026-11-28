import { Body, Controller, Get, Header, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin/admin.guard';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { CommunityService } from './community.service';
import { F03BuddyService } from './f03-buddy.service';
import { F03ProgramService } from './f03-program.service';
type Auth={auth:{accountId:string}};
@Controller('community/f03')
export class F03Controller {
  constructor(private readonly programs:F03ProgramService,private readonly buddies:F03BuddyService,private readonly community:CommunityService){}
  @Get('programs') @Header('Cache-Control','no-store') catalog(){return this.programs.catalog()}
  @Get('admin/authoring') @Header('Cache-Control','private, no-store') @UseGuards(AccessTokenGuard,AdminGuard) authoring(@Req() r:Auth){return this.programs.authoring(r.auth.accountId)}
  @Get('admin/sources') @Header('Cache-Control','private, no-store') @UseGuards(AccessTokenGuard,AdminGuard) sources(@Req() r:Auth){return this.programs.sources(r.auth.accountId)}
  @Post('admin/drafts') @UseGuards(AccessTokenGuard,AdminGuard) draft(@Req() r:Auth,@Body() body:unknown){return this.programs.draft(r.auth.accountId,body)}
  @Post('admin/programs') @UseGuards(AccessTokenGuard,AdminGuard) adopt(@Req() r:Auth,@Body() body:unknown){return this.programs.adopt(r.auth.accountId,body)}
  @Post('admin/programs/:id/withdraw') @UseGuards(AccessTokenGuard,AdminGuard) withdraw(@Req() r:Auth,@Param('id') id:string){return this.programs.withdraw(r.auth.accountId,id)}
  @Post('admin/programs/:id/events') @UseGuards(AccessTokenGuard,AdminGuard) event(@Req() r:Auth,@Param('id') id:string,@Body() body:Parameters<CommunityService['createEvent']>[1]){return this.community.createEvent(r.auth.accountId,{...body,programId:id,status:'DRAFT'})}
  @Get('mine') @Header('Cache-Control','private, no-store') @UseGuards(AccessTokenGuard) mine(@Req() r:Auth){return this.buddies.mine(r.auth.accountId)}
  @Put('programs/:id/membership') @UseGuards(AccessTokenGuard) join(@Req() r:Auth,@Param('id') id:string,@Body() body:unknown){return this.buddies.join(r.auth.accountId,id,body)}
  @Post('programs/:id/withdraw') @UseGuards(AccessTokenGuard) leave(@Req() r:Auth,@Param('id') id:string){return this.buddies.leave(r.auth.accountId,id)}
  @Get('programs/:id/directory') @Header('Cache-Control','private, no-store') @UseGuards(AccessTokenGuard) directory(@Req() r:Auth,@Param('id') id:string){return this.buddies.directory(r.auth.accountId,id)}
  @Post('programs/:id/requests') @UseGuards(AccessTokenGuard) request(@Req() r:Auth,@Param('id') id:string,@Body() body:unknown){return this.buddies.request(r.auth.accountId,id,body)}
  @Post('requests/:id/decision') @UseGuards(AccessTokenGuard) decide(@Req() r:Auth,@Param('id') id:string,@Body() body:unknown){return this.buddies.decide(r.auth.accountId,id,body)}
}
