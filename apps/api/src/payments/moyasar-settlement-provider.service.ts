import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { IntegrationService } from '../integrations/integration.service';

export type MoyasarSettlementRecord=Record<string,unknown>;

@Injectable()
export class MoyasarSettlementProviderService {
  constructor(private readonly integrations:IntegrationService){}

  async listSettlements(page=1):Promise<unknown>{
    this.assertProvider();
    return this.request(`/settlements?page=${this.page(page)}`);
  }

  async fetchSettlement(settlementId:string):Promise<MoyasarSettlementRecord>{
    this.assertProvider();
    const id=this.settlementId(settlementId);
    const payload=await this.request(`/settlements/${encodeURIComponent(id)}`);
    return this.record(payload);
  }

  async listSettlementLines(settlementId:string,page=1):Promise<unknown>{
    this.assertProvider();
    const id=this.settlementId(settlementId);
    return this.request(`/settlements/${encodeURIComponent(id)}/lines?page=${this.page(page)}`);
  }

  private assertProvider(){
    this.integrations.requireOperational('BANKING_SETTLEMENT',{allowSandbox:true});
    if((process.env.HYDROLAND_SETTLEMENT_PROVIDER?.trim().toUpperCase()||'')!=='MOYASAR')throw new ServiceUnavailableException('Settlement provider is not configured.');
    if(!process.env.MOYASAR_SECRET_KEY?.trim())throw new ServiceUnavailableException('Settlement provider credentials are not configured.');
  }

  private async request(path:string):Promise<unknown>{
    const secret=process.env.MOYASAR_SECRET_KEY?.trim();
    if(!secret)throw new ServiceUnavailableException('Settlement provider credentials are not configured.');
    const rawBase=process.env.MOYASAR_API_BASE_URL?.trim()||'https://api.moyasar.com/v1/';
    let url:URL;
    try{url=new URL(path.replace(/^\//,''),rawBase.endsWith('/')?rawBase:`${rawBase}/`);}catch{throw new ServiceUnavailableException('Settlement provider endpoint is invalid.');}
    let response:Response;
    try{
      response=await fetch(url,{
        method:'GET',
        headers:{Authorization:`Basic ${Buffer.from(`${secret}:`).toString('base64')}`,Accept:'application/json'},
        signal:AbortSignal.timeout(8_000),
      });
    }catch{
      throw new ServiceUnavailableException('Settlement provider request failed.');
    }
    const body=await response.json().catch(()=>null) as unknown;
    if(!response.ok)throw new ServiceUnavailableException(`Settlement provider request failed (${response.status}).`);
    if(body===null||typeof body!=='object')throw new ServiceUnavailableException('Settlement provider returned an invalid response.');
    return body;
  }

  private settlementId(value:string){
    const id=value?.trim();
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))throw new BadRequestException('Invalid settlement reference.');
    return id;
  }

  private page(value:number){
    if(!Number.isInteger(value)||value<1||value>10_000)throw new BadRequestException('Invalid settlement page.');
    return value;
  }

  private record(payload:unknown):MoyasarSettlementRecord{
    if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new ServiceUnavailableException('Settlement provider returned an invalid settlement.');
    const row=payload as Record<string,unknown>;
    if(typeof row.id!=='string'||!row.id.trim())throw new ServiceUnavailableException('Settlement provider returned an invalid settlement.');
    return row;
  }
}
