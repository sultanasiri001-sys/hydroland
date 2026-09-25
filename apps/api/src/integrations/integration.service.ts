import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { IntegrationDescriptor, IntegrationKey, VerifiedWebhook } from './integration.types';
const catalog:readonly IntegrationDescriptor[]=[
 {key:'WEATHER_MARINE',name:'Weather & marine data',category:'marine',status:'NOT_SELECTED',requiresHumanApproval:false,supportsWebhook:false},
 {key:'EMAIL',name:'Email delivery',category:'messaging',status:'NOT_SELECTED',requiresHumanApproval:false,supportsWebhook:true},
 {key:'SMS',name:'SMS delivery',category:'messaging',status:'NOT_SELECTED',requiresHumanApproval:false,supportsWebhook:true},
 {key:'WHATSAPP',name:'WhatsApp Business',category:'messaging',status:'NOT_SELECTED',requiresHumanApproval:true,supportsWebhook:true},
 {key:'PAYMENT_PSP',name:'Payment service provider',category:'payments',status:'NOT_SELECTED',requiresHumanApproval:true,supportsWebhook:true},
 {key:'BANKING_SETTLEMENT',name:'Banking and settlement',category:'payments',status:'NOT_SELECTED',requiresHumanApproval:true,supportsWebhook:true},
 {key:'OBJECT_STORAGE',name:'Offline payload object storage',category:'storage',status:'NOT_SELECTED',requiresHumanApproval:true,supportsWebhook:false},
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
 list(){return catalog.map(item=>({...item,status:this.configuredStatus(item.key)??item.status}))}
 status(key:IntegrationKey){const integration=this.list().find(item=>item.key===key);if(!integration)throw new ServiceUnavailableException('Unknown integration.');return integration}
 requireOperational(key:IntegrationKey,options:{allowSandbox?:boolean}={}){
  const integration=this.status(key);
  const allowed=integration.status==='PRODUCTION_ENABLED'||(options.allowSandbox===true&&integration.status==='SANDBOX');
  if(!allowed)throw new ServiceUnavailableException(`${key} integration is not operational (status: ${integration.status}).`);
  return integration;
 } async verifyWebhook(provider:IntegrationKey,headers:Record<string,string|string[]|undefined>,rawBody:Buffer|undefined,payload:Record<string,unknown>):Promise<VerifiedWebhook>{const descriptor=this.status(provider);if(!descriptor.supportsWebhook)throw new ServiceUnavailableException('This integration does not accept webhooks.');const secret=process.env[`HYDROLAND_WEBHOOK_${provider}_SECRET`];if(!secret)throw new ServiceUnavailableException('Webhook provider is not configured.');const timestamp=String(headers['x-hydroland-timestamp']??'');const signature=String(headers['x-hydroland-signature']??'');if(!/^[0-9]{10,13}$/.test(timestamp)||!signature.startsWith('sha256='))throw new UnauthorizedException('Webhook signature is required.');const age=Math.abs(Date.now()-Number(timestamp)*(timestamp.length===10?1000:1));if(age>5*60*1000)throw new UnauthorizedException('Webhook timestamp is outside the allowed window.');const body=rawBody?.toString('utf8')??JSON.stringify(payload);const expected=`sha256=${createHmac('sha256',secret).update(`${timestamp}.${body}`).digest('hex')}`;const received=Buffer.from(signature);const candidate=Buffer.from(expected);if(received.length!==candidate.length||!timingSafeEqual(received,candidate))throw new UnauthorizedException('Webhook signature is invalid.');const eventId=String(headers['x-hydroland-event-id']??'').trim();const eventType=String(headers['x-hydroland-event-type']??'').trim();if(!eventId||!eventType)throw new UnauthorizedException('Webhook event metadata is required.');const event={provider,eventId,eventType,receivedAt:new Date().toISOString(),payload};await this.audit.record({action:'integration.webhook.verified',resource:'integration',resourceId:provider,metadata:{eventId,eventType}});return event} }
