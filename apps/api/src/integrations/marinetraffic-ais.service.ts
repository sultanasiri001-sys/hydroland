import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { IntegrationService } from './integration.service';

export type MarineTrafficAisPosition={
  mmsi:string;
  imo:string|null;
  shipId:string|null;
  name:string|null;
  latitude:number;
  longitude:number;
  speedKnots:number|null;
  courseDeg:number|null;
  headingDeg:number|null;
  navigationalStatus:string|null;
  timestamp:string|null;
  source:'MARINETRAFFIC';
};

@Injectable()
export class MarineTrafficAisService {
  constructor(private readonly integrations:IntegrationService){}

  async singleVesselByMmsi(mmsi:string):Promise<MarineTrafficAisPosition>{
    this.assertAisProvider();
    const normalized=this.mmsi(mmsi);
    return this.position(await this.request({mmsi:normalized}),normalized);
  }

  async singleVesselByImo(imo:string):Promise<MarineTrafficAisPosition>{
    this.assertAisProvider();
    const normalized=this.imo(imo);
    return this.position(await this.request({imo:normalized}),undefined);
  }

  private assertAisProvider(){
    this.integrations.requireOperational('DISTRESS_AIS',{allowSandbox:true});
    if((process.env.HYDROLAND_DISTRESS_AIS_PROVIDER?.trim().toUpperCase()||'')!=='MARINETRAFFIC_AIS_ONLY')throw new ServiceUnavailableException('AIS provider is not configured.');
    if(!process.env.MARINETRAFFIC_API_KEY?.trim())throw new ServiceUnavailableException('AIS provider credentials are not configured.');
  }

  private async request(identifier:{mmsi?:string;imo?:string}):Promise<unknown>{
    const apiKey=process.env.MARINETRAFFIC_API_KEY?.trim();
    if(!apiKey)throw new ServiceUnavailableException('AIS provider credentials are not configured.');
    if(!/^[0-9a-f]{40}$/i.test(apiKey))throw new ServiceUnavailableException('AIS provider credential format is invalid.');
    const url=new URL(`https://services.marinetraffic.com/api/exportvessel/${encodeURIComponent(apiKey)}`);
    url.searchParams.set('v','6');
    url.searchParams.set('protocol','jsono');
    if(identifier.mmsi)url.searchParams.set('mmsi',identifier.mmsi);
    if(identifier.imo)url.searchParams.set('imo',identifier.imo);
    let response:Response;
    try{response=await fetch(url,{method:'GET',headers:{Accept:'application/json'},signal:AbortSignal.timeout(8_000)});}catch{throw new ServiceUnavailableException('AIS provider request failed.');}
    const body=await response.json().catch(()=>null) as unknown;
    if(!response.ok)throw new ServiceUnavailableException(`AIS provider request failed (${response.status}).`);
    return body;
  }

  private position(payload:unknown,expectedMmsi?:string):MarineTrafficAisPosition{
    const rows=Array.isArray(payload)?payload:(payload&&typeof payload==='object'&&Array.isArray((payload as Record<string,unknown>).DATA)?(payload as Record<string,unknown>).DATA as unknown[]:[]);
    const row=rows[0];
    if(!row||typeof row!=='object'||Array.isArray(row))throw new ServiceUnavailableException('AIS provider returned no valid vessel position.');
    const data=row as Record<string,unknown>;
    const string=(key:string)=>typeof data[key]==='string'?(data[key] as string).trim():data[key]===null||data[key]===undefined?'':String(data[key]).trim();
    const number=(key:string)=>{const value=Number(string(key));return Number.isFinite(value)?value:null;};
    const mmsi=string('MMSI');
    const latitude=number('LAT'),longitude=number('LON');
    if(!/^\d{9}$/.test(mmsi)||latitude===null||latitude < -90||latitude > 90||longitude===null||longitude < -180||longitude > 180)throw new ServiceUnavailableException('AIS provider returned an invalid vessel position.');
    if(expectedMmsi&&mmsi!==expectedMmsi)throw new ServiceUnavailableException('AIS provider vessel identity mismatch.');
    const speedRaw=number('SPEED'),courseRaw=number('COURSE'),headingRaw=number('HEADING');
    return{
      mmsi,
      imo:string('IMO')||null,
      shipId:string('SHIP_ID')||null,
      name:string('SHIPNAME')||null,
      latitude,
      longitude,
      speedKnots:speedRaw===null?null:speedRaw/10,
      courseDeg:courseRaw,
      headingDeg:headingRaw===null||headingRaw===511||headingRaw<0?null:headingRaw,
      navigationalStatus:string('STATUS')||null,
      timestamp:string('TIMESTAMP')||null,
      source:'MARINETRAFFIC',
    };
  }

  private mmsi(value:string){const normalized=value?.trim();if(!/^\d{9}$/.test(normalized))throw new BadRequestException('Invalid MMSI.');return normalized;}
  private imo(value:string){const normalized=value?.trim();if(!/^\d{7}$/.test(normalized))throw new BadRequestException('Invalid IMO number.');return normalized;}
}
