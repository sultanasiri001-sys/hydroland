import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { ContractLibraryService } from './contract-library.service';
type Request={auth:{accountId:string}};
@UseGuards(AccessTokenGuard)
@Controller('contracts/library')
export class ContractLibraryController {
  constructor(private readonly library:ContractLibraryService){}
  @Get('workspace') workspace(@Req() r:Request){return this.library.workspace(r.auth.accountId);}
  @Get() list(@Req() r:Request,@Query('q') q?:string,@Query('category') category?:string,@Query('state') state?:string){return this.library.list(r.auth.accountId,{q,category,state});}
  @Post('initialize') initialize(@Req() r:Request,@Body() b:unknown){return this.library.initialize(r.auth.accountId,b);}
  @Get(':id') get(@Req() r:Request,@Param('id') id:string){return this.library.get(r.auth.accountId,id);}
  @Get(':id/history') history(@Req() r:Request,@Param('id') id:string){return this.library.history(r.auth.accountId,id);}
  @Get(':id/events') events(@Req() r:Request,@Param('id') id:string){return this.library.events(r.auth.accountId,id);}
  @Post(':id/revise') revise(@Req() r:Request,@Param('id') id:string,@Body() b:unknown){return this.library.revise(r.auth.accountId,id,b);}
  @Post(':id/copy') copy(@Req() r:Request,@Param('id') id:string,@Body() b:unknown){return this.library.revise(r.auth.accountId,id,b,true);}
  @Post(':id/decision') decide(@Req() r:Request,@Param('id') id:string,@Body() b:unknown){return this.library.decide(r.auth.accountId,id,b);}
}
