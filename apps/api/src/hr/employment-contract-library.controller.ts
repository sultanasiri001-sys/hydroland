import { Body, Controller, Get, Header, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { EmploymentContractLibraryService } from './employment-contract-library.service';
@Controller('hr/employments/:employmentId/contracts')
@UseGuards(AccessTokenGuard)
export class EmploymentContractLibraryController {
 constructor(private readonly service:EmploymentContractLibraryService){}
 @Get() @Header('Cache-Control','private, no-store') workspace(@Req() r:{auth:{accountId:string}},@Param('employmentId') id:string){return this.service.workspace(r.auth.accountId,id);}
 @Post() create(@Req() r:{auth:{accountId:string}},@Param('employmentId') id:string,@Body() b:unknown){return this.service.create(r.auth.accountId,id,b);}
}
