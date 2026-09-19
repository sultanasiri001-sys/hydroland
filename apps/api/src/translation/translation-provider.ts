export type TranslationRequest={sourceLanguage:string;targetLanguage:string;text:string};
export type TranslationResult={translatedText:string;provider:string};
export interface TranslationProvider {
 readonly id:string;
 readonly mode:'OFFLINE'|'ONLINE';
 isAvailable():Promise<boolean>;
 supports(sourceLanguage:string,targetLanguage:string):boolean;
 translate(input:TranslationRequest):Promise<TranslationResult>;
}
