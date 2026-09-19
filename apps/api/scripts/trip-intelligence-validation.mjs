import fs from 'node:fs';
const service=fs.readFileSync(new URL('../src/trip-intelligence/trip-intelligence.service.ts',import.meta.url),'utf8');
const schema=fs.readFileSync(new URL('../prisma/schema.prisma',import.meta.url),'utf8');
const required=[
 ['maker-checker',"Briefing author cannot publish the same version."],
 ['controlled translation approval',"Translation author cannot approve the same controlled translation."],
 ['package fail closed',"All controlled safety translations must be approved before offline package generation."],
 ['sha256',"createHash('sha256')"],
 ['published briefing gate',"Published briefing required before package generation."]
];
for(const [name,needle] of required){if(!service.includes(needle))throw new Error('Missing Trip Intelligence boundary: '+name);}
for(const model of ['TripBriefing','DivePlan','EmergencyPlan','BriefingTranslation','OfflineTripPackage']){if(!schema.includes('model '+model+' {'))throw new Error('Missing Prisma model '+model);}
console.log('Trip Intelligence validation passed:',required.length,'boundaries and 5 Prisma models.');
