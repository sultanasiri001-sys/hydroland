export const TRANSLATION_MODES=['OFFLINE','ONLINE','AUTO'] as const;
export type TranslationMode=typeof TRANSLATION_MODES[number];
export const LANGUAGE_PACK_STATUSES=['NOT_DOWNLOADED','DOWNLOAD_AVAILABLE','INSTALLED','UPDATE_AVAILABLE'] as const;
export type LanguagePackStatus=typeof LANGUAGE_PACK_STATUSES[number];

export const HYDROLAND_TRANSLATION_LANGUAGES=[
  {code:'en',name:'English'},{code:'fr',name:'Français'},{code:'es',name:'Español'},
  {code:'de',name:'Deutsch'},{code:'it',name:'Italiano'},{code:'tr',name:'Türkçe'},
  {code:'ru',name:'Русский'},{code:'zh-CN',name:'简体中文'},{code:'ja',name:'日本語'},
  {code:'ur',name:'اردو'}
] as const;

export const ARABIC_LANGUAGE={code:'ar',name:'العربية'} as const;
export type TranslationContentClass='GENERAL'|'REVIEWED'|'CONTROLLED_SAFETY_CONTENT';
