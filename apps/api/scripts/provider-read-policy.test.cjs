const test=require('node:test'),assert=require('node:assert/strict');
const {parseProviderReadPolicy,sourcePin,utcTime,digest}=require('../dist/integrations/provider-read-policy');
const {boundedProviderJson,stormglassEndpoint}=require('../dist/integrations/provider-read-http');
const {MarineTrafficAisService}=require('../dist/integrations/marinetraffic-ais.service');
const {StormglassWeatherService}=require('../dist/trips/stormglass-weather.service');
const {SafetyDistressService}=require('../dist/safety/safety-distress.service');
const {validWeatherReview,publicWeatherSnapshot}=require('../dist/trips/weather-review-context');
const now=Date.now(),at=new Date(now+3600000).toISOString();
const policy=(key='WEATHER_MARINE')=>({kind:'D03_PROVIDER_ENTITLEMENT',version:1,integration:key,provider:key==='WEATHER_MARINE'?'STORMGLASS':key==='DISTRESS_AIS'?'MARINETRAFFIC_AIS_ONLY':'E2E_MAPS',mode:'SANDBOX',enabled:true,validFrom:new Date(now-1000).toISOString(),validUntil:new Date(now+86400000).toISOString(),attribution:'Isolated test source',termsUrl:'https://example.invalid/terms',entitlementReference:'synthetic-only',attachmentId:'test-attachment',attachmentSha256:'a'.repeat(64),source:key==='WEATHER_MARINE'?'sg':key==='DISTRESS_AIS'?'AIS':'MAP_STYLE',maxDataAgeSeconds:300,allowedAisDataSources:key==='DISTRESS_AIS'?['TER','SAT']:[],maxRequestsPerMinute:key==='MAPS_GEO'?0:2,maxRequestsPerDay:key==='MAPS_GEO'?0:20,costMode:'BOUNDED',currency:'SAR',maxCostMicrosPerRequest:10,maxCostMicrosPerDay:100,allowedOrigins:[key==='WEATHER_MARINE'?'https://api.stormglass.io':key==='DISTRESS_AIS'?'https://services.marinetraffic.com':'https://maps.example.invalid'],maxResourcesPerView:100});
const source=(key='WEATHER_MARINE')=>({documentId:'synthetic-doc',version:1,sourceHash:'b'.repeat(64),policyHash:digest(policy(key)),policy:policy(key)});
const reason=expected=>error=>error.reason===expected;
test('source policy is finite, time scoped and exact; a pointer is not approval',()=>{
  assert.equal(parseProviderReadPolicy(policy(),'WEATHER_MARINE',now).source,'sg');
  for(const [change,code] of [[{maxRequestsPerDay:Infinity},'SOURCE_POLICY_INVALID'],[{validUntil:new Date(now).toISOString()},'SOURCE_EXPIRED'],[{validFrom:new Date(now+10000).toISOString()},'SOURCE_NOT_YET_VALID'],[{source:'noaa'},'SOURCE_SCOPE_MISMATCH'],[{allowedOrigins:['https://attacker.invalid']},'SOURCE_SCOPE_MISMATCH'],[{maxCostMicrosPerRequest:0},'SOURCE_COST_INVALID'],[{approval:true},'SOURCE_POLICY_INVALID']])assert.throws(()=>parseProviderReadPolicy({...policy(),...change},'WEATHER_MARINE',now),reason(code));
  const previous=process.env.HYDROLAND_D03_WEATHER_MARINE_DOCUMENT;delete process.env.HYDROLAND_D03_WEATHER_MARINE_DOCUMENT;
  assert.throws(()=>sourcePin('WEATHER_MARINE'),reason('SOURCE_APPROVAL_REQUIRED'));
  process.env.HYDROLAND_D03_WEATHER_MARINE_DOCUMENT='{"approved":true}';assert.throws(()=>sourcePin('WEATHER_MARINE'),reason('SOURCE_BINDING_INVALID'));
  if(previous===undefined)delete process.env.HYDROLAND_D03_WEATHER_MARINE_DOCUMENT;else process.env.HYDROLAND_D03_WEATHER_MARINE_DOCUMENT=previous;
});
test('direct browser maps require an explicitly no-charge public source',()=>{
  assert.throws(()=>parseProviderReadPolicy(policy('MAPS_GEO'),'MAPS_GEO',now),reason('MAP_BILLING_UNSUPPORTED'));
  const p={...policy('MAPS_GEO'),costMode:'NO_CHARGE',maxCostMicrosPerRequest:0,maxCostMicrosPerDay:0};
  assert.equal(parseProviderReadPolicy(p,'MAPS_GEO',now).source,'MAP_STYLE');
  for(const origin of ['http://example.invalid','https://127.0.0.1','https://localhost','https://admin:secret@example.invalid','https://example.invalid?api_key=secret'])assert.throws(()=>parseProviderReadPolicy({...p,allowedOrigins:[origin]},'MAPS_GEO',now));
});
test('timestamps require an explicit UTC offset and a real calendar date',()=>{
  assert.equal(utcTime('2026-11-27T00:00:00+00:00'),Date.parse('2026-11-27T00:00:00Z'));
  for(const value of ['2026-11-27','2026-11-27T00:00:00','2026-02-30T00:00:00Z','2026-11-27T24:00:00Z','2026-11-27T00:00:00+03:00'])assert.ok(Number.isNaN(utcTime(value)));
});
test('bounded bodies, quotas and rejected entitlement never masquerade as data',async()=>{
  assert.deepEqual(await boundedProviderJson(new Response('{"hours":[]}')), {hours:[]});
  await assert.rejects(()=>boundedProviderJson(new Response('x'.repeat(131073))),reason('PROVIDER_RESPONSE_TOO_LARGE'));
  await assert.rejects(()=>boundedProviderJson(new Response('{}',{headers:{'content-length':'131073'}})),reason('PROVIDER_RESPONSE_TOO_LARGE'));
  for(const [status,code] of [[429,'PROVIDER_QUOTA_EXHAUSTED'],[403,'PROVIDER_ENTITLEMENT_REJECTED'],[500,'PROVIDER_FAILED']])await assert.rejects(()=>boundedProviderJson(new Response('secret upstream body',{status})),reason(code));
  await assert.rejects(()=>boundedProviderJson(new Response('not-json')),reason('PROVIDER_RESPONSE_INVALID'));
});
test('weather transport host is fixed outside a loopback-only test fixture',()=>{
  const old={base:process.env.STORMGLASS_API_BASE_URL,node:process.env.NODE_ENV};
  try{for(const base of ['https://attacker.invalid','https://api.stormglass.io@attacker.invalid','http://127.0.0.1:9999','https://api.stormglass.io?key=secret']){process.env.NODE_ENV='production';process.env.STORMGLASS_API_BASE_URL=base;assert.throws(()=>stormglassEndpoint(),reason('PROVIDER_ENDPOINT_INVALID'))}process.env.NODE_ENV='test';process.env.STORMGLASS_API_BASE_URL='http://127.0.0.1:9999';assert.equal(stormglassEndpoint().origin,'http://127.0.0.1:9999');}
  finally{for(const [key,value] of [['STORMGLASS_API_BASE_URL',old.base],['NODE_ENV',old.node]])if(value===undefined)delete process.env[key];else process.env[key]=value;}
});
test('AIS identity, data age and direction sentinels preserve unknown values',()=>{
  const ais=new MarineTrafficAisService({}),s=source('DISTRESS_AIS'),row={MMSI:'123456789',IMO:'1234567',LAT:0,LON:0,TIMESTAMP:new Date().toISOString(),SPEED:124,COURSE:30,HEADING:511,DSRC:'SAT'};
  const p=ais.position([row],undefined,'1234567',s);assert.equal(p.speedKnots,12.4);assert.equal(p.headingDeg,null);assert.equal(p.dataSource,'SAT');assert.equal(p.provenance.automaticSafetyPermission,false);assert.ok(Date.parse(p.expiresAt)>Date.now());
  assert.throws(()=>ais.position([row],undefined,'7654321',s),reason('PROVIDER_IDENTITY_MISMATCH'));
  assert.throws(()=>ais.position([row,row],undefined,'1234567',s),reason('PROVIDER_RESPONSE_INVALID'));
  for(const [TIMESTAMP,code] of [[undefined,'PROVIDER_TIMESTAMP_INVALID'],[new Date(Date.now()+60000).toISOString(),'PROVIDER_TIMESTAMP_INVALID'],[new Date(Date.now()-301000).toISOString(),'PROVIDER_DATA_STALE']])assert.throws(()=>ais.position([{...row,TIMESTAMP}],row.MMSI,undefined,s),reason(code));
  const unknown=ais.position([{...row,STATUS:97,HEADING:120,SPEED:1023,COURSE:360}],row.MMSI,undefined,s);assert.equal(unknown.headingDeg,null);assert.equal(unknown.speedKnots,null);assert.equal(unknown.courseDeg,null);
  assert.throws(()=>ais.position([{...row,DSRC:'UNKNOWN'}],row.MMSI,undefined,s),reason('PROVIDER_SOURCE_MISMATCH'));
  assert.throws(()=>ais.position([row],row.MMSI,undefined,{...s,policy:{...s.policy,allowedAisDataSources:['TER']}}),reason('PROVIDER_SOURCE_MISMATCH'));
  assert.equal(ais.position([{...row,SPEED:1022}],row.MMSI,undefined,s).speedKnotsLowerBound,true);
});
test('weather uses only the requested model, retains zeroes and never approves',async()=>{
  const oldFetch=global.fetch,oldKey=process.env.STORMGLASS_API_KEY,oldBase=process.env.STORMGLASS_API_BASE_URL;
  const s=source();let payload={hours:[{time:at,windSpeed:{noaa:4},waveHeight:{meteo:1}}]},requests=0;
  process.env.STORMGLASS_API_KEY='synthetic-not-a-key';delete process.env.STORMGLASS_API_BASE_URL;
  global.fetch=async(url,options)=>{requests++;assert.equal(url.origin,'https://api.stormglass.io');assert.equal(url.searchParams.get('source'),'sg');assert.equal(options.redirect,'error');return new Response(JSON.stringify(payload))};
  const weather=new StormglassWeatherService({requireOperational:()=>{},recordProviderSignal:async()=>{},withProviderRead:(_key,operation)=>operation(s)});
  try{await assert.rejects(()=>weather.snapshot(0,0,at));payload={hours:[{time:at,windSpeed:{sg:0,noaa:80},gust:{sg:2}}]};const actual=await weather.snapshot(0,0,at);assert.equal(actual.windSpeedKph,0);assert.equal(actual.windGustKph,7.2);assert.equal(actual.source,'sg');assert.equal(actual.decision,'REVIEW_REQUIRED');assert.equal(actual.provenance.automaticSafetyPermission,false);assert.equal(requests,2);}
  finally{global.fetch=oldFetch;if(oldKey===undefined)delete process.env.STORMGLASS_API_KEY;else process.env.STORMGLASS_API_KEY=oldKey;if(oldBase===undefined)delete process.env.STORMGLASS_API_BASE_URL;else process.env.STORMGLASS_API_BASE_URL=oldBase;}
});
test('approved source fetch age is separate from forecast time and expires closed',()=>{
  const context={version:1,tripId:'synthetic-trip',startsAt:at,endsAt:new Date(Date.parse(at)+3600000).toISOString(),locationName:'Synthetic',latitude:0,longitude:0,locationRevision:'one'};
  const snapshot={forecastContext:context,observedAt:at,windSpeedKph:0,provenance:{version:1,purpose:'INFORMATION_ONLY',automaticSafetyPermission:false,maxDataAgeSeconds:300,validUntil:new Date(now+86400000).toISOString()}};
  assert.equal(validWeatherReview(snapshot,context,new Date(now),now+1000),true);
  assert.equal(validWeatherReview(snapshot,context,new Date(now),now+301000),false);
  assert.equal(validWeatherReview({...snapshot,provenance:{...snapshot.provenance,validUntil:new Date(now).toISOString()}},context,new Date(now),now),false);
});
test('unavailable or stale AIS retains the internal incident and caller location only',async()=>{
  const service=new SafetyDistressService({create:async(_actor,input)=>({id:'synthetic-incident',...input})},{singleVesselByMmsi:async()=>{throw new Error('stale provider data')}},{record:async()=>{}});
  const result=await service.open('synthetic-actor',{description:'Isolated test only',mmsi:'123456789',latitude:18,longitude:42});
  assert.equal(result.distress.aisLookupStatus,'UNAVAILABLE');assert.equal(result.distress.effectivePosition.source,'CALLER');assert.equal(result.distress.externalDistressSent,false);assert.equal(result.distress.humanEmergencyEscalationRequired,true);
});
test('public data retains attribution and validity without native approval identities',()=>{
  const {provenance}=require('../dist/integrations/provider-read-policy');
  const internal={windSpeedKph:0,provenance:provenance(source())},published=publicWeatherSnapshot(internal);
  assert.equal(published.provenance.attribution,'Isolated test source');assert.equal(published.provenance.automaticSafetyPermission,false);
  for(const key of ['documentId','documentVersion','sourceHash','policyHash'])assert.equal(Object.hasOwn(published.provenance,key),false);
  assert.ok(internal.provenance.documentId);
});

