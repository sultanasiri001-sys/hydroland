import {Body,Controller,Get,Put,Req,UseGuards} from '@nestjs/common';
import {AuthGuard} from '../auth/auth.guard';
import {TranslationService} from './translation.service';
import {TranslationMode} from './translation.domain';

@Controller('translation')
export class TranslationController {
 constructor(private readonly service:TranslationService){}
 @Get('languages') languages(){return this.service.languages();}
 @Get('packs') packs(){return this.service.languagePacks();}
 @UseGuards(AuthGuard) @Get('preferences')
 preferences(@Req() req:any){return this.service.getPreference(req.account.id);}
 @UseGuards(AuthGuard) @Put('preferences')
 save(@Req() req:any,@Body() body:{preferredLanguageCode:string;mode:TranslationMode;autoTranslateMessages?:boolean;keepOriginalText?:boolean}){return this.service.savePreference(req.account.id,body);}
}
