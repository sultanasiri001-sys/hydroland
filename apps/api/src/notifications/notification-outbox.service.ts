import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface PendingNotification { id:string; accountId:string; eventKey:string; payload:Record<string,unknown>; attempts:number; }

@Injectable()
export class NotificationOutboxService {
 constructor(private readonly db:DatabaseService){}
 async claim(limit=25):Promise<PendingNotification[]>{
  return this.db.transaction(async client=>{
   const r=await client.query(`SELECT id,account_id,event_key,payload,attempts FROM notification_outbox
     WHERE status='PENDING' ORDER BY created_at
     FOR UPDATE SKIP LOCKED LIMIT $1`,[limit]);
   return r.rows.map((x:any)=>({id:x.id,accountId:x.account_id,eventKey:x.event_key,payload:x.payload,attempts:x.attempts}));
  });
 }
 async markSent(id:string):Promise<void>{ await this.db.query(`UPDATE notification_outbox SET status='SENT', attempts=attempts+1 WHERE id=$1 AND status='PENDING'`,[id]); }
 async markFailed(id:string,maxAttempts=5):Promise<void>{ await this.db.query(`UPDATE notification_outbox SET attempts=attempts+1,status=CASE WHEN attempts+1 >= $2 THEN 'FAILED' ELSE 'PENDING' END WHERE id=$1 AND status='PENDING'`,[id,maxAttempts]); }
}
