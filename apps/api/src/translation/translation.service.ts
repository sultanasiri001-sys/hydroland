import {BadRequestException,ConflictException,ForbiddenException,Injectable,NotFoundException} from '@nestjs/common';
import {Prisma,TranslationMode as DbTranslationMode} from '@prisma/client';
import {DatabaseService} from '../database/database.service';
import {ARABIC_LANGUAGE,HYDROLAND_TRANSLATION_LANGUAGES,TRANSLATION_MODES,TranslationContentClass,TranslationMode} from './translation.domain';
import {TranslationRouterService} from './translation-router.service';

@Injectable()
export class TranslationService {
  constructor(private readonly db:DatabaseService,private readonly router:TranslationRouterService){}
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
  async emergencyPhrasebook(languageCode:string){
    if(!this.supported(languageCode))throw new BadRequestException('Unsupported language.');
    return this.db.emergencyPhrase.findMany({where:{status:'APPROVED'},include:{translations:{where:{languageCode,reviewedAt:{not:null}}}},orderBy:[{category:'asc'},{key:'asc'}]});
  }
  async approveEmergencyTranslation(reviewerAccountId:string,translationId:string){
    const item=await this.db.emergencyPhraseTranslation.findUnique({where:{id:translationId},include:{phrase:true}});
    if(!item)throw new NotFoundException('Emergency phrase translation not found.');
    if(item.createdByAccountId===reviewerAccountId)throw new ForbiddenException('Translation author cannot approve the same emergency phrase translation.');
    if(item.phrase.status==='RETIRED')throw new ConflictException('Retired emergency phrase cannot be approved.');
    return this.db.emergencyPhraseTranslation.update({where:{id:translationId},data:{reviewedByAccountId:reviewerAccountId,reviewedAt:new Date()}});
  }
  translate(input:{sourceLanguage:string;targetLanguage:string;text:string;mode:TranslationMode;contentClass?:TranslationContentClass}){return this.router.translate({...input,contentClass:input.contentClass??'GENERAL'});}
}
