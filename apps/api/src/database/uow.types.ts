import { AuditEvent } from '../audit/audit.types';
import { NotificationOutboxItem } from '../notifications/notification.types';
export interface UnitOfWork {
  updateApprovalStatus(requestId:string,status:string):Promise<void>;
  activateRoleGrant?(requestId:string):Promise<void>;
  appendAudit(event:AuditEvent):Promise<void>;
  enqueueNotification(item:NotificationOutboxItem):Promise<void>;
  transaction<T>(work:(tx:UnitOfWork)=>Promise<T>):Promise<T>;
}
