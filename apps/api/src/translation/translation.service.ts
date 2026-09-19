import {BadRequestException,Injectable} from '@nestjs/common';
import {ARABIC_LANGUAGE,HYDROLAND_TRANSLATION_LANGUAGES,TRANSLATION_MODES,TranslationMode} from './translation.domain';

@Injectable()
export class TranslationService {
  languages(){return {source:ARABIC_LANGUAGE,targets:HYDROLAND_TRANSLATION_LANGUAGES,bidirectional:true};}
  resolveMode(requested:TranslationMode,online:boolean,packInstalled:boolean){
    if(!TRANSLATION_MODES.includes(requested))throw new BadRequestException('Invalid translation mode.');
    if(requested==='OFFLINE')return packInstalled?'OFFLINE':'UNAVAILABLE';
    if(requested==='ONLINE')return online?'ONLINE':'UNAVAILABLE';
    if(packInstalled)return 'OFFLINE';
    return online?'ONLINE':'UNAVAILABLE';
  }
  translate(){return {status:'PROVIDER_NOT_SELECTED',translatedText:null};}
}
