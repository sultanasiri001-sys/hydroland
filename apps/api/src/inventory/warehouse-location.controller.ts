import { Body, Controller, Get, Header, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { AdminGuard } from '../admin/admin.guard';
import { WarehouseLocationService } from './warehouse-location.service';
type Request={auth:{accountId:string}};
@Controller('admin/warehouse-locations')
@UseGuards(AccessTokenGuard,AdminGuard)
export class WarehouseLocationController{
  constructor(private readonly locations:WarehouseLocationService){}
  @Get() @Header('Cache-Control','private, no-store') list(@Req()r:Request,@Query('cursor')cursor?:string,@Query('status')status?:string){return this.locations.list(r.auth.accountId,cursor,status);}
  @Get(':id') @Header('Cache-Control','private, no-store') detail(@Req()r:Request,@Param('id')id:string){return this.locations.detail(r.auth.accountId,id);}
  @Post() @Header('Cache-Control','private, no-store') create(@Req()r:Request,@Body()body:unknown){return this.locations.create(r.auth.accountId,body);}
  @Patch(':id') @Header('Cache-Control','private, no-store') edit(@Req()r:Request,@Param('id')id:string,@Body()body:unknown){return this.locations.edit(r.auth.accountId,id,body);}
  @Post(':id/archive') @Header('Cache-Control','private, no-store') archive(@Req()r:Request,@Param('id')id:string,@Body()body:unknown){return this.locations.transition(r.auth.accountId,id,body,'ARCHIVED');}
  @Post(':id/restore') @Header('Cache-Control','private, no-store') restore(@Req()r:Request,@Param('id')id:string,@Body()body:unknown){return this.locations.transition(r.auth.accountId,id,body,'RECORDED');}
}
