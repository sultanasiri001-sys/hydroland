import { deliveredSms, smsBinding } from './unifonic-dlr';
import { BadRequestException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { IntegrationDescriptor, IntegrationKey, MapsPublicConfigPayload, VerifiedWebhook, WeatherPublicConfigPayload } from './integration.types';
import { MarineReadKey, ProviderReadUnavailable, ProviderSource, publicHttpsUrl } from './provider-read-policy';
import { Prisma } from '@prisma/client';
import { stormglassEndpoint } from './provider-read-http';
const catalog:readonly IntegrationDescriptor[]=[
 {key:'AI_MODEL',name:'Bounded AI task execution',category:'ai',status:'NOT_SELECTED',requiresHumanApproval:true,supportsWebhook:false},
 {key:'WEATHER_MARINE',name:'Weather & marine data',category:'marine',status:'NOT_SELECTED',requiresHumanApproval:false,supportsWebhook:false},
 {key:'EMAIL',name:'Email delivery',category:'messaging',status:'NOT_SELECTED',requiresHumanApproval:false,supportsWebhook:true},
 {key:'SMS',name:'SMS delivery',category:'messaging',status:'NOT_SELECTED',requiresHumanApproval:false,supportsWebhook:true},
 {key:'WHATSAPP',name:'WhatsApp Business',category:'messaging',status:'NOT_SELECTED',requiresHumanApproval:true,supportsWebhook:true},
 {key:'PAYMENT_PSP',name:'Payment service provider',category:'payments',status:'NOT_SELECTED',requiresHumanApproval:true,supportsWebhook:true},
 {key:'BANKING_SETTLEMENT',name:'Banking and settlement',category:'payments',status:'NOT_SELECTED',requiresHumanApproval:true,supportsWebhook:true},
 {key:'OBJECT_STORAGE',name:'Credential documents and offline payload storage',category:'storage',status:'NOT_SELECTED',requiresHumanApproval:true,supportsWebhook:false},
 {key:'TRANSLATION_ENGINE',name:'Machine translation engine',category:'translation',status:'NOT_SELECTED',requiresHumanApproval:true,supportsWebhook:false},
 {key:'MAPS_GEO',name:'Maps and geospatial provider',category:'maps',status:'NOT_SELECTED',requiresHumanApproval:false,supportsWebhook:false},
 {key:'ESIGN',name:'Electronic signature provider',category:'documents',status:'NOT_SELECTED',requiresHumanApproval:true,supportsWebhook:true},
 {key:'CERTIFICATION',name:'Diving certification integrations',category:'certification',status:'NOT_SELECTED',requiresHumanApproval:true,supportsWebhook:true},
 {key:'DISTRESS_AIS',name:'Distress and AIS integrations',category:'marine',status:'NOT_SELECTED',requiresHumanApproval:true,supportsWebhook:true},
 {key:'NAFATH',name:'National identity verification',category:'identity',status:'NOT_SELECTED',requiresHumanApproval:true,supportsWebhook:true},
 {key:'REGULATORY',name:'Government and regulatory APIs',category:'regulatory',status:'NOT_SELECTED',requiresHumanApproval:true,supportsWebhook:true}
];
const statuses=new Set(['NOT_SELECTED','SANDBOX','CONFIGURED','VERIFIED','PRODUCTION_ENABLED','DEGRADED','DISABLED']);
@Injectable() export class IntegrationService {
 constructor(private readonly audit:AuditService){}
 private configuredStatus(key:IntegrationKey){
  const status=process.env[`HYDROLAND_INTEGRATION_${key}_STATUS`]?.trim().toUpperCase();
  return status&&statuses.has(status)?status as IntegrationDescriptor['status']:undefined;
 }
 async recordProviderSignal(provider:'OBJECT_STORAGE'|'WEATHER_MARINE'|'EMAIL'|'PAYMENT_PSP'|'AI_MODEL',category:'SUCCESS'|'PROVIDER_FAILURE'){
  try{await this.audit.recordProviderState(provider,category);}catch{/* Monitoring must never change a user-facing provider operation. */}
 }
 async recordSmsSubmission(id:string,correlation:string,recipient:string){
  const binding=smsBinding(id,correlation,recipient);
  if(binding) await this.audit.recordSmsSubmission(binding);
 }
 async providerObservations(){return this.audit.providerHealth()}
 list(){return catalog.map(item=>({...item,status:this.configuredStatus(item.key)??item.status}))}
 status(key:IntegrationKey){const integration=this.list().find(item=>item.key===key);if(!integration)throw new ServiceUnavailableException('Unknown integration.');return integration}
 async providerSource(key:MarineReadKey,tx?:Prisma.TransactionClient){return this.audit.providerReadSource(key,tx)}
 inspectProviderCandidate(actorId:string,key:string,documentId:string){if(!['MAPS_GEO','WEATHER_MARINE','DISTRESS_AIS'].includes(key)||!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(documentId))throw new BadRequestException('Invalid provider source reference.');return this.audit.inspectProviderCandidate(actorId,key as MarineReadKey,documentId);}
 async withProviderRead<T>(key:MarineReadKey,operation:(source:ProviderSource)=>Promise<T>){return this.audit.withProviderRead(key,operation)}
 async sourceReadiness(key:MarineReadKey){
  try{const source=await this.providerSource(key);return {ready:true as const,reason:null,source};}
  catch(error){return{ready:false as const,reason:error instanceof ProviderReadUnavailable?error.reason:'SOURCE_EVIDENCE_UNAVAILABLE',source:null};}
 }
 async marineReadiness(){
  return Promise.all((['MAPS_GEO','WEATHER_MARINE','DISTRESS_AIS'] as const).map(async key=>{const result=await this.sourceReadiness(key),s=result.source;return{integration:key,configuredSource:result.ready,reason:result.reason,providerVerified:false,automaticSafetyPermission:false,source:s?{documentId:s.documentId,documentVersion:s.version,referenceNumber:s.referenceNumber,sourceHash:s.sourceHash,attribution:s.policy.attribution,termsUrl:s.policy.termsUrl,validFrom:s.policy.validFrom,validUntil:s.policy.validUntil,maxDataAgeSeconds:s.policy.maxDataAgeSeconds,limits:{scope:key==='MAPS_GEO'?'PUBLIC_NO_CHARGE_VIEW':'SERVER_READ',maxResourcesPerView:key==='MAPS_GEO'?s.policy.maxResourcesPerView:null,requestsPerMinute:key==='MAPS_GEO'?null:s.policy.maxRequestsPerMinute,requestsPerDay:key==='MAPS_GEO'?null:s.policy.maxRequestsPerDay,currency:s.policy.currency,costMicrosPerRequest:s.policy.maxCostMicrosPerRequest,costMicrosPerDay:s.policy.maxCostMicrosPerDay,actualBilledCost:null}}:null};}));
 }
 async publicMapConfig():Promise<MapsPublicConfigPayload>{
  const integration=this.status('MAPS_GEO');
  const operational=integration.status==='PRODUCTION_ENABLED'||integration.status==='SANDBOX';
  const styleUrl=process.env.HYDROLAND_MAP_STYLE_URL?.trim()||null;
  const provider=process.env.HYDROLAND_MAP_PROVIDER?.trim()||'UNCONFIGURED';
  const source=await this.sourceReadiness('MAPS_GEO'),url=publicHttpsUrl(styleUrl),policy=source.source?.policy;
  const enabled=Boolean(operational&&source.ready&&url&&policy?.allowedOrigins.includes(url.origin));
  return{engine:'MAPLIBRE',engineVersion:'6.11.2',status:integration.status,provider,enabled,styleUrl:enabled?styleUrl:null,attribution:policy?.attribution??null,reason:source.reason??(enabled?null:'MAP_SOURCE_URL_INVALID'),validUntil:policy?.validUntil??null,allowedOrigins:enabled?policy!.allowedOrigins:[],maxResourcesPerView:enabled?policy!.maxResourcesPerView:0,providerVerified:false,automaticSafetyPermission:false,purpose:'INFORMATION_ONLY'};
 }
 async publicWeatherConfig():Promise<WeatherPublicConfigPayload>{
  const integration=this.status('WEATHER_MARINE');
  const operational=integration.status==='PRODUCTION_ENABLED'||integration.status==='SANDBOX';
  const credentialsConfigured=Boolean(process.env.STORMGLASS_API_KEY?.trim());
  const source=await this.sourceReadiness('WEATHER_MARINE');
  let endpointValid=true;try{stormglassEndpoint()}catch{endpointValid=false}
  return{status:integration.status,provider:'STORMGLASS',configured:operational&&credentialsConfigured&&source.ready&&endpointValid,sandbox:integration.status==='SANDBOX',reason:source.reason??(!credentialsConfigured?'PROVIDER_CREDENTIALS_REQUIRED':!endpointValid?'PROVIDER_ENDPOINT_INVALID':null),attribution:source.source?.policy.attribution??null,validUntil:source.source?.policy.validUntil??null,providerVerified:false,automaticSafetyPermission:false,purpose:'INFORMATION_ONLY'};
 }
 requireOperational(key:IntegrationKey,options:{allowSandbox?:boolean}={}){
  const integration=this.status(key);
  const allowed=integration.status==='PRODUCTION_ENABLED'||(options.allowSandbox===true&&integration.status==='SANDBOX');
  if(!allowed)throw new ServiceUnavailableException(`${key} integration is not operational (status: ${integration.status}).`);
  return integration;
 }
 async verifyWebhook(provider:IntegrationKey,headers:Record<string,string|string[]|undefined>,rawBody:Buffer|undefined,payload:Record<string,unknown>):Promise<VerifiedWebhook>{const descriptor=this.status(provider);if(!descriptor.supportsWebhook)throw new ServiceUnavailableException('This integration does not accept webhooks.');const secret=process.env[`HYDROLAND_WEBHOOK_${provider}_SECRET`];if(!secret)throw new ServiceUnavailableException('Webhook provider is not configured.');const timestamp=String(headers['x-hydroland-timestamp']??'');const signature=String(headers['x-hydroland-signature']??'');if(!/^[0-9]{10,13}$/.test(timestamp)||!signature.startsWith('sha256='))throw new UnauthorizedException('Webhook signature is required.');const age=Math.abs(Date.now()-Number(timestamp)*(timestamp.length===10?1000:1));if(age>5*60*1000)throw new UnauthorizedException('Webhook timestamp is outside the allowed window.');const body=rawBody?.toString('utf8')??JSON.stringify(payload);const expected=`sha256=${createHmac('sha256',secret).update(`${timestamp}.${body}`).digest('hex')}`;const received=Buffer.from(signature);const candidate=Buffer.from(expected);if(received.length!==candidate.length||!timingSafeEqual(received,candidate))throw new UnauthorizedException('Webhook signature is invalid.');const eventId=String(headers['x-hydroland-event-id']??'').trim();const eventType=String(headers['x-hydroland-event-type']??'').trim();if(!eventId||!eventType)throw new UnauthorizedException('Webhook event metadata is required.');const accepted=await this.audit.recordWebhookOnce({provider,eventId,eventType},provider==='SMS'?deliveredSms(payload):undefined);if(!accepted)throw new UnauthorizedException('Webhook event replay detected.');const event={provider,eventId,eventType,receivedAt:new Date().toISOString(),payload};return event} }
