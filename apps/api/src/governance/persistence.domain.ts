export type EntityId = string;

export interface PersistedEntity {
  id: EntityId;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface Repository<T extends PersistedEntity> {
  findById(id: EntityId): Promise<T | null>;
  save(entity: T): Promise<T>;
}

export interface TransactionContext {
  correlationId: string;
  actorId: string;
  occurredAt: string;
}

export interface OutboxEvent extends PersistedEntity {
  topic: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  publishedAt?: string;
}

export interface IdempotencyRecord extends PersistedEntity {
  key: string;
  operation: string;
  requestHash: string;
  responseReference?: string;
  expiresAt: string;
}
