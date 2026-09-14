import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { OperationalClearanceService } from './operational-clearance.service';

@Injectable()
export class OperationalClearanceScheduler implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  constructor(private readonly db: DatabaseService, private readonly clearance: OperationalClearanceService) {}

  onModuleInit(){
    void this.scan();
    this.timer=setInterval(()=>void this.scan(),5*60*1000);
    this.timer.unref?.();
  }
  onModuleDestroy(){if(this.timer)clearInterval(this.timer);}

  private async scan(){
    const trips=await this.db.trip.findMany({where:{status:{in:['OPEN','CLOSED']}},select:{id:true}});
    for(const trip of trips){
      try{await this.clearance.revokeIfStale(trip.id);}catch{/* next scan will retry */}
    }
  }
}