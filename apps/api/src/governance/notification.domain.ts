export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'SMS' | 'WHATSAPP';
export type NotificationStatus = 'QUEUED' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

export interface NotificationRecord {
  id: string;
  recipientId: string;
  templateKey: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  payload: Record<string, unknown>;
  queuedAt: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  failureReason?: string;
}
