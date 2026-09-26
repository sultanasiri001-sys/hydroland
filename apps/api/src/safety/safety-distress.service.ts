import {BadRequestException,Injectable} from '@nestjs/common';
import {AuditService} from '../audit/audit.service';
import {MarineTrafficAisPosition,MarineTrafficAisService} from '../integrations/marinetraffic-ais.service';
import {SafetyIncidentsService} from './safety-incidents.service';

type DistressInput={
  tripId?:string;
  description:string;
  locationName?:string;
  mmsi?:string;
  imo?:string;
  latitude?:number;
  longitude?:number;
};

type CallerCoordinates={latitude:number;longitude:number};

@Injectable()
export class SafetyDistressService{
  constructor(
    private readonly incidents:SafetyIncidentsService,
    private readonly ais:MarineTrafficAisService,
    private readonly audit:AuditService,
  ){}

  async open(accountId:string,input:DistressInput){
    const description=typeof input.description==='string'?input.description.trim():'';
    if(description.length<3||description.length>5000)throw new BadRequestException('Distress description must be between 3 and 5000 characters.');
    const mmsi=this.optionalMmsi(input.mmsi),imo=this.optionalImo(input.imo);
    const callerCoordinates=this.coordinates(input.latitude,input.longitude);
    const aisResult=await this.aisSnapshot(mmsi,imo);
    const effective=aisResult.position?{latitude:aisResult.position.latitude,longitude:aisResult.position.longitude,source:'AIS' as const}:callerCoordinates?{...callerCoordinates,source:'CALLER' as const}:null;
    const locationName=this.locationName(input.locationName,effective);
    const incident=await this.incidents.create(accountId,{tripId:input.tripId,severity:'CRITICAL',title:'Maritime distress / استغاثة بحرية',description,locationName});
    const distress={
      workflow:'INTERNAL_CRITICAL_INCIDENT',
      externalTransmission:'NOT_IMPLEMENTED' as const,
      externalDistressSent:false,
      humanEmergencyEscalationRequired:true,
      aisLookupAttempted:aisResult.attempted,
      aisLookupStatus:aisResult.status,
      aisSnapshot:aisResult.position,
      callerCoordinates,
      effectivePosition:effective,
    };
    await this.audit.record({action:'SAFETY_DISTRESS_CASE_OPENED',resource:'SafetyIncident',resourceId:incident.id,metadata:{accountId,tripId:incident.tripId,externalDistressSent:false,humanEmergencyEscalationRequired:true,aisLookupAttempted:aisResult.attempted,aisLookupStatus:aisResult.status,aisSnapshot:aisResult.position,callerCoordinates,effectivePosition:effective}});
    return{incident,distress};
  }

  private async aisSnapshot(mmsi:string|null,imo:string|null):Promise<{attempted:boolean;status:'NOT_REQUESTED'|'AVAILABLE'|'UNAVAILABLE';position:MarineTrafficAisPosition|null}>{
    if(!mmsi&&!imo)return{attempted:false,status:'NOT_REQUESTED',position:null};
    try{
      const position=mmsi?await this.ais.singleVesselByMmsi(mmsi):await this.ais.singleVesselByImo(imo!);
      return{attempted:true,status:'AVAILABLE',position};
    }catch{
      return{attempted:true,status:'UNAVAILABLE',position:null};
    }
  }

  private optionalMmsi(value:unknown){
    if(value===undefined||value===null||value==='')return null;
    const normalized=String(value).trim();
    if(!/^\d{9}$/.test(normalized))throw new BadRequestException('Invalid MMSI.');
    return normalized;
  }

  private optionalImo(value:unknown){
    if(value===undefined||value===null||value==='')return null;
    const normalized=String(value).trim();
    if(!/^\d{7}$/.test(normalized))throw new BadRequestException('Invalid IMO number.');
    return normalized;
  }

  private coordinates(latitude:unknown,longitude:unknown):CallerCoordinates|null{
    const hasLat=latitude!==undefined&&latitude!==null,hasLon=longitude!==undefined&&longitude!==null;
    if(hasLat!==hasLon)throw new BadRequestException('Latitude and longitude must be provided together.');
    if(!hasLat)return null;
    const lat=Number(latitude),lon=Number(longitude);
    if(!Number.isFinite(lat)||lat< -90||lat>90||!Number.isFinite(lon)||lon< -180||lon>180)throw new BadRequestException('Invalid distress coordinates.');
    return{latitude:lat,longitude:lon};
  }

  private locationName(value:unknown,effective:{latitude:number;longitude:number;source:'AIS'|'CALLER'}|null){
    const raw=typeof value==='string'?value.trim():'';
    if(raw.length>160)throw new BadRequestException('Distress location name is too long.');
    if(raw)return raw;
    if(!effective)return undefined;
    return`${effective.source} ${effective.latitude.toFixed(5)}, ${effective.longitude.toFixed(5)}`;
  }
}
