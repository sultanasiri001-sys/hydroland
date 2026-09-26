import fs from 'node:fs';
const service=fs.readFileSync(new URL('../src/trip-intelligence/trip-intelligence.service.ts',import.meta.url),'utf8');
const schema=fs.readFileSync(new URL('../prisma/schema.prisma',import.meta.url),'utf8');
const recovery=fs.readFileSync(new URL('./trip-weather-migration-recovery.mjs',import.meta.url),'utf8');
const historicalMigration=fs.readFileSync(new URL('../prisma/migrations/20260925210500_trip_weather_runtime/migration.sql',import.meta.url),'utf8');
const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const required=[
 ['maker-checker',"Briefing author cannot publish the same version."],
 ['controlled translation approval',"Translation author cannot approve the same controlled translation."],
 ['package fail closed',"All controlled safety translations must be approved before offline package generation."],
 ['sha256',"createHash('sha256')"],
 ['published briefing gate',"Published briefing required before package generation."]
];
for(const [name,needle] of required){if(!service.includes(needle))throw new Error('Missing Trip Intelligence boundary: '+name);}
for(const model of ['TripBriefing','DivePlan','EmergencyPlan','BriefingTranslation','OfflineTripPackage']){if(!schema.includes('model '+model+' {'))throw new Error('Missing Prisma model '+model);}
for(const marker of [
  "const MIGRATION = '20260925210500_trip_weather_runtime'",
  "[['Trip', 'id'], ['Account', 'id']]",
  'Number(failed.applied_steps_count) !== 0',
  'await requireRuntimeTablesAbsent()',
  '"tripId" UUID PRIMARY KEY REFERENCES "Trip"("id") ON DELETE CASCADE',
  '"reviewedByAccountId" UUID REFERENCES "Account"("id") ON DELETE SET NULL',
  "['prisma', 'migrate', 'resolve', '--applied', MIGRATION]",
]){if(!recovery.includes(marker))throw new Error('Missing trip-weather production recovery invariant: '+marker);}
if(!historicalMigration.includes('"tripId" TEXT PRIMARY KEY REFERENCES "Trip"("id") ON DELETE CASCADE'))throw new Error('Historical trip-weather migration was rewritten; production repair must stay in the recovery script.');
if(!pkg.scripts?.['db:deploy']?.includes('trip-weather-migration-recovery.mjs'))throw new Error('Production db:deploy does not invoke trip-weather migration recovery.');
console.log('Trip Intelligence validation passed:',required.length,'boundaries, 5 Prisma models, and guarded production trip-weather migration recovery.');
