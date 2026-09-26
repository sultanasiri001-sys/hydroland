import { Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class TripPricingGovernanceService {
  constructor(private readonly db:DatabaseService,private readonly audit:AuditService){}

  async clearImplicitDefault(accountId:string,tripId:string){
    const key=`trip-price:${tripId}`;
    await this.db.operationalSetting.deleteMany({where:{key}});
    await this.audit.record({
      action:'TRIP_PRICE_UNCONFIGURED',
      resource:'Trip',
      resourceId:tripId,
      metadata:{accountId,reason:'PRICE_OMITTED_ON_CREATE',financialActionExecuted:false},
    });
    return{pricePerSeatMinor:0,currency:'SAR' as const,configured:false};
  }
}