// Guard-only checks: no DatabaseService is constructed and no fixture writes run.
const fixtureEnv={DATABASE_URL:'postgresql://synthetic:synthetic@127.0.0.1:5432/hydroland_form_library_ci',NODE_ENV:'test',CI:'true',GITHUB_ACTIONS:'true',D03_DB_TEST_CONFIRM:'DISPOSABLE_LOOPBACK_ONLY',FORM_LIBRARY_E2E_CONFIRM:'ISOLATED_LOOPBACK_DATABASE'};
function withFixtureEnv(changes,run){
  const values={...fixtureEnv,...changes},previous=Object.fromEntries(Object.keys(values).map(key=>[key,process.env[key]]));
  try{for(const [key,value]of Object.entries(values))if(value===undefined)delete process.env[key];else process.env[key]=value;return run();}
  finally{for(const [key,value]of Object.entries(previous))if(value===undefined)delete process.env[key];else process.env[key]=value;}
}
test('form-library diagnostic fixture admits only its exact isolated CI environment',async()=>{
  const {isolatedProviderFixture}=await import('./provider-read-test-support.mjs');
  assert.doesNotThrow(()=>withFixtureEnv({},isolatedProviderFixture));
  for(const key of ['NODE_ENV','CI','GITHUB_ACTIONS','D03_DB_TEST_CONFIRM','FORM_LIBRARY_E2E_CONFIRM']){
    assert.throws(()=>withFixtureEnv({[key]:undefined},isolatedProviderFixture),/D03 fixtures require/,key+' is required');
    assert.throws(()=>withFixtureEnv({[key]:'false'},isolatedProviderFixture),/D03 fixtures require/,key+' must exactly match');
  }
});
test('form-library fixture rejects remote, production, wrong-port and lookalike databases without connecting',async()=>{
  const {isolatedProviderFixture}=await import('./provider-read-test-support.mjs');
  for(const DATABASE_URL of [
    'postgresql://synthetic:synthetic@production.example.invalid:5432/hydroland_form_library_ci',
    'postgresql://synthetic:synthetic@127.0.0.1:5432/hydroland_production',
    'postgresql://synthetic:synthetic@127.0.0.1:5432/hydroland_form_library_ci_other',
    'postgresql://synthetic:synthetic@127.0.0.1:5433/hydroland_form_library_ci',
    'postgresql://synthetic:synthetic@127.0.0.1/hydroland_form_library_ci',
  ])assert.throws(()=>withFixtureEnv({DATABASE_URL},isolatedProviderFixture),/D03 fixtures require/);
  assert.throws(()=>withFixtureEnv({NODE_ENV:'production'},isolatedProviderFixture),/D03 fixtures require/);
});
test('existing named D03 and canonical GitHub fixtures retain their original restrictions',async()=>{
  const {isolatedProviderFixture}=await import('./provider-read-test-support.mjs');
  for(const name of ['white_d03_guard','hydroland_d03_weather_ci'])assert.doesNotThrow(()=>withFixtureEnv({DATABASE_URL:'postgresql://synthetic:synthetic@127.0.0.1:55452/'+name,GITHUB_ACTIONS:undefined,FORM_LIBRARY_E2E_CONFIRM:undefined},isolatedProviderFixture));
  for(const port of ['5432','5433']){
    const DATABASE_URL='postgresql://synthetic:synthetic@127.0.0.1:'+port+'/hydroland';
    assert.doesNotThrow(()=>withFixtureEnv({DATABASE_URL,FORM_LIBRARY_E2E_CONFIRM:undefined},isolatedProviderFixture));
    assert.throws(()=>withFixtureEnv({DATABASE_URL,GITHUB_ACTIONS:undefined},isolatedProviderFixture),/D03 fixtures require/);
  }
});
