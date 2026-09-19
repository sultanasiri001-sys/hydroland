import {ForbiddenException} from '@nestjs/common';
import {TripIntelligenceService} from './trip-intelligence.service';

describe('TripIntelligenceService publication boundaries',()=>{
  it('does not allow an author to publish their own briefing',async()=>{
    const db:any={tripBriefing:{findUnique:async()=>({id:'b1',tripId:'t1',version:1,status:'REVIEW',createdByAccountId:'author'})}};
    const service=new TripIntelligenceService(db,{record:async()=>({})} as any);
    await expect(service.publish('author','b1')).rejects.toBeInstanceOf(ForbiddenException);
    it('produces deterministic SHA-256 values for identical content',()=>{
    const service=new TripIntelligenceService({} as any,{record:async()=>({})} as any);
    const hash=(service as any).sha256({b:2,a:1});
    const same=(service as any).sha256({a:1,b:2});
    expect(hash).toHaveLength(64);
    expect(hash).toBe(same);
  });
});
  it('fails closed when no published briefing exists',async()=>{
    const db:any={tripBriefing:{findFirst:async()=>null}};
    const service=new TripIntelligenceService(db,{record:async()=>({})} as any);
    await expect(service.packageStatus('t1')).resolves.toEqual({tripId:'t1',status:'NOT_READY',reason:'PUBLISHED_BRIEFING_REQUIRED'});
  });
});
