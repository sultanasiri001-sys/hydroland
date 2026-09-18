import { Injectable } from '@nestjs/common';
import { PoolClient } from 'pg';
import { DatabaseService } from './database.service';
import { UnitOfWork } from './uow.types';
import { AuditEvent } from '../audit/audit.types';
import { NotificationOutboxItem } from '../notifications/notification.types';

@Injectable()
export class PostgresUnitOfWork implements UnitOfWork {
  constructor(private readonly db: DatabaseService, private readonly client?: PoolClient) {}
  async transaction<T>(work:(tx:UnitOfWork)=>Promise<T>):Promise<T>{
    if(this.client) return work(this);
    return this.db.transaction(client=>work(new PostgresUnitOfWork(this.db,client)));
  }
  private q(text:string,values:unknown[]=[]){ return this.client ? this.client.query(text,values) : this.db.query(text,values); }
  async updateApprovalStatus(requestId:string,status:string):Promise<void>{
    const r=await this.q('UPDATE approval_requests SET status=$2, updated_at=now() WHERE id=$1 RETURNING id',[requestId,status]);
    if(r.rowCount!==1) throw new Error('Approval request not found');
  }
  async activateRoleGrant(requestId:string):Promise<void>{
    const r=await this.q(`UPDATE account_role_grants g SET status='ACTIVE'
      FROM approval_requests a
      WHERE a.id=$1 AND a.role_grant_id=g.id AND g.status='PENDING'
      RETURNING g.id`,[requestId]);
    if(r.rowCount!==1) throw new Error('Pending role grant not found for approval');
  }
  async appendAudit(e:AuditEvent):Promise<void>{
    await this.q(`INSERT INTO audit_events(id,actor_account_id,action,resource_type,resource_id,scope_id,metadata,occurred_at)
      VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8)`,[e.id,e.actorAccountId,e.action,e.resourceType,e.resourceId,e.scopeId??null,JSON.stringify(e.metadata??{}),e.occurredAt]);
  }
  async enqueueNotification(n:NotificationOutboxItem):Promise<void>{
    await this.q(`INSERT INTO notification_outbox(id,account_id,event_key,payload,status,attempts,created_at)
      VALUES($1,$2,$3,$4::jsonb,$5,$6,$7)`,[n.id,n.accountId,n.eventKey,JSON.stringify(n.payload),n.status,n.attempts,n.createdAt]);
  }
}
