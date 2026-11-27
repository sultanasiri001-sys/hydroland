import {Body,Controller,Get,Header,Param,Post,Req,UseGuards} from '@nestjs/common';
import {AccessTokenGuard} from '../auth/access-token.guard';
import {OfflineTripReader} from './offline-trip-authorization.service';
import {MobileOfflineService} from './mobile-offline.service';
type Request={auth:OfflineTripReader;headers:{authorization?:string}};
const bearer=(req:Request)=>req.headers.authorization?.replace(/^Bearer\s+/i,'')??'';
@UseGuards(AccessTokenGuard)
@Controller('mobile-offline')
export class MobileOfflineController{
 constructor(private readonly service:MobileOfflineService){}
 @Get('trips/:tripId/status') @Header('Cache-Control','private, no-store')
 status(@Req() req:Request,@Param('tripId') tripId:string){return this.service.packageStatus(req.auth,bearer(req),tripId)}
 @Get('trips/:tripId/package') @Header('Cache-Control','private, no-store')
 package(@Req() req:Request,@Param('tripId') tripId:string){return this.service.packageContent(req.auth,bearer(req),tripId)}
 @Get('trips/:tripId/drafts') @Header('Cache-Control','private, no-store')
 drafts(@Req() req:Request,@Param('tripId') tripId:string){return this.service.drafts(req.auth,bearer(req),tripId)}
 @Get('trips/:tripId/drafts/:briefingId') @Header('Cache-Control','private, no-store')
 draft(@Req() req:Request,@Param('tripId') tripId:string,@Param('briefingId') briefingId:string){return this.service.draft(req.auth,bearer(req),tripId,briefingId)}
 @Post('sync') @Header('Cache-Control','private, no-store')
 sync(@Req() req:Request,@Body() body:unknown){return this.service.sync(req.auth,body)}
}
