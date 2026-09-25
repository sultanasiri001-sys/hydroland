import {Body,Controller,Get,Param,Patch,Post,Req,UseGuards} from '@nestjs/common';
import {AdminGuard} from '../admin/admin.guard';
import {AccessTokenGuard} from '../auth/access-token.guard';
import {SafetyIncidentsService} from './safety-incidents.service';

@UseGuards(AccessTokenGuard)
@Controller('safety/incidents')
export class SafetyIncidentsController{
 constructor(private readonly incidents:SafetyIncidentsService){}
 @Post()
 create(@Req()request:{auth:{accountId:string}},@Body()body:{tripId?:string;severity:'LOW'|'MEDIUM'|'HIGH'|'CRITICAL';title:string;description:string;locationName?:string}){return this.incidents.create(request.auth.accountId,body)}
 @Get('mine')
 mine(@Req()request:{auth:{accountId:string}}){return this.incidents.mine(request.auth.accountId)}
 @UseGuards(AdminGuard)
 @Get('admin')
 adminQueue(){return this.incidents.adminQueue()}
 @UseGuards(AdminGuard)
 @Patch('admin/:incidentId/status')
 decide(@Req()request:{auth:{accountId:string}},@Param('incidentId')incidentId:string,@Body()body:{status:'UNDER_REVIEW'|'RESOLVED'|'CLOSED';resolutionNotes?:string}){return this.incidents.decide(request.auth.accountId,incidentId,body)}
}