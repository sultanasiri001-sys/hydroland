import {BadRequestException,Injectable} from '@nestjs/common';
import {Prisma,TranslationMode as DbTranslationMode} from '@prisma/client';
import {DatabaseService} from '../database/database.service';
import {ARABIC_LANGUAGE,HYDROLAND_TRANSLATION_LANGUAGES,TRANSLATION_MODES,TranslationMode} from './translation.domain';

@Injectable()
export class TranslationService {
  constructor(private readonly db:DatabaseService){}
  languages(){return {source:ARABIC_LANGUAGE,targets:HYDROLAND_TRANSLATION_LANGUAGES,bidirectional:true};}
  private supported(code:string){return code==='ar'||HYDROLAND_TRANSLATION_LANGUAGES.some(x=>x.code===code);}
  resolveMode(requested:TranslationMode,online:boolean,packInstalled:boolean){
    if(!TRANSLATION_MODES.includes(requested))throw new BadRequestException('Invalid translation mode.');
    if(requested==='OFFLINE')return packInstalled?'OFFLINE':'UNAVAILABLE';
    if(requested==='ONLINE')return online?'ONLINE':'UNAVAILABLE';
    if(packInstalled)return 'OFFLINE';
    return online?'ONLINE':'UNAVAILABLE';
  }
  async getPreference(accountId:string){
    return this.db.translationPreference.findUnique({where:{accountId}});
  }
  async savePreference(accountId:string,input:{preferredLanguageCode:string;mode:TranslationMode;autoTranslateMessages?:boolean;keepOriginalText?:boolean}){
    if(!this.supported(input.preferredLanguageCode))throw new BadRequestException('Unsupported language.');
    if(!TRANSLATION_MODES.includes(input.mode))throw new BadRequestException('Invalid translation mode.');
    const data={preferredLanguageCode:input.preferredLanguageCode,mode:input.mode as DbTranslationMode,autoTranslateMessages:input.autoTranslateMessages??false,keepOriginalText:input.keepOriginalText??true};
    return this.db.translationPreference.upsert({where:{accountId},create:{accountId,...data},update:data});
  }
  async languagePacks(){return this.db.languagePack.findMany({orderBy:[{languageCode:'asc'},{version:'desc'}]});}
  translate(){return {status:'PROVIDER_NOT_SELECTED',translatedText:null};}
}
