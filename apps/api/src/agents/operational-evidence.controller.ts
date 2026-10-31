import { Body, Controller, Get, Header, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { AdminGuard } from '../admin/admin.guard';
import { OperationalEvidenceService } from './operational-evidence.service';
type Request={auth:{accountId:string}};
@Controller('admin/operational-evidence')
@UseGuards(AccessTokenGuard,AdminGuard)
export class OperationalEvidenceController{
  constructor(private readonly evidence:OperationalEvidenceService){}
  @Get() @Header('Cache-Control','private, no-store') list(@Req()r:Request,@Query('cursor')cursor?:string,@Query('kind')kind?:string,@Query('status')status?:string){return this.evidence.list(r.auth.accountId,cursor,kind,status);}
  @Get(':id') @Header('Cache-Control','private, no-store') detail(@Req()r:Request,@Param('id')id:string){return this.evidence.detail(r.auth.accountId,id);}
  @Post() @Header('Cache-Control','private, no-store') create(@Req()r:Request,@Body()body:unknown){return this.evidence.create(r.auth.accountId,body);}
  @Post(':id/record') @Header('Cache-Control','private, no-store') record(@Req()r:Request,@Param('id')id:string,@Body()body:unknown){return this.evidence.transition(r.auth.accountId,id,body,'RECORDED');}
  @Post(':id/archive') @Header('Cache-Control','private, no-store') archive(@Req()r:Request,@Param('id')id:string,@Body()body:unknown){return this.evidence.transition(r.auth.accountId,id,body,'ARCHIVED');}
}
