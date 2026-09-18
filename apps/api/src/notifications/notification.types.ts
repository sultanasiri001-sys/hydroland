export type NotificationStatus='PENDING'|'PROCESSING'|'SENT'|'FAILED';
export interface NotificationOutboxItem { id:string; accountId:string; eventKey:string; payload:Record<string,unknown>; status:NotificationStatus; attempts:number; createdAt:string; }
