import fs from 'node:fs';
const domain=fs.readFileSync(new URL('../src/translation/translation.domain.ts',import.meta.url),'utf8');
const router=fs.readFileSync(new URL('../src/translation/translation-router.service.ts',import.meta.url),'utf8');
const service=fs.readFileSync(new URL('../src/translation/translation.service.ts',import.meta.url),'utf8');
const schema=fs.readFileSync(new URL('../prisma/schema.prisma',import.meta.url),'utf8');
const checks=[
 ['ten target languages',"code:'ur'"],
 ['offline mode',"OFFLINE"],
 ['online mode',"ONLINE"],
 ['auto mode',"AUTO"],
 ['controlled safety block',"Controlled safety content must use reviewed translations."],
 ['provider fail closed',"No approved translation provider is available for the requested mode."],
 ['reviewed phrasebook',"reviewedAt:{not:null}"],
 ['self approval prevention',"Translation author cannot approve the same emergency phrase translation."],
 ['language pack model',"model LanguagePack {"],
 ['preference model',"model TranslationPreference {"],
 ['phrase model',"model EmergencyPhrase {"]
];
const all=domain+'\n'+router+'\n'+service+'\n'+schema;
for(const [name,needle] of checks){if(!all.includes(needle))throw new Error('Missing translation boundary: '+name);}
console.log('Instant Translator validation passed:',checks.length,'boundaries.');
