import {Controller,Get} from '@nestjs/common';
import {TranslationService} from './translation.service';
@Controller('translation')
export class TranslationController {
 constructor(private readonly service:TranslationService){}
 @Get('languages') languages(){return this.service.languages();}
}
