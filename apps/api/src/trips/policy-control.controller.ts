import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin/admin.guard';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { PolicyControlService, PolicyState } from './policy-control.service';

@UseGuards(AccessTokenGuard,AdminGuard)
@Controller('admin/policies')
export class PolicyControlController {
  constructor(private readonly policies:PolicyControlService) {}

  @Get()
  list(@Query('category') category?:string){return this.policies.list(category);}

  @Patch(':category/:ruleKey/state')
  setState(
    @Req() req:{auth:{accountId:string}},
    @Param('category') category:string,
    @Param('ruleKey') ruleKey:string,
    @Body() body:{state:PolicyState;reason?:string},
  ){
    return this.policies.setState(req.auth.accountId,category,ruleKey,body.state,body.reason);
  }

  @Post()
  upsert(
    @Req() req:{auth:{accountId:string}},
    @Body() body:{category?:string;ruleKey?:string;labelAr?:string;labelEn?:string|null;description?:string|null;state?:PolicyState},
  ){
    return this.policies.upsert(req.auth.accountId,body);
  }
}
