import {Body,Controller,Get,Param,Post,Put,Query,Req,UseGuards} from '@nestjs/common';
import {AccessTokenGuard} from '../auth/access-token.guard';
import {ReviewGuard} from '../admin/review.guard';
import {TranslationService} from './translation.service';
import {TranslationContentClass,TranslationMode} from './translation.domain';

@Controller('translation')
export class TranslationController {
 constructor(private readonly service:TranslationService){}
 @Get('languages') languages(){return this.service.languages();}
 @Get('packs') packs(){return this.service.languagePacks();}
 @UseGuards(AccessTokenGuard) @Post('translate')
 translate(@Body() body:{sourceLanguage:string;targetLanguage:string;text:string;mode:TranslationMode;contentClass?:TranslationContentClass}){return this.service.translate(body);}
 @Get('emergency-phrasebook')
 phrasebook(@Query('language') language='ar'){return this.service.emergencyPhrasebook(language);}
 @UseGuards(ReviewGuard) @Post('emergency-phrasebook/translations/:translationId/approve')
 approveEmergency(@Req() req:any,@Param('translationId') id:string){return this.service.approveEmergencyTranslation(req.auth.accountId,id);}
 @UseGuards(AccessTokenGuard) @Get('preferences')
 preferences(@Req() req:any){return this.service.getPreference(req.auth.accountId);}
 @UseGuards(AccessTokenGuard) @Put('preferences')
 save(@Req() req:any,@Body() body:{preferredLanguageCode:string;mode:TranslationMode;autoTranslateMessages?:boolean;keepOriginalText?:boolean}){return this.service.savePreference(req.auth.accountId,body);}
}
