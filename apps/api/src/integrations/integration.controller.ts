import { Body, Controller, Get, Header, Headers, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard'; import { AdminGuard } from '../admin/admin.guard'; import { IntegrationKey } from './integration.types'; import { IntegrationService } from './integration.service';
import { EmailDeliveryService } from './email-delivery.service';
@Controller('integrations') export class IntegrationController {
 constructor(private readonly service:IntegrationService,private readonly email:EmailDeliveryService){}
 @UseGuards(AccessTokenGuard,AdminGuard) @Get('catalog') catalog(){return this.service.list()}
 @Get('maps/public-config') mapsPublicConfig(){return this.service.publicMapConfig()}
 @Get('weather/public-config') weatherPublicConfig(){return this.service.publicWeatherConfig()}
 @Get('email/public-config') @Header('Cache-Control','no-store') emailPublicConfig(){return this.email.publicConfig()}
 @Post(':provider/webhooks') webhook(@Param('provider')provider:IntegrationKey,@Headers()headers:Record<string,string|string[]|undefined>,@Req()request:{rawBody?:Buffer},@Body()payload:Record<string,unknown>){return this.service.verifyWebhook(provider,headers,request.rawBody,payload)}
}
