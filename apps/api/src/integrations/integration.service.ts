import { deliveredSms, smsBinding } from './unifonic-dlr';
import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { IntegrationDescriptor, IntegrationKey, MapsPublicConfigPayload, VerifiedWebhook, WeatherPublicConfigPayload } from './integration.types';
import { MarineObservation, marineReadinessEvidence } from './marine-provider-evidence';
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
 private readonly marineObservations = new Map<string, MarineObservation>();
 observeMarineProvider(key:'WEATHER_MARINE'|'DISTRESS_AIS',status:'RESPONSE_RECEIVED'|'FAILED',reasonCode:string|null=null){
  this.marineObservations.set(key,{status,checkedAt:new Date().toISOString(),scope:'CURRENT_PROCESS',reasonCode});
 }
 marineReadiness(key:'MAPS_GEO'|'WEATHER_MARINE'|'DISTRESS_AIS',configured:boolean){
  return marineReadinessEvidence(configured,this.status(key).status,this.marineObservations.get(key));
 }
 private configuredStatus(key:IntegrationKey){
  const status=process.env[`HYDROLAND_INTEGRATION_${key}_STATUS`]?.trim().toUpperCase();
  return status&&statuses.has(status)?status as IntegrationDescriptor['status']:undefined;
 }
 async recordProviderSignal(provider:'OBJECT_STORAGE'|'WEATHER_MARINE'|'EMAIL'|'PAYMENT_PSP'|'AI_MODEL',category:'SUCCESS'|'PROVIDER_FAILURE'){
  if(provider==='WEATHER_MARINE')this.observeMarineProvider(provider,category==='SUCCESS'?'RESPONSE_RECEIVED':'FAILED',category==='SUCCESS'?null:'WEATHER_PROVIDER_EVIDENCE_UNAVAILABLE');
  try{await this.audit.recordProviderState(provider,category);}catch{/* Monitoring must never change a user-facing provider operation. */}
 }
 async recordSmsSubmission(id:string,correlation:string,recipient:string){
  const binding=smsBinding(id,correlation,recipient);
  if(binding) await this.audit.recordSmsSubmission(binding);
 }
 async providerObservations(){return this.audit.providerHealth()}
 list(){return catalog.map(item=>({...item,status:this.configuredStatus(item.key)??item.status}))}
 status(key:IntegrationKey){const integration=this.list().find(item=>item.key===key);if(!integration)throw new ServiceUnavailableException('Unknown integration.');return integration}
 publicMapConfig():MapsPublicConfigPayload{
  const integration=this.status('MAPS_GEO');
  const operational=integration.status==='PRODUCTION_ENABLED'||integration.status==='SANDBOX';
  const styleUrl=process.env.HYDROLAND_MAP_STYLE_URL?.trim()||null;
  const provider=process.env.HYDROLAND_MAP_PROVIDER?.trim()||'UNCONFIGURED';
  const attribution=process.env.HYDROLAND_MAP_ATTRIBUTION?.trim()||null;
  let safeStyle=false;
  try{const url=new URL(styleUrl||'');safeStyle=url.protocol==='https:'&&!url.username&&!url.password&&!url.hash&&Boolean(url.hostname)&&Boolean(styleUrl&&styleUrl.length<=2000);}catch{/* An invalid public style is unconfigured. */}
  const enabled=operational&&safeStyle;
  return{engine:'MAPLIBRE',engineVersion:'6.11.2',status:integration.status,provider,enabled,styleUrl:enabled?styleUrl:null,attribution,
   ...this.marineReadiness('MAPS_GEO',enabled),dataFreshness:{status:'NOT_ASSESSED',reasonCodes:['MAP_SOURCE_FRESHNESS_NOT_VERIFIED']}};
 }
 publicWeatherConfig():WeatherPublicConfigPayload{
  const integration=this.status('WEATHER_MARINE');
  const operational=integration.status==='PRODUCTION_ENABLED'||integration.status==='SANDBOX';
  const credentialsConfigured=Boolean(process.env.STORMGLASS_API_KEY?.trim());
  const configured=operational&&credentialsConfigured;
  return{status:integration.status,provider:'STORMGLASS',configured,sandbox:integration.status==='SANDBOX',
   ...this.marineReadiness('WEATHER_MARINE',configured),dataFreshness:{status:'TRIP_REVIEW_REQUIRED',reasonCodes:['TRIP_CONTEXT_AND_HUMAN_REVIEW_REQUIRED']}};
 }
 requireOperational(key:IntegrationKey,options:{allowSandbox?:boolean}={}){
  const integration=this.status(key);
  const allowed=integration.status==='PRODUCTION_ENABLED'||(options.allowSandbox===true&&integration.status==='SANDBOX');
  if(!allowed)throw new ServiceUnavailableException(`${key} integration is not operational (status: ${integration.status}).`);
  return integration;
 }
 async verifyWebhook(provider:IntegrationKey,headers:Record<string,string|string[]|undefined>,rawBody:Buffer|undefined,payload:Record<string,unknown>):Promise<VerifiedWebhook>{const descriptor=this.status(provider);if(!descriptor.supportsWebhook)throw new ServiceUnavailableException('This integration does not accept webhooks.');const secret=process.env[`HYDROLAND_WEBHOOK_${provider}_SECRET`];if(!secret)throw new ServiceUnavailableException('Webhook provider is not configured.');const timestamp=String(headers['x-hydroland-timestamp']??'');const signature=String(headers['x-hydroland-signature']??'');if(!/^[0-9]{10,13}$/.test(timestamp)||!signature.startsWith('sha256='))throw new UnauthorizedException('Webhook signature is required.');const age=Math.abs(Date.now()-Number(timestamp)*(timestamp.length===10?1000:1));if(age>5*60*1000)throw new UnauthorizedException('Webhook timestamp is outside the allowed window.');const body=rawBody?.toString('utf8')??JSON.stringify(payload);const expected=`sha256=${createHmac('sha256',secret).update(`${timestamp}.${body}`).digest('hex')}`;const received=Buffer.from(signature);const candidate=Buffer.from(expected);if(received.length!==candidate.length||!timingSafeEqual(received,candidate))throw new UnauthorizedException('Webhook signature is invalid.');const eventId=String(headers['x-hydroland-event-id']??'').trim();const eventType=String(headers['x-hydroland-event-type']??'').trim();if(!eventId||!eventType)throw new UnauthorizedException('Webhook event metadata is required.');const accepted=await this.audit.recordWebhookOnce({provider,eventId,eventType},provider==='SMS'?deliveredSms(payload):undefined);if(!accepted)throw new UnauthorizedException('Webhook event replay detected.');const event={provider,eventId,eventType,receivedAt:new Date().toISOString(),payload};return event} }
