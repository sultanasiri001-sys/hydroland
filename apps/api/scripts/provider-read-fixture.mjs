// stdout is a Node --env-file fixture, not shell code. Never source/eval it.
import {createRequire} from 'node:module';
import {providerFixturePlatform,providerFixture,isolatedProviderFixture} from './provider-read-test-support.mjs';
isolatedProviderFixture();
const require=createRequire(import.meta.url),{DatabaseService}=require('../dist/database/database.service'),db=new DatabaseService();
try{const platform=await providerFixturePlatform(db);for(const key of ['MAPS_GEO','WEATHER_MARINE','DISTRESS_AIS']){const fixture=await providerFixture(db,platform,key);for(const [name,value] of Object.entries(fixture.env))process.stdout.write(name+'='+value+'\n');}}finally{await db.$disconnect()}
