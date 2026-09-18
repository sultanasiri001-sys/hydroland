export interface AuditEvent {
  id: string;
  actorAccountId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  scopeId?: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
}
