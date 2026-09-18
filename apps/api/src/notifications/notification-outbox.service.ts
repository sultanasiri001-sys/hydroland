import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
export interface PendingNotification {id:string;accountId:string;eventKey:string;payload:Record<string,unknown>;attempts:number;}
@Injectable()
export class NotificationOutboxService{
 constructor(private readonly db:DatabaseService){}
 async claim(limit=25):Promise<PendingNotification[]>{
  return this.db.transaction(async client=>{
   const r=await client.query(`WITH picked AS (
    SELECT id FROM notification_outbox WHERE status='PENDING' ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT $1
   ) UPDATE notification_outbox n SET status='PROCESSING',claimed_at=now()
   FROM picked WHERE n.id=picked.id
   RETURNING n.id,n.account_id,n.event_key,n.payload,n.attempts`,[limit]);
   return r.rows.map((x:any)=>({id:x.id,accountId:x.account_id,eventKey:x.event_key,payload:x.payload,attempts:x.attempts}));
  });
 }
 async markSent(id:string):Promise<void>{await this.db.query(`UPDATE notification_outbox SET status='SENT',attempts=attempts+1,sent_at=now(),claimed_at=NULL WHERE id=$1 AND status='PROCESSING'`,[id]);}
 async markFailed(id:string,maxAttempts=5):Promise<void>{await this.db.query(`UPDATE notification_outbox SET attempts=attempts+1,status=CASE WHEN attempts+1 >= $2 THEN 'FAILED' ELSE 'PENDING' END,claimed_at=NULL WHERE id=$1 AND status='PROCESSING'`,[id,maxAttempts]);}
 async releaseStale(minutes=10):Promise<number>{const r=await this.db.query(`UPDATE notification_outbox SET status='PENDING',claimed_at=NULL WHERE status='PROCESSING' AND claimed_at < now()-($1 * interval '1 minute')`,[minutes]);return r.rowCount??0;}
}
