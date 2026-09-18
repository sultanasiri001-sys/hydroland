import { Injectable } from '@nestjs/common';
import { NotificationOutboxService, PendingNotification } from './notification-outbox.service';

export interface NotificationChannel {
  send(item:PendingNotification):Promise<void>;
}

@Injectable()
export class NotificationDispatcher {
  constructor(private readonly outbox:NotificationOutboxService){}
  async dispatch(channel:NotificationChannel,limit=25):Promise<{sent:number;failed:number}>{
    const items=await this.outbox.claim(limit);
    let sent=0,failed=0;
    for(const item of items){
      try { await channel.send(item); await this.outbox.markSent(item.id); sent++; }
      catch { await this.outbox.markFailed(item.id); failed++; }
    }
    return {sent,failed};
  }
}
