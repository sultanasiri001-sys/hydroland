import { Injectable } from '@nestjs/common';
import { TripLifecycleService } from './trip-lifecycle.service';

@Injectable()
export class TripCompletionService {
  constructor(private readonly lifecycle:TripLifecycleService) {}
  complete(accountId:string,tripId:string,input:Record<string,unknown>){
    return this.lifecycle.apply(accountId,tripId,{...input,action:'COMPLETE'},'admin');
  }
}
