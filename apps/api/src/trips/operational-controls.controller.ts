import { Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin/admin.guard';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { OperationalControlsService } from './operational-controls.service';
@UseGuards(AccessTokenGuard,AdminGuard)
@Controller('admin/operational-controls')
export class OperationalControlsController {
 constructor(private readonly controls:OperationalControlsService){}
 @Get() list(){return this.controls.list();}
 @Patch(':id') change(@Req() req:{auth:{accountId:string}},@Param('id') id:string,@Body() body:Record<string,unknown>){return this.controls.change(req.auth.accountId,id,body);}
}
