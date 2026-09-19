import {BadRequestException,Injectable,ServiceUnavailableException} from '@nestjs/common';
import {HYDROLAND_TRANSLATION_LANGUAGES,TranslationContentClass,TranslationMode} from './translation.domain';
import {TranslationProvider,TranslationRequest} from './translation-provider';
import {IntegrationService} from '../integrations/integration.service';

@Injectable()
export class TranslationRouterService {
 constructor(private readonly integrations:IntegrationService){}
 private providers:TranslationProvider[]=[];
 register(provider:TranslationProvider){this.providers=this.providers.filter(p=>p.id!==provider.id).concat(provider);}
 private supported(code:string){return code==='ar'||HYDROLAND_TRANSLATION_LANGUAGES.some(x=>x.code===code);}
 async translate(input:TranslationRequest & {mode:TranslationMode;contentClass:TranslationContentClass}){
  if(!this.supported(input.sourceLanguage)||!this.supported(input.targetLanguage))throw new BadRequestException('Unsupported language.');
  if(input.sourceLanguage===input.targetLanguage)return {translatedText:input.text,provider:'IDENTITY',mode:'LOCAL'};
  if(input.contentClass==='CONTROLLED_SAFETY_CONTENT')throw new BadRequestException('Controlled safety content must use reviewed translations.');
  const candidates=this.providers.filter(p=>p.supports(input.sourceLanguage,input.targetLanguage));
  const ordered=input.mode==='OFFLINE'?candidates.filter(p=>p.mode==='OFFLINE'):input.mode==='ONLINE'?candidates.filter(p=>p.mode==='ONLINE'):[...candidates.filter(p=>p.mode==='OFFLINE'),...candidates.filter(p=>p.mode==='ONLINE')];
  for(const provider of ordered){
   if(provider.mode==='ONLINE')this.integrations.requireOperational('TRANSLATION_ENGINE');
   if(await provider.isAvailable()){const result=await provider.translate(input);return {...result,mode:provider.mode};}
  }
  throw new ServiceUnavailableException('No approved translation provider is available for the requested mode.');
 }
}
