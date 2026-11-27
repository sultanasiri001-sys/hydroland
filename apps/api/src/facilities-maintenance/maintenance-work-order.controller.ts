import { Body, Controller, Get, Header, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { MaintenanceWorkOrderService } from './maintenance-work-order.service';
type Request={auth:{accountId:string}};

@Controller('maintenance')
@UseGuards(AccessTokenGuard)
export class MaintenanceOrganizationsController {
  constructor(private readonly service:MaintenanceWorkOrderService){}
  @Get('organizations') @Header('Cache-Control','private, no-store')
  organizations(@Req()req:Request){return this.service.organizations(req.auth.accountId);}
}

@Controller('organizations/:organizationId/maintenance')
@UseGuards(AccessTokenGuard)
export class MaintenanceWorkOrderController {
  constructor(private readonly service:MaintenanceWorkOrderService){}
  @Get('workspace') @Header('Cache-Control','private, no-store')
  workspace(@Req()req:Request,@Param('organizationId')org:string){return this.service.workspace(req.auth.accountId,org);}
  @Get('orders/:id') @Header('Cache-Control','private, no-store')
  detail(@Req()req:Request,@Param('organizationId')org:string,@Param('id')id:string){return this.service.detail(req.auth.accountId,org,id);}
  @Post('orders') @Header('Cache-Control','private, no-store')
  create(@Req()req:Request,@Param('organizationId')org:string,@Body()body:unknown){return this.service.create(req.auth.accountId,org,body);}
  @Post('orders/:id/:action') @Header('Cache-Control','private, no-store')
  action(@Req()req:Request,@Param('organizationId')org:string,@Param('id')id:string,@Param('action')action:string,@Body()body:unknown){return this.service.action(req.auth.accountId,org,id,action,body);}
  @Post('plans') @Header('Cache-Control','private, no-store')
  plan(@Req()req:Request,@Param('organizationId')org:string,@Body()body:unknown){return this.service.createPlan(req.auth.accountId,org,body);}
  @Post('plans/:id/state') @Header('Cache-Control','private, no-store')
  planState(@Req()req:Request,@Param('organizationId')org:string,@Param('id')id:string,@Body()body:unknown){return this.service.planState(req.auth.accountId,org,id,body);}
}
