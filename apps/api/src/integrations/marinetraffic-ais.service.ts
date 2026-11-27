import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { IntegrationService } from './integration.service';
import { finiteNumericInput } from '../geo/coordinate-input';
import { boundedProviderJson } from './provider-read-http';
import { provenance, providerReadFailure, ProviderProvenance, ProviderSource, utcTime } from './provider-read-policy';

export type MarineTrafficAisPosition={
  mmsi:string;
  imo:string|null;
  shipId:string|null;
  name:string|null;
  latitude:number;
  longitude:number;
  speedKnots:number|null;
  speedKnotsLowerBound:boolean;
  courseDeg:number|null;
  headingDeg:number|null;
  navigationalStatus:string|null;
  timestamp:string;
  receivedAt:string;
  expiresAt:string;
  dataSource:string|null;
  provenance:ProviderProvenance;
  source:'MARINETRAFFIC';
};

@Injectable()
export class MarineTrafficAisService {
  constructor(private readonly integrations:IntegrationService){}

  async singleVesselByMmsi(mmsi:string):Promise<MarineTrafficAisPosition>{
    const normalized=this.mmsi(mmsi);
    this.assertAisProvider();
    return this.integrations.withProviderRead('DISTRESS_AIS',async source=>this.position(await this.request({mmsi:normalized},source),normalized,undefined,source));
  }

  async singleVesselByImo(imo:string):Promise<MarineTrafficAisPosition>{
    const normalized=this.imo(imo);
    this.assertAisProvider();
    return this.integrations.withProviderRead('DISTRESS_AIS',async source=>this.position(await this.request({imo:normalized},source),undefined,normalized,source));
  }

  private assertAisProvider(){
    this.integrations.requireOperational('DISTRESS_AIS',{allowSandbox:true});
    if((process.env.HYDROLAND_DISTRESS_AIS_PROVIDER?.trim().toUpperCase()||'')!=='MARINETRAFFIC_AIS_ONLY')throw new ServiceUnavailableException('AIS provider is not configured.');
    if(!process.env.MARINETRAFFIC_API_KEY?.trim())throw new ServiceUnavailableException('AIS provider credentials are not configured.');
  }

  private async request(identifier:{mmsi?:string;imo?:string},source:ProviderSource):Promise<unknown>{
    const apiKey=process.env.MARINETRAFFIC_API_KEY?.trim();
    if(!apiKey)throw new ServiceUnavailableException('AIS provider credentials are not configured.');
    if(!/^[0-9a-f]{40}$/i.test(apiKey))throw new ServiceUnavailableException('AIS provider credential format is invalid.');
    const url=new URL(`https://services.marinetraffic.com/api/exportvessel/${encodeURIComponent(apiKey)}`);
    url.searchParams.set('v','6');
    url.searchParams.set('protocol','jsono');
    url.searchParams.set('timespan',String(Math.max(1,Math.min(1440,Math.ceil(source.policy.maxDataAgeSeconds/60)))));
    if(identifier.mmsi)url.searchParams.set('mmsi',identifier.mmsi);
    if(identifier.imo)url.searchParams.set('imo',identifier.imo);
    let response:Response;
    try{response=await fetch(url,{method:'GET',headers:{Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(8_000)});}catch{return providerReadFailure('PROVIDER_FAILED');}
    return boundedProviderJson(response);
  }

  private position(payload:unknown,expectedMmsi?:string,expectedImo?:string,source?:ProviderSource):MarineTrafficAisPosition{
    const rows=Array.isArray(payload)?payload:(payload&&typeof payload==='object'&&Array.isArray((payload as Record<string,unknown>).DATA)?(payload as Record<string,unknown>).DATA as unknown[]:[]);
    const row=rows[0];
    if(rows.length!==1||!row||typeof row!=='object'||Array.isArray(row))return providerReadFailure('PROVIDER_RESPONSE_INVALID');
    const data=row as Record<string,unknown>;
    const string=(key:string)=>typeof data[key]==='string'?(data[key] as string).trim():data[key]===null||data[key]===undefined?'':String(data[key]).trim();
    const number=(key:string)=>finiteNumericInput(data[key]);
    const mmsi=string('MMSI');
    const latitude=number('LAT'),longitude=number('LON');
    if(!/^\d{9}$/.test(mmsi)||latitude===null||latitude < -90||latitude > 90||longitude===null||longitude < -180||longitude > 180)throw new ServiceUnavailableException('AIS provider returned an invalid vessel position.');
    if(expectedMmsi&&mmsi!==expectedMmsi||expectedImo&&string('IMO')!==expectedImo)return providerReadFailure('PROVIDER_IDENTITY_MISMATCH');
    if(!source)return providerReadFailure('SOURCE_APPROVAL_REQUIRED');
    if(!source.policy.allowedAisDataSources.includes(string('DSRC')))return providerReadFailure('PROVIDER_SOURCE_MISMATCH');
    const now=Date.now(),observed=utcTime(string('TIMESTAMP'));
    if(!Number.isFinite(observed)||observed>now)return providerReadFailure('PROVIDER_TIMESTAMP_INVALID');
    if(now-observed>=source.policy.maxDataAgeSeconds*1000||now>=Date.parse(source.policy.validUntil))return providerReadFailure('PROVIDER_DATA_STALE');
    const speedRaw=number('SPEED'),courseRaw=number('COURSE'),headingRaw=number('HEADING');
    return{
      mmsi,
      imo:string('IMO')||null,
      shipId:string('SHIP_ID').slice(0,128)||null,
      name:string('SHIPNAME').slice(0,200)||null,
      latitude,
      longitude,
      speedKnots:speedRaw===null||speedRaw<0||speedRaw>=1023?null:speedRaw/10,
      speedKnotsLowerBound:speedRaw===1022,
      courseDeg:courseRaw!==null&&courseRaw>=0&&courseRaw<360?courseRaw:null,
      headingDeg:headingRaw===null||headingRaw===511||headingRaw<0||headingRaw>=360||string('STATUS')==='97'?null:headingRaw,
      navigationalStatus:string('STATUS').slice(0,16)||null,
      timestamp:new Date(observed).toISOString(),
      receivedAt:new Date(now).toISOString(),
      expiresAt:new Date(Math.min(observed+source.policy.maxDataAgeSeconds*1000,Date.parse(source.policy.validUntil))).toISOString(),
      dataSource:['TER','SAT','ROAM'].includes(string('DSRC'))?string('DSRC'):null,
      provenance:provenance(source),
      source:'MARINETRAFFIC',
    };
  }

  private mmsi(value:string){const normalized=value?.trim();if(!/^\d{9}$/.test(normalized))throw new BadRequestException('Invalid MMSI.');return normalized;}
  private imo(value:string){const normalized=value?.trim();if(!/^\d{7}$/.test(normalized))throw new BadRequestException('Invalid IMO number.');return normalized;}
}
